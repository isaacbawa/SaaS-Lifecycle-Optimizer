/* ==========================================================================
 * GET  /api/v1/keys - List API keys (secrets partially masked)
 * POST /api/v1/keys - Create a new API key
 *
 * Supports BOTH:
 *  - Bearer token (API key) auth for external SDK/API access
 *  - Clerk session auth for dashboard (same-origin) access
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import { validateKeyCreate } from '@/lib/api/validation';
import { getApiKeysByOrg, createApiKey } from '@/lib/db/operations';

/**
 * Try Bearer token auth first; fall back to Clerk session.
 * Returns { orgId, isApi, auth? } on success.
 */
async function dualAuth(request: NextRequest, scopes: Parameters<typeof authenticate>[1], tier?: Parameters<typeof authenticate>[2]) {
  // If Authorization header is present, use Bearer token auth
  if (request.headers.get('authorization')) {
    const auth = await authenticate(request, scopes, tier);
    if (auth.success) return { orgId: auth.orgId, isApi: true as const, auth };
    return { error: auth.response };
  }
  // Otherwise try Clerk session (dashboard)
  const dash = await requireDashboardAuth();
  if (dash.success) return { orgId: dash.orgId, isApi: false as const };
  return { error: dash.response };
}

export async function GET(request: NextRequest) {
  const result = await dualAuth(request, ['read'], 'keys');
  if ('error' in result) return result.error;

  const keys = await getApiKeysByOrg(result.orgId);

  // Mask key: show prefix + masked middle + last 4 of prefix
  const masked = keys.map((k) => ({
    id: k.id,
    name: k.name,
    environment: k.environment,
    keyPrefix: k.keyPrefix,
    scopes: k.scopes,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
  }));

  if (result.isApi && result.auth) {
    return apiSuccess(
      { keys: masked },
      200,
      result.auth.startTime,
      result.auth.requestId,
      result.auth.rateLimit,
    );
  }
  // Dashboard response (simpler format)
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ success: true, data: { keys: masked } });
}

export async function POST(request: NextRequest) {
  const result = await dualAuth(request, ['write'], 'keys');
  if ('error' in result) return result.error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateKeyCreate(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { name, environment, scopes } = validation.data;

  // Generate a raw key and hash it for storage
  const rawKey = `lcos_${environment === 'production' ? 'live' : 'test'}_${crypto.randomUUID().replace(/-/g, '')}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const dbKey = await createApiKey({
    organizationId: result.orgId,
    name,
    environment: environment as 'development' | 'staging' | 'production',
    keyHash,
    keyPrefix: rawKey.substring(0, 12),
    scopes: scopes ?? ['identify', 'track', 'group', 'read'],
  });

  const keyPayload = {
    key: {
      id: dbKey.id,
      key: rawKey,
      name: dbKey.name,
      environment: dbKey.environment,
      scopes: dbKey.scopes,
      createdAt: dbKey.createdAt,
    },
  };

  if (result.isApi && result.auth) {
    return apiSuccess(keyPayload, 201, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ success: true, data: keyPayload }, { status: 201 });
}
