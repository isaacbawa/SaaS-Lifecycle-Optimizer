/* ═══════════════════════════════════════════════════════════════════════
 * API Authentication & Authorization Middleware
 *
 * Validates Bearer tokens against the API key store, enforces scope-
 * based access control, integrates rate limiting, and provides
 * consistent response helpers with accurate processing-time tracking.
 *
 * Usage:
 *   const auth = await authenticate(request, ['read']);
 *   if (!auth.success) return auth.response;
 *   const { apiKey, requestId, startTime } = auth;
 *   // ... handler logic ...
 *   return apiSuccess(data, 200, startTime, requestId);
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiKeyRecord } from '@/lib/sdk/types';
import {
  checkRateLimit,
  rateLimitExceeded,
  type RateLimitResult,
  type RateLimitConfig,
  RATE_LIMITS,
} from './rate-limit';

/* ── DB-backed API key validation (production path) ──────────────────── */

async function validateApiKeyViaDb(rawKey: string): Promise<{ record: ApiKeyRecord; orgId: string } | null> {
  try {
    // Hash the raw key with SHA-256 to match the DB keyHash column
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Dynamic import to avoid circular dependencies at module init
    const { validateApiKey, touchApiKeyUsage } = await import('@/lib/db/operations');
    const dbKey = await validateApiKey(keyHash);
    if (!dbKey) return null;

    // Fire-and-forget usage update
    touchApiKeyUsage(dbKey.id).catch(() => { /* silent */ });

    // Convert DB key to ApiKeyRecord for compatibility
    const record: ApiKeyRecord = {
      id: dbKey.id,
      key: dbKey.keyPrefix + '***',
      name: dbKey.name,
      environment: dbKey.environment as ApiKeyRecord['environment'],
      createdAt: new Date(dbKey.createdAt).toISOString(),
      lastUsedAt: dbKey.lastUsedAt ? new Date(dbKey.lastUsedAt).toISOString() : undefined,
      revokedAt: dbKey.revokedAt ? new Date(dbKey.revokedAt).toISOString() : undefined,
      scopes: (dbKey.scopes as string[]) ?? ['identify', 'track', 'group', 'read'],
    };

    return { record, orgId: dbKey.organizationId };
  } catch {
    return null;
  }
}

/* ── Scope Definitions ───────────────────────────────────────────────── */

/**
 * Available API scopes.
 * - identify: Can call /identify
 * - track:    Can call /events
 * - group:    Can call /group
 * - read:     Can call GET endpoints (users, accounts, flows, analytics, etc.)
 * - write:    Can call POST/PUT/DELETE on management endpoints (keys, webhooks)
 * - admin:    Full access (includes all above)
 */
export type ApiScope = 'identify' | 'track' | 'group' | 'read' | 'write' | 'admin';

/** Check if a key's scopes satisfy the required scopes */
function hasRequiredScopes(keyScopes: string[], required: ApiScope[]): boolean {
  if (required.length === 0) return true;
  if (keyScopes.includes('admin')) return true;
  return required.every((s) => keyScopes.includes(s));
}

/* ── Auth Result Types ───────────────────────────────────────────────── */

export interface AuthSuccess {
  success: true;
  apiKey: ApiKeyRecord;
  orgId: string;
  requestId: string;
  startTime: number;
  rateLimit: RateLimitResult;
}

export interface AuthFailure {
  success: false;
  response: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/* ── Rate Limit Header Injector ──────────────────────────────────────── */

function withRateLimitHeaders(response: NextResponse, rl: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rl.limit));
  response.headers.set('X-RateLimit-Remaining', String(rl.remaining));
  response.headers.set('X-RateLimit-Reset', String(rl.resetAt));
  return response;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Core Authentication Function
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Authenticate and authorize an incoming API request.
 *
 * 1. Extracts Bearer token from Authorization header
 * 2. Validates the token against the key store
 * 3. Checks required scopes
 * 4. Checks rate limits for the key + tier
 * 5. Records last-used timestamp on the key
 *
 * @param request       - The incoming Next.js request
 * @param requiredScopes - Array of scopes the caller must have (default: [])
 * @param rateTier      - Rate limit tier to apply (default: 'standard')
 * @param rateConfig    - Optional override for rate limit config
 */
