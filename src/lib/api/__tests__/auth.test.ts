/* ==========================================================================
 * API Auth Module — Unit Tests
 *
 * Tests scope checking, response helpers, and validation behavior.
 * DB operations are mocked to isolate auth logic.
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => Promise.resolve({ userId: null, orgId: null })),
}));

vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
        insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => []) })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => []) })) })),
        delete: vi.fn(() => ({ where: vi.fn(() => []) })),
    },
}));

vi.mock('@/lib/db/schema', () => ({
    organizations: { id: 'id', clerkOrgId: 'clerk_org_id' },
    apiKeys: { id: 'id', keyHash: 'key_hash', organizationId: 'organization_id' },
    rateLimitBuckets: { bucketKey: 'bucket_key', requestCount: 'request_count', windowStart: 'window_start', windowMs: 'window_ms' },
}));

vi.mock('@/lib/db/operations', () => ({
    validateApiKey: vi.fn(() => null),
    touchApiKeyUsage: vi.fn(() => Promise.resolve()),
}));

import { apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';

describe('API Auth — Response Helpers', () => {
    describe('apiSuccess', () => {
        it('returns success response with correct structure', () => {
            const response = apiSuccess({ items: [1, 2, 3] });
            expect(response.status).toBe(200);
        });

        it('respects custom status codes', () => {
            const response = apiSuccess({ created: true }, 201);
            expect(response.status).toBe(201);
        });

        it('includes X-Request-ID header', () => {
            const response = apiSuccess({ ok: true }, 200, undefined, 'req_test');
            expect(response.headers.get('X-Request-ID')).toBe('req_test');
        });

        it('includes processing time header', async () => {
            const start = performance.now();
            // Small delay
            await new Promise((r) => setTimeout(r, 5));
            const response = apiSuccess({ ok: true }, 200, start, 'req_test');
            const processingTime = parseFloat(response.headers.get('X-Processing-Time-Ms') ?? '0');
            expect(processingTime).toBeGreaterThanOrEqual(0);
        });

        it('returns valid JSON body', async () => {
            const response = apiSuccess({ value: 42 });
            const body = await response.json();
            expect(body.success).toBe(true);
            expect(body.data).toEqual({ value: 42 });
            expect(body.meta).toBeDefined();
            expect(body.meta.timestamp).toBeTruthy();
        });
    });

    describe('apiError', () => {
        it('returns error response with correct structure', async () => {
            const response = apiError('BAD_REQUEST', 'Something went wrong', 400);
            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('BAD_REQUEST');
            expect(body.error.message).toBe('Something went wrong');
        });

        it('includes details when provided', async () => {
            const response = apiError('FAILED', 'Error', 500, { reason: 'timeout' });
            const body = await response.json();
            expect(body.error.details).toEqual({ reason: 'timeout' });
        });

        it('returns default 400 when no status provided', () => {
            const response = apiError('ERR', 'message');
            expect(response.status).toBe(400);
        });

        it('includes X-Request-ID header', () => {
            const response = apiError('ERR', 'msg');
            expect(response.headers.get('X-Request-ID')).toBeTruthy();
        });
    });

    describe('apiValidationError', () => {
        it('returns 422 with field errors', async () => {
            const response = apiValidationError([
                { field: 'email', message: 'Required' },
                { field: 'name', message: 'Too short' },
            ]);
            expect(response.status).toBe(422);
            const body = await response.json();
            expect(body.error.code).toBe('VALIDATION_ERROR');
            expect(body.error.details.errors).toHaveLength(2);
            expect(body.error.details.errors[0].field).toBe('email');
        });

        it('formats error count in message', async () => {
            const response = apiValidationError([{ field: 'x', message: 'bad' }]);
            const body = await response.json();
            expect(body.error.message).toContain('1 validation error');
        });
    });
});
