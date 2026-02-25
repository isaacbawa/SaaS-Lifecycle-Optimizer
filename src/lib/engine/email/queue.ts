/* ═══════════════════════════════════════════════════════════════════════
 * Email Queue — Rate-Limited, Prioritized Email Delivery Queue
 *
 * Production email queue with:
 *   • Priority levels (critical, high, normal, low, bulk)
 *   • Per-second rate limiting (configurable, default 10/s)
 *   • Exponential backoff retry (3 attempts)
 *   • Dead-letter queue for permanent failures
 *   • Send logging with delivery status tracking
 *   • Metrics: sent, failed, retried, queued counts
 *
 * The queue processes continuously via a tick-based loop.
 * Call startQueue() to begin processing, stopQueue() to halt.
 * ═══════════════════════════════════════════════════════════════════════ */

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
    nextAttemptAt: number; // epoch ms
    createdAt: string;
    lastError?: string;
    tags?: Record<string, string>;
}

export type SendStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced';

export interface SendRecord {
    id: string;
    messageId?: string; // From SMTP response
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

const PRIORITY_ORDER: Record<EmailPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    bulk: 4,
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RATE_LIMIT = 10; // emails per second
const TICK_INTERVAL_MS = 200; // Process queue every 200ms
const MAX_SEND_LOG_SIZE = 10_000;
const MAX_DLQ_SIZE = 5_000;

/* ── Queue Store (Singleton) ────────────────────────────────────────── */

const globalKey = '__lifecycleos_email_queue__';

interface QueueStore {
    pending: QueuedEmail[];
    dlq: QueuedEmail[];
    sendLog: SendRecord[];
    metrics: {
        sent: number;
        failed: number;
        retried: number;
    };
    rateLimit: number;
    tokenBucket: {
        tokens: number;
        lastRefill: number;
    };
    isRunning: boolean;
    tickTimer: ReturnType<typeof setInterval> | null;
    onSend: ((email: QueuedEmail) => Promise<{ success: boolean; messageId?: string; error?: string }>) | null;
}

function getStore(): QueueStore {
    const g = globalThis as unknown as Record<string, QueueStore>;
    if (!g[globalKey]) {
        g[globalKey] = {
            pending: [],
            dlq: [],
            sendLog: [],
            metrics: { sent: 0, failed: 0, retried: 0 },
            rateLimit: DEFAULT_RATE_LIMIT,
            tokenBucket: { tokens: DEFAULT_RATE_LIMIT, lastRefill: Date.now() },
            isRunning: false,
            tickTimer: null,
            onSend: null,
        };
    }
    return g[globalKey];
}

/* ═══════════════════════════════════════════════════════════════════════
 * Queue Management
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Generate a unique email ID.
 */
function generateId(): string {
    return `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Enqueue an email for delivery.
 * Returns the queued email ID for tracking.
 */
export function enqueue(email: {
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
}): string {
    const store = getStore();
    const id = generateId();

    const queued: QueuedEmail = {
        id,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        replyTo: email.replyTo,
        headers: email.headers,
        campaignId: email.campaignId,
        userId: email.userId,
        priority: email.priority ?? 'normal',
        attempts: 0,
        maxAttempts: email.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: Date.now(),
        createdAt: new Date().toISOString(),
        tags: email.tags,
    };

    // Insert in priority order
    const insertIdx = store.pending.findIndex(
        (e) => PRIORITY_ORDER[e.priority] > PRIORITY_ORDER[queued.priority],
    );

    if (insertIdx === -1) {
        store.pending.push(queued);
    } else {
        store.pending.splice(insertIdx, 0, queued);
    }

    // Record in send log
    addSendRecord({
        id,
        to: email.to,
        subject: email.subject,
        campaignId: email.campaignId,
        userId: email.userId,
        status: 'queued',
        provider: 'smtp',
        attempts: 0,
    });

    return id;
}

/**
 * Enqueue a batch of emails.
 */
export function enqueueBatch(
    emails: Array<Parameters<typeof enqueue>[0]>,
): string[] {
    return emails.map(enqueue);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Token Bucket Rate Limiter
 * ═══════════════════════════════════════════════════════════════════════ */

function tryAcquireToken(): boolean {
    const store = getStore();
    const now = Date.now();
    const elapsed = now - store.tokenBucket.lastRefill;

    // Refill tokens based on elapsed time
    if (elapsed >= 1000) {
        const refills = Math.floor(elapsed / 1000);
        store.tokenBucket.tokens = Math.min(
            store.rateLimit,
            store.tokenBucket.tokens + refills * store.rateLimit,
        );
        store.tokenBucket.lastRefill = now - (elapsed % 1000);
    }

    if (store.tokenBucket.tokens > 0) {
        store.tokenBucket.tokens--;
        return true;
    }

    return false;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Queue Processing Loop
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Process one tick of the queue. Called periodically.
 */
async function tick(): Promise<void> {
    const store = getStore();
    if (!store.onSend) return;

    const now = Date.now();
    const batch: QueuedEmail[] = [];

    // Collect eligible emails (up to rate limit)
    let i = 0;
    while (i < store.pending.length && batch.length < store.rateLimit) {
        const email = store.pending[i];
        if (email.nextAttemptAt <= now && tryAcquireToken()) {
            batch.push(email);
            store.pending.splice(i, 1);
        } else {
            i++;
        }
    }

    // Send batch concurrently
    const results = await Promise.allSettled(
        batch.map(async (email) => {
            email.attempts++;
            updateSendRecord(email.id, { status: 'sending', attempts: email.attempts });

            try {
                const result = await store.onSend!(email);

                if (result.success) {
                    store.metrics.sent++;
                    updateSendRecord(email.id, {
                        status: 'sent',
                        messageId: result.messageId,
                        sentAt: new Date().toISOString(),
                    });
                } else {
                    throw new Error(result.error ?? 'Send failed');
                }
            } catch (err) {
                const error = (err as Error).message;
                email.lastError = error;

                if (email.attempts < email.maxAttempts) {
                    // Retry with exponential backoff
                    const delay = Math.min(
                        60_000,
                        1000 * Math.pow(2, email.attempts - 1) +
                        Math.random() * 1000,
                    );
                    email.nextAttemptAt = Date.now() + delay;
                    store.pending.push(email);
                    store.metrics.retried++;
                    updateSendRecord(email.id, {
                        status: 'queued',
                        error: `Retry ${email.attempts}/${email.maxAttempts}: ${error}`,
                    });
                } else {
                    // Move to DLQ
                    store.metrics.failed++;
                    if (store.dlq.length >= MAX_DLQ_SIZE) {
                        store.dlq.shift(); // Evict oldest
                    }
                    store.dlq.push(email);
                    updateSendRecord(email.id, {
                        status: 'failed',
                        error: `Exhausted ${email.maxAttempts} attempts: ${error}`,
                    });
                }
            }
        }),
    );

    // Log any unexpected rejections
    for (const r of results) {
        if (r.status === 'rejected') {
            console.error('[email-queue] Unexpected error in send loop:', r.reason);
        }
    }
}

/* ── Send Record Management ─────────────────────────────────────────── */

function addSendRecord(record: SendRecord): void {
    const store = getStore();
    if (store.sendLog.length >= MAX_SEND_LOG_SIZE) {
        store.sendLog.splice(0, Math.floor(MAX_SEND_LOG_SIZE * 0.1));
    }
    store.sendLog.push(record);
}

function updateSendRecord(
    id: string,
    update: Partial<SendRecord>,
): void {
    const store = getStore();
    const record = store.sendLog.find((r) => r.id === id);
    if (record) {
        Object.assign(record, update);
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Queue Control
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Register the send function. Must be called before starting the queue.
 */
export function setSendHandler(
    handler: (email: QueuedEmail) => Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>,
): void {
    getStore().onSend = handler;
}

/**
 * Start the queue processing loop.
 */
export function startQueue(rateLimit?: number): void {
    const store = getStore();

    if (store.isRunning) return;

    if (rateLimit) {
        store.rateLimit = rateLimit;
        store.tokenBucket.tokens = rateLimit;
    }

    store.isRunning = true;
    store.tickTimer = setInterval(() => {
        tick().catch((err) => {
            console.error('[email-queue] Tick error:', err);
        });
    }, TICK_INTERVAL_MS);

    console.log(
        `[email-queue] Started (rate: ${store.rateLimit}/s, tick: ${TICK_INTERVAL_MS}ms)`,
    );
}

/**
 * Stop the queue processing loop.
 * In-flight sends will complete, but no new sends will start.
 */
export function stopQueue(): void {
    const store = getStore();
    if (store.tickTimer) {
        clearInterval(store.tickTimer);
        store.tickTimer = null;
    }
    store.isRunning = false;
    console.log('[email-queue] Stopped');
}

/**
 * Get queue metrics.
 */
export function getQueueMetrics(): QueueMetrics {
    const store = getStore();
    return {
        queued: store.pending.length,
        sending: store.sendLog.filter((r) => r.status === 'sending').length,
        sent: store.metrics.sent,
        failed: store.metrics.failed,
        retried: store.metrics.retried,
        dlq: store.dlq.length,
        ratePerSecond: store.rateLimit,
        isRunning: store.isRunning,
    };
}

/**
 * Get send log entries.
 */
export function getSendLog(limit = 100, offset = 0): SendRecord[] {
    const store = getStore();
    const start = Math.max(0, store.sendLog.length - limit - offset);
    const end = store.sendLog.length - offset;
    return store.sendLog.slice(start, end);
}

/**
 * Get dead-letter queue entries.
 */
export function getDLQ(): QueuedEmail[] {
    return [...getStore().dlq];
}

/**
 * Retry a specific DLQ entry by moving it back to the pending queue.
 */
export function retryDLQEntry(id: string): boolean {
    const store = getStore();
    const idx = store.dlq.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const email = store.dlq.splice(idx, 1)[0];
    email.attempts = 0;
    email.nextAttemptAt = Date.now();
    email.lastError = undefined;
    store.pending.push(email);

    updateSendRecord(email.id, { status: 'queued', error: 'Retried from DLQ' });
    return true;
}

/**
 * Remove a DLQ entry permanently.
 */
export function removeDLQEntry(id: string): boolean {
    const store = getStore();
    const idx = store.dlq.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    store.dlq.splice(idx, 1);
    return true;
}

/**
 * Get send record by ID.
 */
export function getSendRecord(id: string): SendRecord | undefined {
    return getStore().sendLog.find((r) => r.id === id);
}

/**
 * Set the rate limit (emails per second).
 */
export function setRateLimit(rate: number): void {
    const store = getStore();
    store.rateLimit = Math.max(1, Math.min(100, rate));
    console.log(`[email-queue] Rate limit set to ${store.rateLimit}/s`);
}
