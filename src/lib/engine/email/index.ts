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
 */
export function initEmailSystem(): void {
    if (isInitialized()) return;

    const transport = getTransport();
    const config = getTransportConfig();

    // Wire the queue send handler
    if (transport) {
        // Production: send via SMTP
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
                    // 5xx = permanent failure → hard bounce
                    recordBounce(email.to, 'hard', message, 'smtp_response');
                } else if (
                    message.includes('421') ||
                    message.includes('450') ||
                    message.includes('451') ||
                    message.includes('452')
                ) {
                    // 4xx = temporary failure → soft bounce
                    recordBounce(email.to, 'soft', message, 'smtp_response');
                }

                return { success: false, error: message };
            }
        });

        console.log(
            `[email-system] SMTP mode → ${config.host}:${config.port} (DKIM: ${!!config.dkim})`,
        );
    } else {
        // Development: log mode
        setSendHandler(async (email: QueuedEmail) => {
            const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

            console.log(`\n📧 [email-system] LOG MODE — Email not actually sent`);
            console.log(`   To:       ${email.to}`);
            console.log(`   Subject:  ${email.subject}`);
            console.log(`   Priority: ${email.priority}`);
            console.log(`   Campaign: ${email.campaignId ?? 'none'}`);
            console.log(`   ID:       ${logId}`);
            console.log(`   Body:     ${email.html.substring(0, 200)}...`);
            console.log('');

            return { success: true, messageId: logId };
        });

        console.log('[email-system] LOG mode (no SMTP_HOST configured)');
    }

    // Start queue processing
    const rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT ?? '10', 10);
    startQueue(rateLimit);

    markInitialized();
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
 *   3. Enqueues for rate-limited delivery
 *
 * Returns immediately — actual delivery is async via the queue.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
    // Auto-initialize on first use
    initEmailSystem();

    const provider = getTransport() ? 'smtp' : 'log' as const;

    // 1. Check suppression
    if (isSuppressed(payload.to)) {
        const entry = getSuppressionEntry(payload.to);
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

    if (trackOpens || trackClicks) {
        html = injectTracking(html, messageId, payload.to, payload.campaignId);
    }

    // 4. Build headers (RFC 8058 unsubscribe)
    const unsubHeaders = getUnsubscribeHeaders(messageId, payload.to, payload.campaignId);

    // 5. Enqueue
    const queueId = enqueue({
        to: payload.to,
        subject: payload.subject,
        html,
        text: payload.text,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        replyTo: payload.replyTo,
        campaignId: payload.campaignId,
        userId: payload.userId,
        priority: payload.priority ?? 'normal',
        maxAttempts: payload.maxAttempts ?? 3,
        headers: unsubHeaders,
        tags: payload.tags,
    });

    return {
        success: true,
        provider,
        queueId,
        messageId,
    };
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
export async function getEmailSystemStatus(): Promise<EmailSystemStatus> {
    const config = getTransportConfig();
    const health = await checkTransportHealth();
    const queue = getQueueMetrics();
    const suppression = getSuppressionStats();

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
    TRACKING_PIXEL_GIF,
};
export type { TrackingEvent, TrackingStats };