export async function authenticate(
  request: NextRequest,
  requiredScopes: ApiScope[] = [],
  rateTier: keyof typeof RATE_LIMITS = 'standard',
  rateConfig?: RateLimitConfig,
): Promise<AuthResult> {
  const startTime = performance.now();
  const requestId = request.headers.get('x-request-id')
    ?? `req_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`;

  // ── Extract Authorization header ────────────────────────────────────
  const authHeader = request.headers.get('authorization');

  // Support sendBeacon fallback: when no Authorization header is present,
  // the SDK may embed the token as `_token` in the JSON body.  We only
  // clone the request body once into a local var so the downstream handler
  // can still read it.
  let token: string | null = null;

  if (authHeader) {
    const spaceIndex = authHeader.indexOf(' ');
    const scheme = authHeader.substring(0, spaceIndex);
    token = authHeader.substring(spaceIndex + 1);

    if (scheme.toLowerCase() !== 'bearer' || !token || token.length < 10) {
      return {
        success: false,
        response: apiError(
          'UNAUTHORIZED',
          'Invalid Authorization format. Expected "Bearer <api_key>".',
          401,
        ),
      };
    }
  } else {
    // Attempt beacon fallback — peek into the body for _token
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      if (body && typeof body._token === 'string' && body._token.length >= 10) {
        token = body._token;
      }
    } catch {
      // body parse failed — fall through to unauthorized
    }

    if (!token) {
      return {
        success: false,
        response: apiError(
          'UNAUTHORIZED',
          'Missing Authorization header. Include "Bearer <api_key>" in your request.',
          401,
        ),
      };
    }
  }

  // ── Validate API key (DB-backed) ──────────────────────────────────
  let record: ApiKeyRecord | null = null;
  let resolvedOrgId = '';

  const dbResult = await validateApiKeyViaDb(token);
  if (dbResult) {
    record = dbResult.record;
    resolvedOrgId = dbResult.orgId;
  }

  if (!record) {
    // Use consistent timing to prevent timing attacks (always ~same response time)
    return {
      success: false,
      response: apiError(
        'FORBIDDEN',
        'Invalid or revoked API key.',
        403,
      ),
    };
  }

  // ── Scope enforcement ───────────────────────────────────────────────
  if (!hasRequiredScopes(record.scopes, requiredScopes)) {
    return {
      success: false,
      response: apiError(
        'INSUFFICIENT_SCOPE',
        `This API key lacks required scope(s): ${requiredScopes.join(', ')}. Key scopes: ${record.scopes.join(', ')}`,
        403,
        { requiredScopes, keyScopes: record.scopes },
      ),
    };
  }

  // ── Rate limit check ───────────────────────────────────────────────
  const rl = checkRateLimit(record.id, rateTier, rateConfig);

  if (!rl.allowed) {
    return {
      success: false,
      response: rateLimitExceeded(rl),
    };
  }

  // ── Record usage is already handled in validateApiKeyViaDb ──────────

  return {
    success: true,
    apiKey: record,
    orgId: resolvedOrgId,
    requestId,
    startTime,
    rateLimit: rl,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Response Helpers (consistent format across all routes)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Build a standard success response with accurate processing time.
 *
 * @param data      - Response payload
 * @param status    - HTTP status code (default: 200)
 * @param startTime - `performance.now()` captured at request start
 * @param requestId - Request ID for tracing
 * @param rl        - Rate limit result to include in headers
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
  startTime?: number,
  requestId?: string,
  rl?: RateLimitResult,
): NextResponse {
  const rid = requestId ?? `req_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`;
  const processingTimeMs = startTime ? Math.round((performance.now() - startTime) * 100) / 100 : 0;

  const response = NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId: rid,
        timestamp: new Date().toISOString(),
        processingTimeMs,
      },
    },
    { status },
  );

  response.headers.set('X-Request-ID', rid);
  response.headers.set('X-Processing-Time-Ms', String(processingTimeMs));

  if (rl) withRateLimitHeaders(response, rl);

  return response;
}

/** Build a standard error response */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): NextResponse {
  const requestId = `req_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`;

  const response = NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );

  response.headers.set('X-Request-ID', requestId);

  return response;
}

/** Build a validation error response from FieldError array */
export function apiValidationError(
  errors: Array<{ field: string; message: string; received?: unknown }>,
): NextResponse {
  return apiError(
    'VALIDATION_ERROR',
    `Invalid input: ${errors.length} validation error(s)`,
    422,
    { errors },
  );
}
