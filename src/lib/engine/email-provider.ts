/* ═══════════════════════════════════════════════════════════════════════
 * Email Provider — Production Email Delivery Abstraction
 *
 * Supports multiple providers through a pluggable architecture:
 *   • Resend (primary — modern API, great DX)
 *   • SMTP (fallback — works with any provider)
 *   • Log-only mode (development — no external calls)
 *
 * Provider selection is automatic based on environment variables:
 *   - RESEND_API_KEY → uses Resend
 *   - SMTP_HOST → uses SMTP
 *   - Neither → log-only mode (emails logged to console + store)
 *
 * All sends are tracked in the activity log for observability.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Types ──────────────────────────────────────────────────────────── */

export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    tags?: Record<string, string>;
}

export interface EmailResult {
    success: boolean;
    provider: 'resend' | 'smtp' | 'log';
    messageId?: string;
    error?: string;
}

/* ── Configuration ──────────────────────────────────────────────────── */

function getConfig() {
    return {
        resendApiKey: process.env.RESEND_API_KEY,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        smtpSecure: process.env.SMTP_SECURE === 'true',
        defaultFrom: process.env.EMAIL_FROM ?? 'LifecycleOS <noreply@lifecycleos.app>',
        defaultReplyTo: process.env.EMAIL_REPLY_TO ?? 'support@lifecycleos.app',
    };
}

/* ── Provider: Resend ───────────────────────────────────────────────── */

async function sendViaResend(payload: EmailPayload, apiKey: string): Promise<EmailResult> {
    const config = getConfig();
    const fromLine = payload.fromName
        ? `${payload.fromName} <${payload.fromEmail ?? 'noreply@lifecycleos.app'}>`
        : (payload.fromEmail ?? config.defaultFrom);

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: fromLine,
                to: [payload.to],
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
                reply_to: payload.replyTo ?? config.defaultReplyTo,
                tags: payload.tags
                    ? Object.entries(payload.tags).map(([name, value]) => ({ name, value }))
                    : undefined,
            }),
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                provider: 'resend',
                error: `Resend API ${response.status}: ${error}`,
            };
        }

        const data = (await response.json()) as { id?: string };
        return {
            success: true,
            provider: 'resend',
            messageId: data.id,
        };
    } catch (e) {
        return {
            success: false,
            provider: 'resend',
            error: (e as Error).message,
        };
    }
}

/* ── Provider: SMTP ─────────────────────────────────────────────────── */

async function sendViaSMTP(payload: EmailPayload): Promise<EmailResult> {
    // SMTP requires nodemailer which is a heavy dependency.
    // For now, SMTP is a documented extension point.
    // Users who need SMTP should install nodemailer and implement this:
    //
    //   npm install nodemailer @types/nodemailer
    //
    // The implementation would be:
    //   const transport = nodemailer.createTransport({ host, port, auth, secure });
    //   await transport.sendMail({ from, to, subject, html, text });

    const config = getConfig();

    // Attempt to dynamically import nodemailer if available
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require('nodemailer');
        const transport = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            auth: config.smtpUser
                ? { user: config.smtpUser, pass: config.smtpPass }
                : undefined,
        });

        const fromLine = payload.fromName
            ? `${payload.fromName} <${payload.fromEmail ?? 'noreply@lifecycleos.app'}>`
            : config.defaultFrom;

        const info = await transport.sendMail({
            from: fromLine,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            replyTo: payload.replyTo ?? config.defaultReplyTo,
        });

        return {
            success: true,
            provider: 'smtp',
            messageId: info.messageId,
        };
    } catch (e) {
        return {
            success: false,
            provider: 'smtp',
            error: `SMTP send failed: ${(e as Error).message}`,
        };
    }
}

/* ── Provider: Log Only (Development) ───────────────────────────────── */

function sendViaLog(payload: EmailPayload): EmailResult {
    const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    console.log(`\n📧 [email-provider] LOG MODE — Email not actually sent`);
    console.log(`   To:      ${payload.to}`);
    console.log(`   Subject: ${payload.subject}`);
    console.log(`   From:    ${payload.fromName ?? 'LifecycleOS'}`);
    console.log(`   ID:      ${logId}`);
    console.log(`   Body:    ${payload.html.substring(0, 200)}...`);
    console.log('');

    return {
        success: true,
        provider: 'log',
        messageId: logId,
    };
}

/* ── Main Send Function ─────────────────────────────────────────────── */

/**
 * Send an email using the configured provider.
 *
 * Provider selection priority:
 *   1. RESEND_API_KEY env var → Resend API
 *   2. SMTP_HOST env var → SMTP transport
 *   3. Neither → Log-only mode (development)
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
    const config = getConfig();

    let result: EmailResult;

    if (config.resendApiKey) {
        result = await sendViaResend(payload, config.resendApiKey);
    } else if (config.smtpHost) {
        result = await sendViaSMTP(payload);
    } else {
        result = sendViaLog(payload);
    }

    // Log all sends for observability
    if (!result.success) {
        console.error(
            `[email-provider] Failed to send to ${payload.to}: ${result.error} (provider: ${result.provider})`,
        );
    }

    return result;
}

/**
 * Send a batch of emails. Returns individual results.
 * Emails are sent concurrently with a concurrency limit.
 */
export async function sendEmailBatch(
    payloads: EmailPayload[],
    concurrency = 5,
): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Process in chunks for concurrency control
    for (let i = 0; i < payloads.length; i += concurrency) {
        const chunk = payloads.slice(i, i + concurrency);
        const chunkResults = await Promise.all(chunk.map(sendEmail));
        results.push(...chunkResults);
    }

    return results;
}

/**
 * Check if an email provider is configured.
 * Returns the active provider name or null.
 */
export function getActiveProvider(): 'resend' | 'smtp' | 'log' {
    const config = getConfig();
    if (config.resendApiKey) return 'resend';
    if (config.smtpHost) return 'smtp';
    return 'log';
}
