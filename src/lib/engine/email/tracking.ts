/* ═══════════════════════════════════════════════════════════════════════
 * Email Tracking — Open & Click Tracking Infrastructure
 *
 * Generates tracking artifacts embedded into outgoing emails:
 *   • Open tracking pixel (1x1 transparent GIF served via API route)
 *   • Click tracking (wraps links through redirect endpoint)
 *   • Unsubscribe header & link (RFC 8058 List-Unsubscribe)
 *
 * Tracking data is stored in-memory for real-time metrics,
 * keyed by messageId for correlation with send records.
 *
 * API Routes that serve these are in:
 *   /api/v1/email/track — pixel + click handler
 *   /api/v1/email/unsubscribe — one-click unsubscribe
 * ═══════════════════════════════════════════════════════════════════════ */

import { createHmac } from 'crypto';

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

// 1x1 transparent GIF (43 bytes)
export const TRACKING_PIXEL_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
);

/* ── Tracking Store (Singleton) ─────────────────────────────────────── */

const globalKey = '__lifecycleos_tracking_store__';
const MAX_TRACKING_EVENTS = 50_000;

interface TrackingStore {
    events: TrackingEvent[];
    uniqueOpens: Set<string>; // Set of "messageId:email"
    uniqueClicks: Set<string>; // Set of "messageId:url"
}

function getStore(): TrackingStore {
    const g = globalThis as unknown as Record<string, TrackingStore>;
    if (!g[globalKey]) {
        g[globalKey] = {
            events: [],
            uniqueOpens: new Set(),
            uniqueClicks: new Set(),
        };
    }
    return g[globalKey];
}

/* ═══════════════════════════════════════════════════════════════════════
 * Token Generation (HMAC-signed for tamper resistance)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Generate an HMAC-signed tracking token.
 * Contains: messageId, recipientEmail, optional data.
 */
export function generateTrackingToken(data: {
    messageId: string;
    email: string;
    campaignId?: string;
    type: 'open' | 'click' | 'unsub';
    url?: string; // For click tracking
}): string {
    const payload = JSON.stringify(data);
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = createHmac('sha256', TRACKING_SECRET)
        .update(encoded)
        .digest('base64url')
        .slice(0, 16); // Truncate for URL friendliness

    return `${encoded}.${signature}`;
}

/**
 * Verify and decode a tracking token.
 * Returns null if signature is invalid.
 */
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

    // Constant-time compare
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

/**
 * Generate the tracking pixel URL for open tracking.
 */
export function getOpenTrackingPixelUrl(
    messageId: string,
    email: string,
    campaignId?: string,
): string {
    const token = generateTrackingToken({
        messageId,
        email,
        campaignId,
        type: 'open',
    });
    return `${APP_URL}/api/v1/email/track?t=${token}`;
}

/**
 * Generate a click tracking redirect URL.
 */
export function getClickTrackingUrl(
    messageId: string,
    email: string,
    originalUrl: string,
    campaignId?: string,
): string {
    const token = generateTrackingToken({
        messageId,
        email,
        campaignId,
        type: 'click',
        url: originalUrl,
    });
    return `${APP_URL}/api/v1/email/track?t=${token}`;
}

/**
 * Generate a one-click unsubscribe URL (RFC 8058).
 */
export function getUnsubscribeUrl(
    messageId: string,
    email: string,
    campaignId?: string,
): string {
    const token = generateTrackingToken({
        messageId,
        email,
        campaignId,
        type: 'unsub',
    });
    return `${APP_URL}/api/v1/email/unsubscribe?t=${token}`;
}

/* ═══════════════════════════════════════════════════════════════════════
 * HTML Injection — Add Tracking to Email HTML
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Inject open tracking pixel and wrap links for click tracking.
 * Also adds unsubscribe link if not already present.
 */
