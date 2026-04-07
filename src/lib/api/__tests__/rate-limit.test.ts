/* ==========================================================================
 * Rate Limiter - Unit Tests
 *
 * Tests the rate limiting logic. Since the DB upsert will fail in test
 * (mocked DB throws), the fallback path exercises in-memory limiting.
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB to ensure fallback path is exercised
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(() => {
            throw new Error('DB unavailable');
        }),
        delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
    },
}));

vi.mock('@/lib/db/schema', () => ({
    rateLimitBuckets: {
        bucketKey: 'bucket_key',
        requestCount: 'request_count',
        windowStart: 'window_start',
        windowMs: 'window_ms',
    },
}));

import {
    checkRateLimit,
    RATE_LIMITS,
    rateLimitExceeded,
    applyRateLimitHeaders,
    type RateLimitResult,
} from '@/lib/api/rate-limit';

describe('Rate Limiter - In-Memory Fallback', () => {
    // Use a unique key prefix per test to avoid cross-test pollution
    let testKeyCounter = 0;
    const uniqueKey = () => `test_key_${++testKeyCounter}_${Date.now()}`;

    it('allows requests under the limit', async () => {
        const key = uniqueKey();
        const result = await checkRateLimit(key, 'standard', { maxRequests: 5, windowMs: 60000 });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
        expect(result.limit).toBe(5);
    });

    it('tracks requests correctly across multiple calls', async () => {
        const key = uniqueKey();
        const config = { maxRequests: 3, windowMs: 60000 };

        const r1 = await checkRateLimit(key, 'standard', config);
        expect(r1.remaining).toBe(2);

        const r2 = await checkRateLimit(key, 'standard', config);
        expect(r2.remaining).toBe(1);

        const r3 = await checkRateLimit(key, 'standard', config);
        expect(r3.remaining).toBe(0);
        expect(r3.allowed).toBe(true);
    });

    it('blocks requests exceeding the limit', async () => {
        const key = uniqueKey();
        const config = { maxRequests: 2, windowMs: 60000 };

        await checkRateLimit(key, 'standard', config);
        await checkRateLimit(key, 'standard', config);
        const r3 = await checkRateLimit(key, 'standard', config);

        expect(r3.allowed).toBe(false);
        expect(r3.remaining).toBe(0);
    });

    it('provides correct reset timing', async () => {
        const key = uniqueKey();
        const result = await checkRateLimit(key, 'standard', { maxRequests: 10, windowMs: 30000 });
        expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
        expect(result.retryAfterMs).toBeGreaterThan(0);
        expect(result.retryAfterMs).toBeLessThanOrEqual(30000);
    });

    it('different keys have independent limits', async () => {
        const key1 = uniqueKey();
        const key2 = uniqueKey();
        const config = { maxRequests: 1, windowMs: 60000 };

        await checkRateLimit(key1, 'standard', config);
        await checkRateLimit(key1, 'standard', config);
        const r1 = await checkRateLimit(key1, 'standard', config);

        const r2 = await checkRateLimit(key2, 'standard', config);

        expect(r1.allowed).toBe(false);
        expect(r2.allowed).toBe(true);
    });
});

describe('Rate Limiter - RATE_LIMITS Config', () => {
    it('defines all expected tiers', () => {
        expect(RATE_LIMITS.standard).toBeDefined();
        expect(RATE_LIMITS.events).toBeDefined();
        expect(RATE_LIMITS.analysis).toBeDefined();
        expect(RATE_LIMITS.keys).toBeDefined();
        expect(RATE_LIMITS.webhooks).toBeDefined();
        expect(RATE_LIMITS.health).toBeDefined();
    });

    it('events tier has higher limit than standard', () => {
        expect(RATE_LIMITS.events.maxRequests).toBeGreaterThan(RATE_LIMITS.standard.maxRequests);
    });

    it('all tiers have positive limits and windows', () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(config.maxRequests).toBeGreaterThan(0);
            expect(config.windowMs).toBeGreaterThan(0);
        }
    });
});

describe('Rate Limiter - Response Helpers', () => {
    const blockedResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        limit: 100,
        resetAt: Math.ceil(Date.now() / 1000) + 60,
        retryAfterMs: 30000,
    };

    it('rateLimitExceeded returns 429 response', async () => {
        const response = rateLimitExceeded(blockedResult);
        expect(response.status).toBe(429);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(body.error.retryAfterMs).toBe(30000);
    });

    it('rateLimitExceeded includes rate limit headers', () => {
        const response = rateLimitExceeded(blockedResult);
        expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('applyRateLimitHeaders adds headers to existing response', () => {
        const original = new Response('OK', { status: 200 });
        const allowedResult: RateLimitResult = {
            allowed: true,
            remaining: 50,
            limit: 100,
            resetAt: Math.ceil(Date.now() / 1000) + 60,
            retryAfterMs: 10000,
        };
        const withHeaders = applyRateLimitHeaders(original, allowedResult);
        expect(withHeaders.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(withHeaders.headers.get('X-RateLimit-Remaining')).toBe('50');
        expect(withHeaders.status).toBe(200);
    });

    it('applyRateLimitHeaders returns 429 when not allowed', () => {
        const original = new Response('OK', { status: 200 });
        const withHeaders = applyRateLimitHeaders(original, blockedResult);
        expect(withHeaders.status).toBe(429);
        expect(withHeaders.headers.get('Retry-After')).toBe('30');
    });
});
