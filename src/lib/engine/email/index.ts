/* ═══════════════════════════════════════════════════════════════════════
 * Built-in Email System — Own ESP Facade
 *
 * Production email delivery system built entirely in-house:
 *   • SMTP transport with connection pooling (nodemailer)
 *   • Token-bucket rate limiting (configurable per-second)
 *   • Priority queue with exponential backoff retry
 *   • Open tracking (1x1 pixel), click tracking (redirect)
 *   • RFC 8058 one-click unsubscribe
 *   • Suppression list (bounces, complaints, unsubscribes)
 *   • DKIM signing support
 *   • Dead-letter queue for permanent failures
 *   • Full send log with delivery status
 *
 * This module is the single entry point. It:
 *   1. Initializes the SMTP transport
 *   2. Wires the queue's send handler to the transport
 *   3. Starts the queue processing loop
 *   4. Provides sendEmail() / sendEmailBatch() as the public API
 *
 * No external ESP (Resend, Mailgun, SendGrid) is used.
 * The system owns the full email pipeline.
 *
 * Environment Variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 *   EMAIL_FROM, EMAIL_FROM_NAME, EMAIL_REPLY_TO
 *   DKIM_DOMAIN, DKIM_SELECTOR, DKIM_PRIVATE_KEY
 *   EMAIL_TRACKING_SECRET, EMAIL_RATE_LIMIT
 *   NEXT_PUBLIC_APP_URL
 * ═══════════════════════════════════════════════════════════════════════ */

import { getTransport, getTransportConfig, checkTransportHealth, closeTransport } from './transport';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, lte, asc } from 'drizzle-orm';
import {
    enqueue,
    enqueueBatch,
    setSendHandler,
    startQueue,
    stopQueue,
    getQueueMetrics,
    getSendLog,
    getDLQ as getQueueDLQ,
    retryDLQEntry,
    removeDLQEntry as removeQueueDLQEntry,
    getSendRecord,
    setRateLimit,
    updateQueueStatus,
    type QueuedEmail,
    type EmailPriority,
    type SendRecord,
    type QueueMetrics,
} from './queue';
import {
    isSuppressed,
    getSuppressionEntry,
    addSuppression,
    recordBounce,
    recordComplaint,
    recordUnsubscribe,
    removeSuppression,
    filterSuppressed,
    getAllSuppressions,
    getSuppressionStats,
    type SuppressionEntry,
    type SuppressionStats,
    type SuppressionReason,
} from './suppression';
import {
    injectTracking,
    getUnsubscribeHeaders,
    verifyTrackingToken,
    recordTrackingEvent,
    getCampaignTrackingStats,
    getMessageTrackingStats,
    getTrackingEvents,
    resolveOrgIdFromCampaign,
    TRACKING_PIXEL_GIF,
    type TrackingEvent,
    type TrackingStats,
} from './tracking';

/* ── Public Types ────────────────────────────────────────────────────── */

export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    campaignId?: string;
    userId?: string;
    orgId?: string;
    priority?: EmailPriority;
    tags?: Record<string, string>;
    trackOpens?: boolean;   // Default: true
    trackClicks?: boolean;  // Default: true
    maxAttempts?: number;   // Default: 3
}

export interface EmailResult {
    success: boolean;
    provider: 'smtp' | 'log';
    queueId: string;
    messageId?: string;
    error?: string;
    suppressed?: boolean;
}

export interface EmailSystemStatus {
    provider: 'smtp' | 'log';
    transport: { connected: boolean; lastCheckAt: string; error?: string };
    queue: QueueMetrics;
    suppression: SuppressionStats;
    config: {
        host: string;
        port: number;
        fromEmail: string;
        fromName: string;
        hasDkim: boolean;
        rateLimit: number;
    };
}

/* ── Initialization Flag ────────────────────────────────────────────── */

const initKey = '__lifecycleos_email_system_init__';

function isInitialized(): boolean {
    return !!(globalThis as unknown as Record<string, boolean>)[initKey];
}

function markInitialized(): void {
    (globalThis as unknown as Record<string, boolean>)[initKey] = true;
}

