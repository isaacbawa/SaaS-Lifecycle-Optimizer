/* ═══════════════════════════════════════════════════════════════════════
 * Email Tracking — DB-Backed Open & Click Tracking Infrastructure
 *
 * All tracking events are persisted to PostgreSQL so they survive
 * cold starts. HMAC token generation/verification is unchanged.
 * ═══════════════════════════════════════════════════════════════════════ */

import { createHmac } from 'crypto';
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

const TRACKING_SECRET = process.env.EMAIL_TRACKING_SECRET ?? 'lcos_track_default_key_change_me';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const TRACKING_PIXEL_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
);

async function getOrgId(providedOrgId?: string): Promise<string> {
    if (providedOrgId) return providedOrgId;
    // Fallback for background processing where orgId isn't passed through
    const envOrgId = process.env.DEMO_ORG_ID;
    if (envOrgId) return envOrgId;
    return '';
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
    const signature = createHmac('sha256', TRACKING_SECRET)
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
    const expectedSig = createHmac('sha256', TRACKING_SECRET)
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
    return `${APP_URL}/api/v1/email/track?t=${token}`;
}

export function getClickTrackingUrl(messageId: string, email: string, originalUrl: string, campaignId?: string): string {
    const token = generateTrackingToken({ messageId, email, campaignId, type: 'click', url: originalUrl });
    return `${APP_URL}/api/v1/email/track?t=${token}`;
}

export function getUnsubscribeUrl(messageId: string, email: string, campaignId?: string): string {
    const token = generateTrackingToken({ messageId, email, campaignId, type: 'unsub' });
    return `${APP_URL}/api/v1/email/unsubscribe?t=${token}`;
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
    const orgId = await getOrgId();
    if (!orgId) return;

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
    const orgId = await getOrgId();
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

export async function getMessageTrackingStats(messageId: string): Promise<TrackingStats> {
    const orgId = await getOrgId();
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

export async function getTrackingEvents(limit = 100, offset = 0): Promise<TrackingEvent[]> {
    const orgId = await getOrgId();
    if (!orgId) return [];

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
