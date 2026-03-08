/* ═══════════════════════════════════════════════════════════════════════
 * Email Tracking — DB-Backed Open & Click Tracking Infrastructure
 *
 * All tracking events are persisted to PostgreSQL so they survive
 * cold starts. HMAC token generation/verification is unchanged.
 * ═══════════════════════════════════════════════════════════════════════ */

import { createHmac, createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/* ── Types ──────────────────────────────────────────────────────────── */

export type TrackingEventType = 'open' | 'click' | 'unsubscribe';

export interface TrackingEvent {
    messageId: string;
    type: TrackingEventType;
    timestamp: string;
    recipientEmail: string;
    campaignId?: string;
    metadata?: Record<string, unknown>;
}

export interface TrackingStats {
    totalOpens: number;
    uniqueOpens: number;
    totalClicks: number;
    uniqueClicks: number;
    unsubscribes: number;
}

/* ── Constants ──────────────────────────────────────────────────────── */

/**
 * Resolve the HMAC signing secret for tracking tokens.
 *
 * Priority:
 *   1. EMAIL_TRACKING_SECRET env var (recommended for production)
 *   2. Deterministic derivation from CLERK_SECRET_KEY (stable across cold starts)
 *   3. Deterministic derivation from DATABASE_URL (stable across cold starts)
 *   4. Per-instance random — logs a warning because tokens won't survive restarts
 */
function getTrackingSecret(): string {
    const explicit = process.env.EMAIL_TRACKING_SECRET;
    if (explicit) return explicit;

    // Derive a stable secret from another available secret
    const clerkKey = process.env.CLERK_SECRET_KEY;
    if (clerkKey) {
        const derived = createHmac('sha256', clerkKey)
            .update('lifecycle-os:email-tracking-secret')
            .digest('hex');
        console.warn(
            '[email-tracking] EMAIL_TRACKING_SECRET not set — derived from CLERK_SECRET_KEY. ' +
            'Set EMAIL_TRACKING_SECRET for explicit control.',
        );
        return derived;
    }

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const derived = createHash('sha256')
            .update(`lifecycle-os:email-tracking:${dbUrl}`)
            .digest('hex');
        console.warn(
            '[email-tracking] EMAIL_TRACKING_SECRET not set — derived from DATABASE_URL. ' +
            'Set EMAIL_TRACKING_SECRET for explicit control.',
        );
        return derived;
    }

    // Last resort — ephemeral per-instance random (tokens won't survive cold starts)
    console.warn(
        '[email-tracking] EMAIL_TRACKING_SECRET not set and no stable secret available. ' +
        'Using ephemeral random secret — tracking tokens will NOT survive server restarts. ' +
        'Set EMAIL_TRACKING_SECRET (openssl rand -hex 32) in production.',
    );
    return randomBytes(32).toString('hex');
}

/**
 * Resolve the application base URL for tracking endpoints.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL env var (recommended)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (auto-set by Vercel on production)
 *   3. VERCEL_URL (auto-set by Vercel on every deployment)
 *   4. Throws — no URL can be inferred
 */
function getAppUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_APP_URL;
    if (explicit) return explicit.replace(/\/+$/, '');

    const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercelProd) {
        const url = vercelProd.startsWith('http') ? vercelProd : `https://${vercelProd}`;
        console.warn(
            `[email-tracking] NEXT_PUBLIC_APP_URL not set — using VERCEL_PROJECT_PRODUCTION_URL (${url}). ` +
            'Set NEXT_PUBLIC_APP_URL for explicit control.',
        );
        return url.replace(/\/+$/, '');
    }

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
        const url = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
        console.warn(
            `[email-tracking] NEXT_PUBLIC_APP_URL not set — using VERCEL_URL (${url}). ` +
            'Set NEXT_PUBLIC_APP_URL for explicit control.',
        );
        return url.replace(/\/+$/, '');
    }

    throw new Error(
        '[email-tracking] Cannot determine application URL. Set NEXT_PUBLIC_APP_URL ' +
        '(e.g. https://app.lifecycleos.app) in your environment.',
    );
}

// Lazy-initialized to defer env-var reads until first use (allows app to boot)
let _trackingSecret: string | null = null;
let _appUrl: string | null = null;

