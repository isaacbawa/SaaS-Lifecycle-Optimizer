/* ═══════════════════════════════════════════════════════════════════════
 * Email Suppression System — DB-Backed Bounce, Unsubscribe & Complaint Mgmt
 *
 * All suppressions are stored in PostgreSQL for durability across
 * serverless cold starts. The public API remains identical to the
 * original in-memory version so callers require zero changes.
 * ═══════════════════════════════════════════════════════════════════════ */

import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/* ── Types ──────────────────────────────────────────────────────────── */

export type SuppressionReason =
    | 'hard_bounce'
    | 'soft_bounce'
    | 'complaint'
    | 'unsubscribe'
    | 'manual_block'
    | 'invalid_address';

export interface SuppressionEntry {
    email: string;
    reason: SuppressionReason;
    addedAt: string;
    expiresAt?: string;
    bounceCount: number;
    source: string;
    metadata?: Record<string, unknown>;
}

export interface SuppressionStats {
    total: number;
    hardBounces: number;
    softBounces: number;
    complaints: number;
    unsubscribes: number;
    manualBlocks: number;
    invalidAddresses: number;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const SOFT_BOUNCE_COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours
const SOFT_BOUNCE_THRESHOLD = 3;

function normalize(email: string): string {
    return email.trim().toLowerCase();
}

async function getOrgId(providedOrgId?: string): Promise<string> {
    if (providedOrgId) return providedOrgId;
    // Fallback for background processing where orgId isn't passed through
    const envOrgId = process.env.DEMO_ORG_ID;
    if (envOrgId) return envOrgId;
    return '';
}

/* ── Core Functions ─────────────────────────────────────────────────── */

export async function isSuppressed(email: string): Promise<boolean> {
    const key = normalize(email);
    const orgId = await getOrgId();
    if (!orgId) return false;

    const [entry] = await db.select().from(schema.emailSuppressions)
        .where(and(eq(schema.emailSuppressions.organizationId, orgId), eq(schema.emailSuppressions.email, key)))
        .limit(1);

    if (!entry) return false;

    if (entry.reason === 'soft_bounce' && entry.expiresAt) {
        if (new Date(entry.expiresAt) < new Date()) {
            await db.delete(schema.emailSuppressions).where(eq(schema.emailSuppressions.id, entry.id));
            return false;
        }
    }
    return true;
}

export async function getSuppressionEntry(email: string): Promise<SuppressionEntry | null> {
    const key = normalize(email);
    const orgId = await getOrgId();
    if (!orgId) return null;

    const [entry] = await db.select().from(schema.emailSuppressions)
        .where(and(eq(schema.emailSuppressions.organizationId, orgId), eq(schema.emailSuppressions.email, key)))
        .limit(1);

    if (!entry) return null;
    if (entry.reason === 'soft_bounce' && entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        await db.delete(schema.emailSuppressions).where(eq(schema.emailSuppressions.id, entry.id));
        return null;
    }

    return { email: entry.email, reason: entry.reason, addedAt: entry.createdAt.toISOString(), expiresAt: entry.expiresAt?.toISOString(), bounceCount: entry.bounceCount, source: entry.source, metadata: entry.metadata ?? undefined };
}

export async function addSuppression(email: string, reason: SuppressionReason, source: string, metadata?: Record<string, unknown>): Promise<SuppressionEntry> {
    const key = normalize(email);
    const orgId = await getOrgId();

    const [existing] = await db.select().from(schema.emailSuppressions)
        .where(and(eq(schema.emailSuppressions.organizationId, orgId), eq(schema.emailSuppressions.email, key)))
        .limit(1);

    const bounceCount = (existing?.bounceCount ?? 0) + (reason.includes('bounce') ? 1 : 0);
    const effectiveReason: SuppressionReason = reason === 'soft_bounce' && bounceCount >= SOFT_BOUNCE_THRESHOLD ? 'hard_bounce' : reason;
    const expiresAt = effectiveReason === 'soft_bounce' ? new Date(Date.now() + SOFT_BOUNCE_COOLDOWN_MS) : null;

    const [result] = await db.insert(schema.emailSuppressions).values({
        organizationId: orgId, email: key, reason: effectiveReason, source, bounceCount, expiresAt, metadata: metadata ?? null,
    }).onConflictDoUpdate({
        target: [schema.emailSuppressions.organizationId, schema.emailSuppressions.email],
        set: { reason: effectiveReason, source, bounceCount, expiresAt, metadata: metadata ?? null, updatedAt: new Date() },
    }).returning();

    return { email: key, reason: effectiveReason, addedAt: result.createdAt.toISOString(), expiresAt: result.expiresAt?.toISOString(), bounceCount, source, metadata };
}

export async function recordBounce(email: string, bounceType: 'hard' | 'soft' | 'undetermined', diagnosticCode?: string, source = 'bounce_processor'): Promise<SuppressionEntry> {
    return addSuppression(email, bounceType === 'hard' ? 'hard_bounce' : 'soft_bounce', source, { bounceType, diagnosticCode });
}

export async function recordComplaint(email: string, feedbackType?: string, source = 'complaint_webhook'): Promise<SuppressionEntry> {
    return addSuppression(email, 'complaint', source, { feedbackType });
}

export async function recordUnsubscribe(email: string, source = 'unsubscribe_link', campaignId?: string): Promise<SuppressionEntry> {
    return addSuppression(email, 'unsubscribe', source, { campaignId });
}

export async function removeSuppression(email: string): Promise<boolean> {
    const key = normalize(email);
    const orgId = await getOrgId();
    if (!orgId) return false;
    const result = await db.delete(schema.emailSuppressions)
        .where(and(eq(schema.emailSuppressions.organizationId, orgId), eq(schema.emailSuppressions.email, key)))
        .returning();
    return result.length > 0;
}

export async function filterSuppressed(emails: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const email of emails) {
        if (!(await isSuppressed(email))) results.push(email);
    }
    return results;
}