export function injectTracking(
    html: string,
    messageId: string,
    email: string,
    campaignId?: string,
): string {
    let tracked = html;

    // 1. Wrap all <a href="..."> links for click tracking
    tracked = tracked.replace(
        /<a\s([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
        (_match, pre: string, url: string, post: string) => {
            // Don't track mailto, tel, or already-tracked links
            if (
                url.startsWith('mailto:') ||
                url.startsWith('tel:') ||
                url.includes('/api/v1/email/track') ||
                url.startsWith('#')
            ) {
                return `<a ${pre}href="${url}"${post}>`;
            }

            const trackUrl = getClickTrackingUrl(messageId, email, url, campaignId);
            return `<a ${pre}href="${trackUrl}"${post}>`;
        },
    );

    // 2. Inject open tracking pixel before </body> or at end
    const pixelUrl = getOpenTrackingPixelUrl(messageId, email, campaignId);
    const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;

    if (tracked.includes('</body>')) {
        tracked = tracked.replace('</body>', `${pixelTag}</body>`);
    } else {
        tracked += pixelTag;
    }

    // 3. Add unsubscribe footer if not present
    if (!tracked.includes('unsubscribe') && !tracked.includes('Unsubscribe')) {
        const unsubUrl = getUnsubscribeUrl(messageId, email, campaignId);
        const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
  <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
</div>`;
        if (tracked.includes('</body>')) {
            tracked = tracked.replace('</body>', `${footer}</body>`);
        } else {
            tracked += footer;
        }
    }

    return tracked;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Event Recording
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Record a tracking event (open, click, unsubscribe).
 */
export function recordTrackingEvent(event: TrackingEvent): void {
    const store = getStore();

    // Ring buffer behavior
    if (store.events.length >= MAX_TRACKING_EVENTS) {
        store.events.splice(0, Math.floor(MAX_TRACKING_EVENTS * 0.1));
    }

    store.events.push(event);

    const key = `${event.messageId}:${event.recipientEmail}`;
    if (event.type === 'open') {
        store.uniqueOpens.add(key);
    } else if (event.type === 'click') {
        const clickKey = `${key}:${(event.metadata?.url as string) ?? ''}`;
        store.uniqueClicks.add(clickKey);
    }
}

/**
 * Get tracking stats for a specific campaign.
 */
export function getCampaignTrackingStats(campaignId: string): TrackingStats {
    const store = getStore();
    const events = store.events.filter((e) => e.campaignId === campaignId);

    const opens = events.filter((e) => e.type === 'open');
    const clicks = events.filter((e) => e.type === 'click');
    const unsubs = events.filter((e) => e.type === 'unsubscribe');

    const uniqueOpenSet = new Set(opens.map((e) => `${e.messageId}:${e.recipientEmail}`));
    const uniqueClickSet = new Set(clicks.map((e) => `${e.messageId}:${e.recipientEmail}`));

    return {
        totalOpens: opens.length,
        uniqueOpens: uniqueOpenSet.size,
        totalClicks: clicks.length,
        uniqueClicks: uniqueClickSet.size,
        unsubscribes: unsubs.length,
    };
}

/**
 * Get tracking stats for a specific message.
 */
export function getMessageTrackingStats(messageId: string): TrackingStats {
    const store = getStore();
    const events = store.events.filter((e) => e.messageId === messageId);

    return {
        totalOpens: events.filter((e) => e.type === 'open').length,
        uniqueOpens: events.filter((e) => e.type === 'open').length > 0 ? 1 : 0,
        totalClicks: events.filter((e) => e.type === 'click').length,
        uniqueClicks: new Set(
            events
                .filter((e) => e.type === 'click')
                .map((e) => (e.metadata?.url as string) ?? ''),
        ).size,
        unsubscribes: events.filter((e) => e.type === 'unsubscribe').length,
    };
}

/**
 * Get all tracking events (for admin view).
 */
export function getTrackingEvents(limit = 100, offset = 0): TrackingEvent[] {
    const store = getStore();
    return store.events.slice(-limit - offset, store.events.length - offset);
}

/**
 * Get RFC 8058 List-Unsubscribe headers.
 */
export function getUnsubscribeHeaders(
    messageId: string,
    email: string,
    campaignId?: string,
): Record<string, string> {
    const unsubUrl = getUnsubscribeUrl(messageId, email, campaignId);
    return {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
}
