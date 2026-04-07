/* ═══════════════════════════════════════════════════════════════════════
 * Email Transport - SMTP Connection Management via Nodemailer
 *
 * Production SMTP transport with:
 *   • Connection pooling (reuse TCP connections)
 *   • SES-aware DKIM handling:
 *       – Amazon SES: DKIM signed by SES when domain is a verified identity
 *       – Other SMTP: Local Nodemailer DKIM signing with DKIM_PRIVATE_KEY
 *   • TLS/STARTTLS auto-negotiation
 *   • Health checks (SMTP NOOP)
 *   • Graceful shutdown
 *
 * Multi-Tenant ESP Architecture:
 *   Our platform authenticates to SES with its own SMTP credentials.
 *   Customer domains are registered as SES email identities (via ses-identity.ts).
 *   SES handles DKIM signing per-domain automatically.
 *   Customers only interact with our platform UI - never with SES directly.
 *
 * Environment Variables:
 *   SMTP_HOST        - SMTP server hostname (required)
 *   SMTP_PORT        - Port (default: 587)
 *   SMTP_USER        - Auth username
 *   SMTP_PASS        - Auth password
 *   SMTP_SECURE      - Use TLS (true/false, default: false → STARTTLS)
 *   SMTP_POOL_SIZE   - Max connections in pool (default: 5)
 *   EMAIL_FROM       - Platform default From address
 *   EMAIL_FROM_NAME  - Platform default From display name
 *   DKIM_DOMAIN      - DKIM signing domain (non-SES SMTP only)
 *   DKIM_SELECTOR    - DKIM selector (default: 'lifecycleos')
 *   DKIM_PRIVATE_KEY - DKIM private key PEM (non-SES SMTP only)
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
    /**
     * Whether this transport connects to Amazon SES.
     * When true, local DKIM signing is suppressed - SES handles DKIM signing
     * automatically for all verified domain identities.
     */
    isSesSmtp: boolean;
    /**
     * Local DKIM signing config - only used when isSesSmtp is false
     * (e.g. self-hosted Postfix, another SMTP relay, local development).
     */
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

    // Detect SES SMTP backend: suppress local DKIM when SES handles it
    const isSesSmtp = host.includes('amazonaws.com') || host.includes('email-smtp');

    const dkimDomain = process.env.DKIM_DOMAIN;
    const dkimSelector = process.env.DKIM_SELECTOR ?? 'lifecycleos';
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
        isSesSmtp,
        // Only configure local DKIM for non-SES SMTP providers
        dkim:
            !isSesSmtp && dkimDomain && dkimKey
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
        `(pool=${config.poolSize}, ses=${config.isSesSmtp}, dkim=${config.isSesSmtp ? 'ses-managed' : !!config.dkim})`,
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