/* ═══════════════════════════════════════════════════════════════════════
 * System Initialization
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Initialize the email system. Safe to call multiple times (idempotent).
 * Wires the SMTP transport into the queue and starts processing.
 *
 * NOTE: On Vercel serverless, the setInterval tick loop will only live
 * for the duration of a single request. The primary delivery path is
 * the inline send in sendEmail(). The queue tick + cron exist only to
 * retry failed/queued items that didn't deliver on the first attempt.
 */
export function initEmailSystem(): void {
    if (isInitialized()) return;

    const transport = getTransport();
    const config = getTransportConfig();

    // Wire the queue send handler (used by tick-based retry processing)
    if (transport) {
        setSendHandler(async (email: QueuedEmail) => {
            const fromLine = email.fromName
                ? `${email.fromName} <${email.fromEmail ?? config.fromEmail}>`
                : `${config.fromName} <${email.fromEmail ?? config.fromEmail}>`;

            try {
                const info = await transport.sendMail({
                    from: fromLine,
                    to: email.to,
                    subject: email.subject,
                    html: email.html,
                    text: email.text,
                    replyTo: email.replyTo ?? process.env.EMAIL_REPLY_TO,
                    headers: email.headers,
                });

                return {
                    success: true,
                    messageId: info.messageId,
                };
            } catch (err) {
                const message = (err as Error).message;

                // Classify SMTP errors for bounce handling
                if (
                    message.includes('550') ||
                    message.includes('551') ||
                    message.includes('552') ||
                    message.includes('553') ||
                    message.includes('554')
                ) {
                    await recordBounce(email.to, 'hard', message, 'smtp_response', email.orgId);
                } else if (
                    message.includes('421') ||
                    message.includes('450') ||
                    message.includes('451') ||
                    message.includes('452')
                ) {
                    await recordBounce(email.to, 'soft', message, 'smtp_response', email.orgId);
                }

                return { success: false, error: message };
            }
        });

        console.log(
            `[email-system] SMTP mode → ${config.host}:${config.port} (DKIM: ${!!config.dkim})`,
        );
    } else {
        setSendHandler(async (email: QueuedEmail) => {
            console.error(
                `[email-system] SMTP_HOST is not configured. Email to ${email.to} (subject: "${email.subject}") was NOT delivered. ` +
                `Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables to enable email delivery.`,
            );
            return { success: false, error: 'SMTP not configured — email delivery is disabled. Set SMTP_HOST to enable.' };
        });

        console.warn('[email-system] WARNING: SMTP_HOST is not configured. All emails will FAIL until SMTP credentials are provided.');
    }

    // Start queue processing (handles retries for items that failed inline send)
    const rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT ?? '10', 10);
    startQueue(rateLimit);

    markInitialized();
}

/* ═══════════════════════════════════════════════════════════════════════
 * Inline SMTP Send — delivers immediately within the request lifecycle
 *
 * On Vercel (serverless), the background tick loop dies when the
 * function terminates. Emails MUST be sent inline within the request,
 * not deferred to setInterval. The queue DB record is created for
 * tracking, and actual SMTP delivery happens here synchronously.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Send a single email via SMTP immediately (not deferred).
 * Returns the SMTP result directly.
 */