function TRACKING_SECRET(): string {
    if (!_trackingSecret) _trackingSecret = getTrackingSecret();
    return _trackingSecret;
}

function APP_URL(): string {
    if (!_appUrl) _appUrl = getAppUrl();
    return _appUrl;
}

export const TRACKING_PIXEL_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
);

async function getOrgId(providedOrgId?: string): Promise<string> {
    if (providedOrgId) return providedOrgId;
    throw new Error(
        '[email-tracking] orgId is required for all tracking operations. ' +
        'Pass orgId through the calling context.',
    );
}

/**
 * Resolve orgId from a campaign ID by looking it up in the DB.
 * Used by public tracking endpoints that don't have auth context.
 */
export async function resolveOrgIdFromCampaign(campaignId?: string): Promise<string | null> {
    if (!campaignId) return null;
    try {
        const [campaign] = await db
            .select({ orgId: schema.emailCampaigns.organizationId })
            .from(schema.emailCampaigns)
            .where(eq(schema.emailCampaigns.id, campaignId))
            .limit(1);
        return campaign?.orgId ?? null;
    } catch {
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Token Generation (HMAC-signed for tamper resistance)
 * ═══════════════════════════════════════════════════════════════════════ */

export function generateTrackingToken(data: {
    messageId: string;
    email: string;
    campaignId?: string;
    type: 'open' | 'click' | 'unsub';
    url?: string;
}): string {
    const payload = JSON.stringify(data);
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = createHmac('sha256', TRACKING_SECRET())
        .update(encoded)
        .digest('base64url')
        .slice(0, 16);

    return `${encoded}.${signature}`;
}

export function verifyTrackingToken(token: string): {
    messageId: string;
    email: string;
    campaignId?: string;
    type: 'open' | 'click' | 'unsub';
    url?: string;
} | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expectedSig = createHmac('sha256', TRACKING_SECRET())
        .update(encoded)
        .digest('base64url')
        .slice(0, 16);

    if (signature.length !== expectedSig.length) return null;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
        mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    try {
        return JSON.parse(Buffer.from(encoded, 'base64url').toString());
    } catch {
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * URL Generation
 * ═══════════════════════════════════════════════════════════════════════ */

export function getOpenTrackingPixelUrl(messageId: string, email: string, campaignId?: string): string {
    const token = generateTrackingToken({ messageId, email, campaignId, type: 'open' });
    return `${APP_URL()}/api/v1/email/track?t=${token}`;
}

export function getClickTrackingUrl(messageId: string, email: string, originalUrl: string, campaignId?: string): string {
    const token = generateTrackingToken({ messageId, email, campaignId, type: 'click', url: originalUrl });
    return `${APP_URL()}/api/v1/email/track?t=${token}`;
}

export function getUnsubscribeUrl(messageId: string, email: string, campaignId?: string): string {
    const token = generateTrackingToken({ messageId, email, campaignId, type: 'unsub' });
    return `${APP_URL()}/api/v1/email/unsubscribe?t=${token}`;
}

/* ═══════════════════════════════════════════════════════════════════════
 * HTML Injection
 * ═══════════════════════════════════════════════════════════════════════ */

export function injectTracking(html: string, messageId: string, email: string, campaignId?: string): string {
    let tracked = html;

    tracked = tracked.replace(
        /<a\s([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
        (_match, pre: string, url: string, post: string) => {
            if (url.startsWith('mailto:') || url.startsWith('tel:') || url.includes('/api/v1/email/track') || url.startsWith('#')) {
                return `<a ${pre}href="${url}"${post}>`;
            }
            const trackUrl = getClickTrackingUrl(messageId, email, url, campaignId);
            return `<a ${pre}href="${trackUrl}"${post}>`;
        },
    );

    const pixelUrl = getOpenTrackingPixelUrl(messageId, email, campaignId);
    const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;

    if (tracked.includes('</body>')) {
        tracked = tracked.replace('</body>', `${pixelTag}</body>`);
    } else {
        tracked += pixelTag;
    }

    if (!tracked.includes('unsubscribe') && !tracked.includes('Unsubscribe')) {
        const unsubUrl = getUnsubscribeUrl(messageId, email, campaignId);
        const footer = `\n<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">\n  <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>\n</div>`;
        if (tracked.includes('</body>')) {
            tracked = tracked.replace('</body>', `${footer}</body>`);
        } else {
            tracked += footer;
        }
    }

    return tracked;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Event Recording — DB-backed
 * ═══════════════════════════════════════════════════════════════════════ */

export async function recordTrackingEvent(event: TrackingEvent): Promise<void> {
    // Resolve orgId from campaign (for public tracking endpoints)
    const orgId = await resolveOrgIdFromCampaign(event.campaignId);
    if (!orgId) {
        console.warn(`[tracking] Could not resolve orgId for tracking event (campaign: ${event.campaignId}). Event dropped.`);
        return;
    }

    try {
        await db.insert(schema.emailTrackingEvents).values({
            organizationId: orgId,
            messageId: event.messageId,
            type: event.type,
            recipientEmail: event.recipientEmail,
            campaignId: event.campaignId ?? null,
            metadata: event.metadata ?? null,
        });
    } catch (err) {
        console.error('[tracking] Failed to record event:', err);
    }
}

export async function getCampaignTrackingStats(campaignId: string): Promise<TrackingStats> {
    const orgId = await resolveOrgIdFromCampaign(campaignId);
    if (!orgId) return { totalOpens: 0, uniqueOpens: 0, totalClicks: 0, uniqueClicks: 0, unsubscribes: 0 };

    const [result] = await db.select({
        totalOpens: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'open')::int`,
        uniqueOpens: sql<number>`count(distinct ${schema.emailTrackingEvents.recipientEmail}) filter (where ${schema.emailTrackingEvents.type} = 'open')::int`,
        totalClicks: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'click')::int`,
        uniqueClicks: sql<number>`count(distinct ${schema.emailTrackingEvents.recipientEmail}) filter (where ${schema.emailTrackingEvents.type} = 'click')::int`,
        unsubscribes: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'unsubscribe')::int`,
    }).from(schema.emailTrackingEvents)
        .where(and(eq(schema.emailTrackingEvents.organizationId, orgId), eq(schema.emailTrackingEvents.campaignId, campaignId)));

    return result ?? { totalOpens: 0, uniqueOpens: 0, totalClicks: 0, uniqueClicks: 0, unsubscribes: 0 };
}

export async function getMessageTrackingStats(messageId: string, providedOrgId?: string): Promise<TrackingStats> {
    const orgId = providedOrgId ?? '';
    if (!orgId) return { totalOpens: 0, uniqueOpens: 0, totalClicks: 0, uniqueClicks: 0, unsubscribes: 0 };

    const [result] = await db.select({
        totalOpens: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'open')::int`,
        uniqueOpens: sql<number>`count(distinct ${schema.emailTrackingEvents.recipientEmail}) filter (where ${schema.emailTrackingEvents.type} = 'open')::int`,
        totalClicks: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'click')::int`,
        uniqueClicks: sql<number>`count(distinct ${schema.emailTrackingEvents.recipientEmail}) filter (where ${schema.emailTrackingEvents.type} = 'click')::int`,
        unsubscribes: sql<number>`count(*) filter (where ${schema.emailTrackingEvents.type} = 'unsubscribe')::int`,
    }).from(schema.emailTrackingEvents)
        .where(and(eq(schema.emailTrackingEvents.organizationId, orgId), eq(schema.emailTrackingEvents.messageId, messageId)));

    return result ?? { totalOpens: 0, uniqueOpens: 0, totalClicks: 0, uniqueClicks: 0, unsubscribes: 0 };
}

export async function getTrackingEvents(limit = 100, offset = 0, providedOrgId?: string): Promise<TrackingEvent[]> {
    if (!providedOrgId) return [];
    const orgId = providedOrgId;

    const events = await db.select().from(schema.emailTrackingEvents)
        .where(eq(schema.emailTrackingEvents.organizationId, orgId))
        .orderBy(schema.emailTrackingEvents.createdAt)
        .limit(limit)
        .offset(offset);

    return events.map((e) => ({ messageId: e.messageId, type: e.type, timestamp: e.createdAt.toISOString(), recipientEmail: e.recipientEmail, campaignId: e.campaignId ?? undefined, metadata: e.metadata ?? undefined }));
}

export function getUnsubscribeHeaders(messageId: string, email: string, campaignId?: string): Record<string, string> {
    const unsubUrl = getUnsubscribeUrl(messageId, email, campaignId);
    return { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}
