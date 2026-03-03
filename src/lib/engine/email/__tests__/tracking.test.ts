/* ==========================================================================
 * Email Tracking — Unit Tests
 *
 * Tests the pure (non-DB) portions of the tracking module:
 *   - HMAC token generation and verification
 *   - URL generation for open/click/unsubscribe
 *   - HTML injection
 *   - Tamper detection
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB module so the tracking module can be imported
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
        insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => []) })) })),
    },
}));

vi.mock('@/lib/db/schema', () => ({
    organizations: { id: 'id' },
    emailTrackingEvents: {
        id: 'id',
        orgId: 'org_id',
        messageId: 'message_id',
        type: 'type',
        recipientEmail: 'recipient_email',
        campaignId: 'campaign_id',
        metadata: 'metadata',
    },
}));

import {
    generateTrackingToken,
    verifyTrackingToken,
    getOpenTrackingPixelUrl,
    getClickTrackingUrl,
    getUnsubscribeUrl,
    injectTracking,
    getUnsubscribeHeaders,
    TRACKING_PIXEL_GIF,
} from '@/lib/engine/email/tracking';

describe('Email Tracking — Token Generation & Verification', () => {
    const basePayload = {
        messageId: 'msg_test123',
        email: 'user@example.com',
        campaignId: 'camp_001',
        type: 'open' as const,
    };

    it('generates a non-empty token string', () => {
        const token = generateTrackingToken(basePayload);
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
    });

    it('token has format: base64url.signature', () => {
        const token = generateTrackingToken(basePayload);
        const parts = token.split('.');
        expect(parts).toHaveLength(2);
        expect(parts[0].length).toBeGreaterThan(0);
        expect(parts[1].length).toBe(16);
    });

    it('verifies a valid token and returns the original payload', () => {
        const token = generateTrackingToken(basePayload);
        const result = verifyTrackingToken(token);
        expect(result).not.toBeNull();
        expect(result!.messageId).toBe(basePayload.messageId);
        expect(result!.email).toBe(basePayload.email);
        expect(result!.campaignId).toBe(basePayload.campaignId);
        expect(result!.type).toBe(basePayload.type);
    });

    it('rejects a tampered token payload', () => {
        const token = generateTrackingToken(basePayload);
        const [encoded, sig] = token.split('.');
        // Tamper with the payload
        const tampered = encoded.slice(0, -1) + 'X';
        const result = verifyTrackingToken(`${tampered}.${sig}`);
        expect(result).toBeNull();
    });

    it('rejects a tampered signature', () => {
        const token = generateTrackingToken(basePayload);
        const [encoded] = token.split('.');
        const result = verifyTrackingToken(`${encoded}.AAAAAAAAAAAAAAAA`);
        expect(result).toBeNull();
    });

    it('rejects tokens with wrong format', () => {
        expect(verifyTrackingToken('')).toBeNull();
        expect(verifyTrackingToken('single-segment')).toBeNull();
        expect(verifyTrackingToken('a.b.c')).toBeNull();
    });

    it('includes url in click tracking tokens', () => {
        const payload = { ...basePayload, type: 'click' as const, url: 'https://example.com/page' };
        const token = generateTrackingToken(payload);
        const result = verifyTrackingToken(token);
        expect(result!.url).toBe('https://example.com/page');
    });
});

describe('Email Tracking — URL Generation', () => {
    it('generates open tracking pixel URL', () => {
        const url = getOpenTrackingPixelUrl('msg_1', 'user@test.com', 'camp_1');
        expect(url).toContain('/api/v1/email/track?t=');
        expect(url).toContain('http');
    });

    it('generates click tracking URL', () => {
        const url = getClickTrackingUrl('msg_1', 'user@test.com', 'https://example.com', 'camp_1');
        expect(url).toContain('/api/v1/email/track?t=');
    });

    it('generates unsubscribe URL', () => {
        const url = getUnsubscribeUrl('msg_1', 'user@test.com', 'camp_1');
        expect(url).toContain('/api/v1/email/unsubscribe?t=');
    });

    it('URLs contain valid tokens that verify correctly', () => {
        const pixelUrl = getOpenTrackingPixelUrl('msg_1', 'user@test.com', 'camp_1');
        const token = new URL(pixelUrl).searchParams.get('t');
        expect(token).toBeTruthy();
        const result = verifyTrackingToken(token!);
        expect(result).not.toBeNull();
        expect(result!.messageId).toBe('msg_1');
        expect(result!.type).toBe('open');
    });
});

describe('Email Tracking — HTML Injection', () => {
    it('injects tracking pixel into HTML', () => {
        const html = '<html><body><p>Hello</p></body></html>';
        const result = injectTracking(html, 'msg_1', 'user@test.com', 'camp_1');
        expect(result).toContain('<img');
        expect(result).toContain('/api/v1/email/track?t=');
    });

    it('rewrites links for click tracking', () => {
        const html = '<html><body><a href="https://example.com">Click</a></body></html>';
        const result = injectTracking(html, 'msg_1', 'user@test.com', 'camp_1');
        expect(result).toContain('/api/v1/email/track?t=');
        // Original link should no longer be in href
        expect(result).not.toContain('href="https://example.com"');
    });

    it('preserves mailto links without tracking', () => {
        const html = '<a href="mailto:support@example.com">Support</a>';
        const result = injectTracking(html, 'msg_1', 'user@test.com', 'camp_1');
        expect(result).toContain('mailto:support@example.com');
    });
});

describe('Email Tracking — Unsubscribe Headers', () => {
    it('returns RFC 8058 headers', () => {
        const headers = getUnsubscribeHeaders('msg_1', 'user@test.com', 'camp_1');
        expect(headers['List-Unsubscribe']).toBeTruthy();
        expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });

    it('unsubscribe header contains a valid URL', () => {
        const headers = getUnsubscribeHeaders('msg_1', 'user@test.com', 'camp_1');
        const match = headers['List-Unsubscribe'].match(/<(.+)>/);
        expect(match).not.toBeNull();
        expect(match![1]).toContain('/api/v1/email/unsubscribe');
    });
});

describe('Email Tracking — Tracking Pixel GIF', () => {
    it('is a valid 1×1 GIF', () => {
        expect(TRACKING_PIXEL_GIF).toBeInstanceOf(Buffer);
        // GIF magic bytes: 47 49 46 (G I F)
        expect(TRACKING_PIXEL_GIF[0]).toBe(0x47);
        expect(TRACKING_PIXEL_GIF[1]).toBe(0x49);
        expect(TRACKING_PIXEL_GIF[2]).toBe(0x46);
    });
});
