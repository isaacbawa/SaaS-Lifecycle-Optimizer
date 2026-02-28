/* ==========================================================================
 * GET  /api/v1/keys — List API keys (secrets partially masked)
 * POST /api/v1/keys — Create a new API key
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateKeyCreate } from '@/lib/api/validation';
import { getApiKeysByOrg, createApiKey } from '@/lib/db/operations';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'keys');
  if (!auth.success) return auth.response;

  const keys = await getApiKeysByOrg(auth.orgId);

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

  return apiSuccess(
    { keys: masked },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request, ['write'], 'keys');
  if (!auth.success) return auth.response;

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
    organizationId: auth.orgId,
    name,
    environment: environment as 'development' | 'staging' | 'production',
    keyHash,
    keyPrefix: rawKey.substring(0, 12),
    scopes: scopes ?? ['identify', 'track', 'group', 'read'],
  });

  // Return the full raw key ONCE — after this it's only available as prefix
  return apiSuccess(
    {
      key: {
        id: dbKey.id,
        key: rawKey,
        name: dbKey.name,
        environment: dbKey.environment,
        scopes: dbKey.scopes,
        createdAt: dbKey.createdAt,
      },
    },
    201,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
