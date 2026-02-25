/* ═══════════════════════════════════════════════════════════════════════
 * Email Transport — SMTP Connection Management via Nodemailer
 *
 * Production SMTP transport with:
 *   • Connection pooling (reuse TCP connections)
 *   • DKIM signing (domain authentication)
 *   • TLS/STARTTLS auto-negotiation
 *   • Health checks (SMTP NOOP)
 *   • Graceful shutdown
 *
 * Environment Variables:
 *   SMTP_HOST        — SMTP server hostname (required)
 *   SMTP_PORT        — Port (default: 587)
 *   SMTP_USER        — Auth username
 *   SMTP_PASS        — Auth password
 *   SMTP_SECURE      — Use TLS (true/false, default: false → STARTTLS)
 *   SMTP_POOL_SIZE   — Max connections in pool (default: 5)
 *   EMAIL_FROM       — Default From address
 *   EMAIL_FROM_NAME  — Default From display name
 *   DKIM_DOMAIN      — DKIM signing domain
 *   DKIM_SELECTOR    — DKIM selector (default: 'default')
 *   DKIM_PRIVATE_KEY — DKIM private key (PEM)
 * ═══════════════════════════════════════════════════════════════════════ */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface TransportConfig {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    poolSize: number;
    fromEmail: string;
    fromName: string;
    dkim?: {
        domainName: string;
        keySelector: string;
        privateKey: string;
    };
}

export interface TransportHealth {
    connected: boolean;
    lastCheckAt: string;
    error?: string;
}

/* ── Configuration ──────────────────────────────────────────────────── */

function loadConfig(): TransportConfig {
    const host = process.env.SMTP_HOST ?? '';
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const poolSize = parseInt(process.env.SMTP_POOL_SIZE ?? '5', 10);
    const fromEmail = process.env.EMAIL_FROM ?? 'noreply@lifecycleos.app';
    const fromName = process.env.EMAIL_FROM_NAME ?? 'LifecycleOS';

    const dkimDomain = process.env.DKIM_DOMAIN;
    const dkimSelector = process.env.DKIM_SELECTOR ?? 'default';
    const dkimKey = process.env.DKIM_PRIVATE_KEY;

    return {
        host,
        port,
        secure,
        user,
        pass,
        poolSize,
        fromEmail,
        fromName,
        dkim:
            dkimDomain && dkimKey
                ? { domainName: dkimDomain, keySelector: dkimSelector, privateKey: dkimKey }
                : undefined,
    };
}

/* ── Transport Singleton ────────────────────────────────────────────── */

let _transport: Transporter<SMTPPool.SentMessageInfo> | null = null;
let _config: TransportConfig | null = null;
let _health: TransportHealth = { connected: false, lastCheckAt: new Date().toISOString() };

/**
 * Get or create the SMTP transport.
 * Returns null if SMTP_HOST is not configured (falls back to log mode).
 */
export function getTransport(): Transporter<SMTPPool.SentMessageInfo> | null {
    const config = loadConfig();

    // No SMTP configured → null triggers log-mode fallback
    if (!config.host) return null;

    // Reuse existing transport if config hasn't changed
    if (_transport && _config && _config.host === config.host && _config.port === config.port) {
        return _transport;
    }

    // Build nodemailer options
    const options: SMTPPool.Options = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        pool: true,
        maxConnections: config.poolSize,
        maxMessages: 500, // Per connection before cycling
        rateDelta: 1000, // 1 second window
        rateLimit: 14, // 14 messages per second (under most provider limits)
        connectionTimeout: 10_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
        logger: process.env.NODE_ENV === 'development',
        ...(config.user && config.pass
            ? { auth: { user: config.user, pass: config.pass } }
            : {}),
        ...(config.dkim ? { dkim: config.dkim } : {}),
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
    };

    _transport = nodemailer.createTransport(options);
    _config = config;

    console.log(
        `[email-transport] Created SMTP pool → ${config.host}:${config.port} ` +
        `(pool=${config.poolSize}, dkim=${!!config.dkim})`,
    );

    return _transport;
}

/**
 * Get the current transport configuration.
 */
export function getTransportConfig(): TransportConfig {
    if (_config) return _config;
    return loadConfig();
}

/**
 * Health-check the SMTP connection (sends NOOP command).
 */
export async function checkTransportHealth(): Promise<TransportHealth> {
    const transport = getTransport();

    if (!transport) {
        _health = {
            connected: false,
            lastCheckAt: new Date().toISOString(),
            error: 'No SMTP transport configured (SMTP_HOST not set)',
        };
        return _health;
    }

    try {
        const verified = await transport.verify();
        _health = {
            connected: verified,
            lastCheckAt: new Date().toISOString(),
        };
    } catch (e) {
        _health = {
            connected: false,
            lastCheckAt: new Date().toISOString(),
            error: (e as Error).message,
        };
    }

    return _health;
}

/**
 * Get cached health status without performing a check.
 */
export function getTransportHealth(): TransportHealth {
    return _health;
}

/**
 * Gracefully close the SMTP transport pool.
 */
export function closeTransport(): void {
    if (_transport) {
        _transport.close();
        _transport = null;
        _config = null;
        _health = { connected: false, lastCheckAt: new Date().toISOString() };
        console.log('[email-transport] SMTP pool closed');
    }
}