async function sendInline(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    orgId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const transport = getTransport();
    const config = getTransportConfig();

    if (!transport) {
        console.error(
            `[email-system] SMTP_HOST not configured. Email to ${params.to} was NOT delivered.`,
        );
        return { success: false, error: 'SMTP not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.' };
    }

    const fromLine = params.fromName
        ? `${params.fromName} <${params.fromEmail ?? config.fromEmail}>`
        : `${config.fromName} <${params.fromEmail ?? config.fromEmail}>`;

    try {
        const info = await transport.sendMail({
            from: fromLine,
            to: params.to,
            subject: params.subject,
            html: params.html,
            text: params.text,
            replyTo: params.replyTo ?? process.env.EMAIL_REPLY_TO,
            headers: params.headers,
        });

        return { success: true, messageId: info.messageId };
    } catch (err) {
        const message = (err as Error).message;

        // Classify SMTP errors for bounce handling
        if (/^5[5-9]\d|^5[0-4]\d/.test(message) || /\b55[0-4]\b/.test(message)) {
            await recordBounce(params.to, 'hard', message, 'smtp_response', params.orgId);
        } else if (/\b4[25][0-2]\b|\b421\b/.test(message)) {
            await recordBounce(params.to, 'soft', message, 'smtp_response', params.orgId);
        }

        return { success: false, error: message };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Public Send API (replaces old email-provider.ts)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Send an email through the built-in email system.
 *
 * This is the main entry point. It:
 *   1. Checks suppression list
 *   2. Injects tracking (open pixel, click wrapping, unsubscribe)
 *   3. Records the email in the queue DB (for audit/metrics)
 *   4. Sends IMMEDIATELY via SMTP inline (not deferred to background)
 *   5. Updates the queue record with the delivery result
 *
 * On Vercel serverless, the function is killed after the response.
 * Background setInterval loops cannot process queued emails. Therefore,
 * the first delivery attempt MUST happen inline within the request.
 * Failed sends remain in the queue DB for cron-based retry.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
    // Auto-initialize on first use
    initEmailSystem();

    const provider = getTransport() ? 'smtp' : 'log' as const;

    // 1. Check suppression
    if (await isSuppressed(payload.to, payload.orgId)) {
        const entry = await getSuppressionEntry(payload.to, payload.orgId);
        console.log(
            `[email-system] Suppressed: ${payload.to} (reason: ${entry?.reason})`,
        );
        return {
            success: false,
            provider,
            queueId: '',
            error: `Address suppressed: ${entry?.reason ?? 'unknown'}`,
            suppressed: true,
        };
    }

    // 2. Generate message ID for tracking
    const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // 3. Inject tracking into HTML
    let html = payload.html;
    const trackOpens = payload.trackOpens !== false;
    const trackClicks = payload.trackClicks !== false;

    let unsubHeaders: Record<string, string> = {};

    try {
        if (trackOpens || trackClicks) {
            html = injectTracking(html, messageId, payload.to, payload.campaignId);
        }

        // Build headers (RFC 8058 unsubscribe)
        unsubHeaders = getUnsubscribeHeaders(messageId, payload.to, payload.campaignId);
    } catch (trackingErr) {
        // Tracking must never block email delivery — send without tracking
        console.warn(
            '[email-system] Tracking injection failed, sending without tracking:',
            trackingErr instanceof Error ? trackingErr.message : trackingErr,
        );
    }

    // 4. Record in queue DB for audit trail
    const queueId = await enqueue({
        to: payload.to,
        subject: payload.subject,
        html,
        text: payload.text,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        replyTo: payload.replyTo,
        campaignId: payload.campaignId,
        userId: payload.userId,
        orgId: payload.orgId,
        priority: payload.priority ?? 'normal',
        maxAttempts: payload.maxAttempts ?? 3,
        headers: unsubHeaders,
        tags: payload.tags,
    });

    // 5. Send IMMEDIATELY via SMTP (inline, not deferred)
    const smtpResult = await sendInline({
        to: payload.to,
        subject: payload.subject,
        html,
        text: payload.text,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        replyTo: payload.replyTo,
        headers: unsubHeaders,
        orgId: payload.orgId,
    });

    // 6. Update queue record with delivery result
    try {
        await updateQueueStatus(queueId, smtpResult);
    } catch (dbErr) {
        console.error('[email-system] Failed to update queue status:', dbErr);
    }

    if (smtpResult.success) {
        return {
            success: true,
            provider,
            queueId,
            messageId: smtpResult.messageId ?? messageId,
        };
    } else {
        return {
            success: false,
            provider,
            queueId,
            error: smtpResult.error,
        };
    }
}

/**
 * Send a batch of emails. Each is individually suppression-checked
 * and enqueued. Returns individual results.
 */
export async function sendEmailBatch(
    payloads: EmailPayload[],
): Promise<EmailResult[]> {
    return Promise.all(payloads.map(sendEmail));
}

/**
 * Get the active provider type.
 */
export function getActiveProvider(): 'smtp' | 'log' {
    return getTransport() ? 'smtp' : 'log';
}

/* ═══════════════════════════════════════════════════════════════════════
 * System Status & Admin API
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Get full email system status.
 */
export async function getEmailSystemStatus(orgId?: string): Promise<EmailSystemStatus> {
    const config = getTransportConfig();
    const health = await checkTransportHealth();
    const queue = await getQueueMetrics(orgId);
    const suppression = await getSuppressionStats(orgId);

    return {
        provider: getTransport() ? 'smtp' : 'log',
        transport: health,
        queue,
        suppression,
        config: {
            host: config.host || '(not configured)',
            port: config.port,
            fromEmail: config.fromEmail,
            fromName: config.fromName,
            hasDkim: !!config.dkim,
            rateLimit: queue.ratePerSecond,
        },
    };
}

/**
 * Graceful shutdown of the email system.
 */
export function shutdownEmailSystem(): void {
    stopQueue();
    closeTransport();
    (globalThis as unknown as Record<string, boolean>)[initKey] = false;
    console.log('[email-system] Shut down');
}

/* ═══════════════════════════════════════════════════════════════════════
 * Retry Queue Processor — called by cron scheduler
 *
 * Processes emails that failed their initial inline send attempt.
 * These remain in the queue DB with status 'queued' and attempts >= 1.
 * The cron runs every minute to pick up and retry them via SMTP.
 * ═══════════════════════════════════════════════════════════════════════ */

export async function processRetryQueue(): Promise<{ processed: number; sent: number; failed: number }> {
    initEmailSystem();

    const now = new Date();
    const BATCH_LIMIT = 50;

    // Fetch queued items whose next retry time has elapsed
    const rows = await db.select().from(schema.emailQueue)
        .where(
            and(
                eq(schema.emailQueue.status, 'queued'),
                lte(schema.emailQueue.nextAttemptAt, now),
            ),
        )
        .orderBy(asc(schema.emailQueue.nextAttemptAt))
        .limit(BATCH_LIMIT);

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
        const newAttempts = row.attempts + 1;

        const result = await sendInline({
            to: row.to,
            subject: row.subject,
            html: row.html,
            text: row.text ?? undefined,
            fromName: row.fromName ?? undefined,
            fromEmail: row.fromEmail ?? undefined,
            replyTo: row.replyTo ?? undefined,
            headers: row.headers ?? undefined,
            orgId: row.organizationId,
        });

        if (result.success) {
            await db.update(schema.emailQueue)
                .set({
                    status: 'sent',
                    attempts: newAttempts,
                    sentAt: new Date(),
                    providerMessageId: result.messageId ?? null,
                    lastError: null,
                })
                .where(eq(schema.emailQueue.id, row.id));
            sent++;
        } else if (newAttempts >= row.maxAttempts) {
            // Exhausted retries → DLQ
            await db.update(schema.emailQueue)
                .set({
                    status: 'dlq',
                    attempts: newAttempts,
                    lastError: `Exhausted ${row.maxAttempts} attempts: ${result.error}`,
                })
                .where(eq(schema.emailQueue.id, row.id));
            failed++;
        } else {
            // Schedule next retry with exponential backoff
            const delay = Math.min(60_000, 1000 * Math.pow(2, newAttempts - 1) + Math.random() * 1000);
            await db.update(schema.emailQueue)
                .set({
                    status: 'queued',
                    attempts: newAttempts,
                    nextAttemptAt: new Date(Date.now() + delay),
                    lastError: `Retry ${newAttempts}/${row.maxAttempts}: ${result.error}`,
                })
                .where(eq(schema.emailQueue.id, row.id));
            failed++;
        }
    }

    if (rows.length > 0) {
        console.log(`[email-system] Retry queue: ${rows.length} processed, ${sent} sent, ${failed} failed`);
    }

    return { processed: rows.length, sent, failed };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Re-exports — All email subsystem APIs available through this module
 * ═══════════════════════════════════════════════════════════════════════ */

// Queue
export {
    getQueueMetrics,
    getSendLog,
    getSendRecord,
    setRateLimit,
    retryDLQEntry,
    removeQueueDLQEntry as removeDLQEntry,
    getQueueDLQ as getEmailDLQ,
};
export type { QueueMetrics, SendRecord, EmailPriority };

// Suppression
export {
    isSuppressed,
    getSuppressionEntry,
    addSuppression,
    recordBounce,
    recordComplaint,
    recordUnsubscribe,
    removeSuppression,
    filterSuppressed,
    getAllSuppressions,
    getSuppressionStats,
};
export type { SuppressionEntry, SuppressionStats, SuppressionReason };

// Tracking
export {
    verifyTrackingToken,
    recordTrackingEvent,
    getCampaignTrackingStats,
    getMessageTrackingStats,
    getTrackingEvents,
    resolveOrgIdFromCampaign,
    TRACKING_PIXEL_GIF,
};
export type { TrackingEvent, TrackingStats };