export async function getAllSuppressions(): Promise<SuppressionEntry[]> {
    const orgId = await getOrgId();
    if (!orgId) return [];
    const entries = await db.select().from(schema.emailSuppressions).where(eq(schema.emailSuppressions.organizationId, orgId));
    return entries.map((e) => ({ email: e.email, reason: e.reason, addedAt: e.createdAt.toISOString(), expiresAt: e.expiresAt?.toISOString(), bounceCount: e.bounceCount, source: e.source, metadata: e.metadata ?? undefined }));
}

export async function getSuppressionStats(): Promise<SuppressionStats> {
    const orgId = await getOrgId();
    if (!orgId) return { total: 0, hardBounces: 0, softBounces: 0, complaints: 0, unsubscribes: 0, manualBlocks: 0, invalidAddresses: 0 };
    const [result] = await db.select({
        total: sql<number>`count(*)::int`,
        hardBounces: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'hard_bounce')::int`,
        softBounces: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'soft_bounce')::int`,
        complaints: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'complaint')::int`,
        unsubscribes: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'unsubscribe')::int`,
        manualBlocks: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'manual_block')::int`,
        invalidAddresses: sql<number>`count(*) filter (where ${schema.emailSuppressions.reason} = 'invalid_address')::int`,
    }).from(schema.emailSuppressions).where(eq(schema.emailSuppressions.organizationId, orgId));
    return result ?? { total: 0, hardBounces: 0, softBounces: 0, complaints: 0, unsubscribes: 0, manualBlocks: 0, invalidAddresses: 0 };
}

export async function clearAllSuppressions(): Promise<void> {
    const orgId = await getOrgId();
    if (!orgId) return;
    await db.delete(schema.emailSuppressions).where(eq(schema.emailSuppressions.organizationId, orgId));
}
