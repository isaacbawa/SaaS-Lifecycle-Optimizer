/* ═══════════════════════════════════════════════════════════════════════
 * Rate Limiter — DB-backed fixed-window rate limiting
 *
 * Uses the rateLimitBuckets table so limits are shared across
 * serverless instances and survive cold starts.
 * Falls back to in-memory if DB is unavailable.
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq, sql, lt } from 'drizzle-orm';

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

/* ── Rate Limiter Store ──────────────────────────────────────────────── */

// In-memory fallback for when DB is unavailable
interface WindowEntry {
    count: number;
    windowStart: number;
}

const fallbackKey = '__lifecycleos_rate_limits_fallback__';
const fallbackRef = globalThis as unknown as Record<string, Map<string, WindowEntry>>;
if (!fallbackRef[fallbackKey]) {
    fallbackRef[fallbackKey] = new Map<string, WindowEntry>();
}
const fallbackWindows: Map<string, WindowEntry> = fallbackRef[fallbackKey];

/* ── Periodic Cleanup ────────────────────────────────────────────────── */

let lastDbCleanup = Date.now();
const DB_CLEANUP_INTERVAL = 300_000; // 5 minutes

async function cleanupExpiredBuckets(): Promise<void> {
    const now = Date.now();
    if (now - lastDbCleanup < DB_CLEANUP_INTERVAL) return;
    lastDbCleanup = now;

    try {
        const cutoff = new Date(now - DB_CLEANUP_INTERVAL * 2);
        await db.delete(schema.rateLimitBuckets).where(lt(schema.rateLimitBuckets.windowStart, cutoff));
    } catch {
        // Non-critical cleanup failure
    }

    // Also clean fallback
    for (const [key, entry] of fallbackWindows) {
        if (now - entry.windowStart > DB_CLEANUP_INTERVAL * 2) {
            fallbackWindows.delete(key);
        }
    }
}

/* ── Core Rate Check ─────────────────────────────────────────────────── */

/**
 * Check rate limit for a given key + route tier.
 * Uses DB for shared state across instances. Falls back to in-memory.
 */
export async function checkRateLimit(
    apiKeyId: string,
    tier: keyof typeof RATE_LIMITS,
    config?: RateLimitConfig,
): Promise<RateLimitResult> {
    void cleanupExpiredBuckets();

    const limits = config ?? RATE_LIMITS[tier];
    const bucketKey = `${apiKeyId}:${tier}`;
    const now = Date.now();

    try {
        // Try DB-backed rate limiting via upsert
        const windowStart = new Date(now);
        const windowEnd = now + limits.windowMs;
        const resetAt = Math.ceil(windowEnd / 1000);

        // Upsert: increment if window is still active, reset if expired
        const [result] = await db
            .insert(schema.rateLimitBuckets)
            .values({
                bucketKey,
                requestCount: 1,
                windowStart,
                windowMs: limits.windowMs,
            })
            .onConflictDoUpdate({
                target: schema.rateLimitBuckets.bucketKey,
                set: {
                    requestCount: sql`CASE
                        WHEN ${schema.rateLimitBuckets.windowStart} + (${schema.rateLimitBuckets.windowMs} || ' milliseconds')::interval <= now()
                        THEN 1
                        ELSE ${schema.rateLimitBuckets.requestCount} + 1
                    END`,
                    windowStart: sql`CASE
                        WHEN ${schema.rateLimitBuckets.windowStart} + (${schema.rateLimitBuckets.windowMs} || ' milliseconds')::interval <= now()
                        THEN now()
                        ELSE ${schema.rateLimitBuckets.windowStart}
                    END`,
                },
            })
            .returning({
                requestCount: schema.rateLimitBuckets.requestCount,
                windowStart: schema.rateLimitBuckets.windowStart,
            });

        const dbWindowEnd = result.windowStart.getTime() + limits.windowMs;
        const dbResetAt = Math.ceil(dbWindowEnd / 1000);
        const retryAfterMs = Math.max(0, dbWindowEnd - Date.now());

        if (result.requestCount > limits.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                limit: limits.maxRequests,
                resetAt: dbResetAt,
                retryAfterMs,
            };
        }

        return {
            allowed: true,
            remaining: Math.max(0, limits.maxRequests - result.requestCount),
            limit: limits.maxRequests,
            resetAt: dbResetAt,
            retryAfterMs,
        };
    } catch (err) {
        // Fallback to in-memory if DB fails — log for visibility
        console.warn(
            `[rate-limit] DB rate-limit check failed for ${bucketKey}, falling back to in-memory:`,
            (err as Error).message,
        );
        return checkRateLimitFallback(bucketKey, limits, now);
    }
}

/** In-memory fallback when DB is unavailable */
function checkRateLimitFallback(
    bucketKey: string,
    limits: RateLimitConfig,
    now: number,
): RateLimitResult {
    let entry = fallbackWindows.get(bucketKey);

    if (!entry || now - entry.windowStart >= limits.windowMs) {
        entry = { count: 0, windowStart: now };
        fallbackWindows.set(bucketKey, entry);
    }

    const windowEnd = entry.windowStart + limits.windowMs;
    const resetAt = Math.ceil(windowEnd / 1000);
    const retryAfterMs = Math.max(0, windowEnd - now);

    entry.count += 1;

    if (entry.count > limits.maxRequests) {
        return { allowed: false, remaining: 0, limit: limits.maxRequests, resetAt, retryAfterMs };
    }

    return {
        allowed: true,
        remaining: Math.max(0, limits.maxRequests - entry.count),
        limit: limits.maxRequests,
        resetAt,
        retryAfterMs,
    };
}

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
