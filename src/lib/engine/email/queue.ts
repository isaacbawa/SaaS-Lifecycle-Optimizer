/* ═══════════════════════════════════════════════════════════════════════
 * Email Queue — DB-Backed, Rate-Limited, Prioritized Email Delivery Queue
 *
 * Queue items are persisted in PostgreSQL (emailQueue table) so nothing
 * is lost on cold-start.  The tick-based processing loop and token-
 * bucket rate limiter run in-memory as runtime concerns.
 * ═══════════════════════════════════════════════════════════════════════ */

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, lte, sql, ne, asc, desc } from 'drizzle-orm';

/* ── Types ──────────────────────────────────────────────────────────── */

export type EmailPriority = 'critical' | 'high' | 'normal' | 'low' | 'bulk';

export interface QueuedEmail {
    id: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    campaignId?: string;
    userId?: string;
    priority: EmailPriority;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: number;
    createdAt: string;
    lastError?: string;
    tags?: Record<string, string>;
}

export type SendStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced';

export interface SendRecord {
    id: string;
    messageId?: string;
    to: string;
    subject: string;
    campaignId?: string;
    userId?: string;
    status: SendStatus;
    provider: 'smtp' | 'log';
    sentAt?: string;
    error?: string;
    attempts: number;
}

export interface QueueMetrics {
    queued: number;
    sending: number;
    sent: number;
    failed: number;
    retried: number;
    dlq: number;
    ratePerSecond: number;
    isRunning: boolean;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT = 10;
const TICK_INTERVAL_MS = 200;

/* ── Runtime State (in-memory, not persisted) ──────────────────────── */

const runtimeKey = '__lifecycleos_email_queue_runtime__';

interface RuntimeState {
    rateLimit: number;
    tokenBucket: { tokens: number; lastRefill: number };
    isRunning: boolean;
    tickTimer: ReturnType<typeof setInterval> | null;
    onSend: ((email: QueuedEmail) => Promise<{ success: boolean; messageId?: string; error?: string }>) | null;
    metricsCache: { retried: number };
}

function getRuntime(): RuntimeState {
    const g = globalThis as unknown as Record<string, RuntimeState>;
    if (!g[runtimeKey]) {
        g[runtimeKey] = {
            rateLimit: DEFAULT_RATE_LIMIT,
            tokenBucket: { tokens: DEFAULT_RATE_LIMIT, lastRefill: Date.now() },
            isRunning: false,
            tickTimer: null,
            onSend: null,
            metricsCache: { retried: 0 },
        };
    }
    return g[runtimeKey];
}

async function getOrgId(providedOrgId?: string): Promise<string> {
    if (providedOrgId) return providedOrgId;
    // Fallback for background processing where orgId isn't passed through
    const envOrgId = process.env.DEMO_ORG_ID;
    if (envOrgId) return envOrgId;
    return '';
}

/* ═══════════════════════════════════════════════════════════════════════
 * Queue Management — DB-backed
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Enqueue an email for delivery. Persists to the DB immediately.
 * Returns the DB-generated UUID for tracking.
 */
export async function enqueue(email: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    campaignId?: string;
    userId?: string;
    priority?: EmailPriority;
    maxAttempts?: number;
    tags?: Record<string, string>;
}): Promise<string> {
    const orgId = await getOrgId();
    const priority = email.priority ?? 'normal';
    const maxAttempts = email.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    const [row] = await db.insert(schema.emailQueue).values({
        organizationId: orgId,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text ?? null,
        fromName: email.fromName ?? null,
        fromEmail: email.fromEmail ?? null,
        replyTo: email.replyTo ?? null,
        headers: email.headers ?? null,
        campaignId: email.campaignId ?? null,
        userId: email.userId ?? null,
        priority,
        status: 'queued',
        attempts: 0,
        maxAttempts,
        nextAttemptAt: new Date(),
        tags: email.tags ?? null,
    }).returning({ id: schema.emailQueue.id });

    return row.id;
}

/**
 * Enqueue a batch of emails.
 */
