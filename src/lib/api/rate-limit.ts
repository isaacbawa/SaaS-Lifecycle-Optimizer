/* ═══════════════════════════════════════════════════════════════════════
 * Rate Limiter — Sliding-window per-key rate limiting
 *
 * Uses a fixed-window algorithm with sub-second precision.
 * Each API key gets its own bucket. Configurable per-route limits.
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';

export interface RateLimitConfig {
    /** Maximum requests per window */
    maxRequests: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    /** Requests remaining in current window */
    remaining: number;
    /** Total limit for this window */
    limit: number;
    /** Unix timestamp (seconds) when window resets */
    resetAt: number;
    /** Milliseconds until reset */
    retryAfterMs: number;
}

interface WindowEntry {
    count: number;
    windowStart: number;
}

/* ── Default Tier Limits ─────────────────────────────────────────────── */

export const RATE_LIMITS = {
    /** Standard API calls (identify, group, users, accounts, flows, analytics) */
    standard: { maxRequests: 100, windowMs: 60_000 } as RateLimitConfig,
    /** Event ingestion (higher throughput) */
    events: { maxRequests: 500, windowMs: 60_000 } as RateLimitConfig,
    /** Analysis endpoints (computationally expensive) */
    analysis: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
    /** Key management (low volume, high sensitivity) */
    keys: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
    /** Webhook management */
    webhooks: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
    /** Health check (generous) */
    health: { maxRequests: 300, windowMs: 60_000 } as RateLimitConfig,
} as const;

/* ── Rate Limiter Store ──────────────────────────────────────────────── */

// Persist across HMR in development
const globalKey = '__lifecycleos_rate_limits__';
const globalRef = globalThis as unknown as Record<string, Map<string, WindowEntry>>;
if (!globalRef[globalKey]) {
    globalRef[globalKey] = new Map<string, WindowEntry>();
}
const windows: Map<string, WindowEntry> = globalRef[globalKey];

/* ── Periodic Cleanup ────────────────────────────────────────────────── */

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 120_000; // 2 minutes

function cleanupExpired(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of windows) {
        // Remove entries for windows that expired more than 2 windows ago
        if (now - entry.windowStart > CLEANUP_INTERVAL * 2) {
            windows.delete(key);
        }
    }
}

/* ── Core Rate Check ─────────────────────────────────────────────────── */

/**
 * Check rate limit for a given key + route tier.
 *
 * @param apiKeyId  - The authenticated API key ID
 * @param tier      - The rate limit tier name (determines limits)
 * @param config    - Override config (optional)
 * @returns RateLimitResult with allowed status and header values
 */
export function checkRateLimit(
    apiKeyId: string,
    tier: keyof typeof RATE_LIMITS,
    config?: RateLimitConfig,
): RateLimitResult {
    cleanupExpired();

    const limits = config ?? RATE_LIMITS[tier];
    const bucketKey = `${apiKeyId}:${tier}`;
    const now = Date.now();

    let entry = windows.get(bucketKey);

    // If no entry or window expired, create a new window
    if (!entry || now - entry.windowStart >= limits.windowMs) {
        entry = { count: 0, windowStart: now };
        windows.set(bucketKey, entry);
    }

    const windowEnd = entry.windowStart + limits.windowMs;
    const resetAt = Math.ceil(windowEnd / 1000);
    const retryAfterMs = Math.max(0, windowEnd - now);

    entry.count += 1;

    if (entry.count > limits.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            limit: limits.maxRequests,
            resetAt,
            retryAfterMs,
        };
    }

    return {
        allowed: true,
        remaining: Math.max(0, limits.maxRequests - entry.count),
        limit: limits.maxRequests,
        resetAt,
        retryAfterMs,
    };
}

/* ── Response Headers Helper ─────────────────────────────────────────── */

/**
 * Apply standard rate-limit headers to a Response.
 */
export function applyRateLimitHeaders(
    response: Response,
    result: RateLimitResult,
): Response {
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(result.limit));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    headers.set('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
        headers.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
    }

    return new Response(response.body, {
        status: result.allowed ? response.status : 429,
        statusText: result.allowed ? response.statusText : 'Too Many Requests',
        headers,
    });
}

/**
 * Build a 429 JSON error response with rate limit headers.
 */
export function rateLimitExceeded(result: RateLimitResult): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded. Try again in ${Math.ceil(result.retryAfterMs / 1000)} seconds.`,
                retryAfterMs: result.retryAfterMs,
            },
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        },
        {
            status: 429,
            statusText: 'Too Many Requests',
            headers: {
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(result.resetAt),
                'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
            },
        },
    );
}