export async function enqueueBatch(
    emails: Array<Parameters<typeof enqueue>[0]>,
): Promise<string[]> {
    const ids: string[] = [];
    for (const email of emails) {
        ids.push(await enqueue(email));
    }
    return ids;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Token Bucket Rate Limiter (in-memory)
 * ═══════════════════════════════════════════════════════════════════════ */

function tryAcquireToken(): boolean {
    const rt = getRuntime();
    const now = Date.now();
    const elapsed = now - rt.tokenBucket.lastRefill;

    if (elapsed >= 1000) {
        const refills = Math.floor(elapsed / 1000);
        rt.tokenBucket.tokens = Math.min(
            rt.rateLimit,
            rt.tokenBucket.tokens + refills * rt.rateLimit,
        );
        rt.tokenBucket.lastRefill = now - (elapsed % 1000);
    }

    if (rt.tokenBucket.tokens > 0) {
        rt.tokenBucket.tokens--;
        return true;
    }
    return false;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Processing Loop — polls DB for pending items
 * ═══════════════════════════════════════════════════════════════════════ */

function dbRowToQueuedEmail(row: typeof schema.emailQueue.$inferSelect): QueuedEmail {
    return {
        id: row.id,
        to: row.to,
        subject: row.subject,
        html: row.html,
        text: row.text ?? undefined,
        fromName: row.fromName ?? undefined,
        fromEmail: row.fromEmail ?? undefined,
        replyTo: row.replyTo ?? undefined,
        headers: row.headers ?? undefined,
        campaignId: row.campaignId ?? undefined,
        userId: row.userId ?? undefined,
        priority: row.priority as EmailPriority,
        attempts: row.attempts,
        maxAttempts: row.maxAttempts,
        nextAttemptAt: row.nextAttemptAt?.getTime() ?? Date.now(),
        createdAt: row.createdAt.toISOString(),
        lastError: row.lastError ?? undefined,
        tags: row.tags ?? undefined,
    };
}

async function tick(): Promise<void> {
    const rt = getRuntime();
    if (!rt.onSend) return;

    const orgId = await getOrgId();
    if (!orgId) return;

    const now = new Date();

    // Fetch eligible queued items ordered by priority
    const rows = await db.select().from(schema.emailQueue)
        .where(
            and(
                eq(schema.emailQueue.organizationId, orgId),
                eq(schema.emailQueue.status, 'queued'),
                lte(schema.emailQueue.nextAttemptAt, now),
            ),
        )
        .orderBy(asc(schema.emailQueue.priority), asc(schema.emailQueue.nextAttemptAt))
        .limit(rt.rateLimit);

    const batch: QueuedEmail[] = [];
    for (const row of rows) {
        if (!tryAcquireToken()) break;
        batch.push(dbRowToQueuedEmail(row));
        // Mark as sending in DB
        await db.update(schema.emailQueue)
            .set({ status: 'sending' })
            .where(eq(schema.emailQueue.id, row.id));
    }

    const results = await Promise.allSettled(
        batch.map(async (email) => {
            const newAttempts = email.attempts + 1;

            try {
                const result = await rt.onSend!(email);
                if (result.success) {
                    await db.update(schema.emailQueue)
                        .set({
                            status: 'sent',
                            attempts: newAttempts,
                            sentAt: new Date(),
                            providerMessageId: result.messageId ?? null,
                            lastError: null,
                        })
                        .where(eq(schema.emailQueue.id, email.id));
                } else {
                    throw new Error(result.error ?? 'Send failed');
                }
            } catch (err) {
                const error = (err as Error).message;
                if (newAttempts < email.maxAttempts) {
                    // Retry with exponential backoff
                    const delay = Math.min(60_000, 1000 * Math.pow(2, newAttempts - 1) + Math.random() * 1000);
                    rt.metricsCache.retried++;
                    await db.update(schema.emailQueue)
                        .set({
                            status: 'queued',
                            attempts: newAttempts,
                            nextAttemptAt: new Date(Date.now() + delay),
                            lastError: `Retry ${newAttempts}/${email.maxAttempts}: ${error}`,
                        })
                        .where(eq(schema.emailQueue.id, email.id));
                } else {
                    // Move to DLQ status
                    await db.update(schema.emailQueue)
                        .set({
                            status: 'dlq',
                            attempts: newAttempts,
                            lastError: `Exhausted ${email.maxAttempts} attempts: ${error}`,
                        })
                        .where(eq(schema.emailQueue.id, email.id));
                }
            }
        }),
    );

    for (const r of results) {
        if (r.status === 'rejected') {
            console.error('[email-queue] Unexpected error in send loop:', r.reason);
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Queue Control
 * ═══════════════════════════════════════════════════════════════════════ */

export function setSendHandler(
    handler: (email: QueuedEmail) => Promise<{ success: boolean; messageId?: string; error?: string }>,
): void {
    getRuntime().onSend = handler;
}

export function startQueue(rateLimit?: number): void {
    const rt = getRuntime();
    if (rt.isRunning) return;

    if (rateLimit) {
        rt.rateLimit = rateLimit;
        rt.tokenBucket.tokens = rateLimit;
    }

    rt.isRunning = true;
    rt.tickTimer = setInterval(() => {
        tick().catch((err) => {
            console.error('[email-queue] Tick error:', err);
        });
    }, TICK_INTERVAL_MS);

    console.log(`[email-queue] Started (rate: ${rt.rateLimit}/s, tick: ${TICK_INTERVAL_MS}ms)`);
}

export function stopQueue(): void {
    const rt = getRuntime();
    if (rt.tickTimer) {
        clearInterval(rt.tickTimer);
        rt.tickTimer = null;
    }
    rt.isRunning = false;
    console.log('[email-queue] Stopped');
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
    const rt = getRuntime();
    const orgId = await getOrgId();

    const [counts] = await db.select({
        queued: sql<number>`count(*) filter (where ${schema.emailQueue.status} = 'queued')::int`,
        sending: sql<number>`count(*) filter (where ${schema.emailQueue.status} = 'sending')::int`,
        sent: sql<number>`count(*) filter (where ${schema.emailQueue.status} = 'sent')::int`,
        failed: sql<number>`count(*) filter (where ${schema.emailQueue.status} = 'failed')::int`,
        dlq: sql<number>`count(*) filter (where ${schema.emailQueue.status} = 'dlq')::int`,
    }).from(schema.emailQueue)
        .where(eq(schema.emailQueue.organizationId, orgId));

    return {
        queued: counts?.queued ?? 0,
        sending: counts?.sending ?? 0,
        sent: counts?.sent ?? 0,
        failed: counts?.failed ?? 0,
        retried: rt.metricsCache.retried,
        dlq: counts?.dlq ?? 0,
        ratePerSecond: rt.rateLimit,
        isRunning: rt.isRunning,
    };
}

export async function getSendLog(limit = 100, offset = 0): Promise<SendRecord[]> {
    const orgId = await getOrgId();

    const rows = await db.select().from(schema.emailQueue)
        .where(
            and(
                eq(schema.emailQueue.organizationId, orgId),
                ne(schema.emailQueue.status, 'queued'),
            ),
        )
        .orderBy(desc(schema.emailQueue.createdAt))
        .limit(limit)
        .offset(offset);

    return rows.map((r): SendRecord => ({
        id: r.id,
        messageId: r.providerMessageId ?? undefined,
        to: r.to,
        subject: r.subject,
        campaignId: r.campaignId ?? undefined,
        userId: r.userId ?? undefined,
        status: r.status === 'dlq' ? 'failed' : r.status as SendStatus,
        provider: 'smtp',
        sentAt: r.sentAt?.toISOString(),
        error: r.lastError ?? undefined,
        attempts: r.attempts,
    }));
}

export async function getDLQ(): Promise<QueuedEmail[]> {
    const orgId = await getOrgId();
    const rows = await db.select().from(schema.emailQueue)
        .where(and(eq(schema.emailQueue.organizationId, orgId), eq(schema.emailQueue.status, 'dlq')))
        .orderBy(desc(schema.emailQueue.createdAt));

    return rows.map(dbRowToQueuedEmail);
}

export async function retryDLQEntry(id: string): Promise<boolean> {
    const [row] = await db.select().from(schema.emailQueue)
        .where(and(eq(schema.emailQueue.id, id), eq(schema.emailQueue.status, 'dlq')));

    if (!row) return false;

    await db.update(schema.emailQueue)
        .set({ status: 'queued', attempts: 0, nextAttemptAt: new Date(), lastError: 'Retried from DLQ' })
        .where(eq(schema.emailQueue.id, id));

    return true;
}

export async function removeDLQEntry(id: string): Promise<boolean> {
    const [row] = await db.select().from(schema.emailQueue)
        .where(and(eq(schema.emailQueue.id, id), eq(schema.emailQueue.status, 'dlq')));

    if (!row) return false;

    await db.delete(schema.emailQueue).where(eq(schema.emailQueue.id, id));
    return true;
}

export async function getSendRecord(id: string): Promise<SendRecord | undefined> {
    const [row] = await db.select().from(schema.emailQueue).where(eq(schema.emailQueue.id, id));
    if (!row) return undefined;

    return {
        id: row.id,
        messageId: row.providerMessageId ?? undefined,
        to: row.to,
        subject: row.subject,
        campaignId: row.campaignId ?? undefined,
        userId: row.userId ?? undefined,
        status: row.status === 'dlq' ? 'failed' : row.status as SendStatus,
        provider: 'smtp',
        sentAt: row.sentAt?.toISOString(),
        error: row.lastError ?? undefined,
        attempts: row.attempts,
    };
}

export function setRateLimit(rate: number): void {
    const rt = getRuntime();
    rt.rateLimit = Math.max(1, Math.min(100, rate));
    console.log(`[email-queue] Rate limit set to ${rt.rateLimit}/s`);
}
