/* ==========================================================================
 * GET  /api/v1/keys — List API keys (secrets partially masked)
 * POST /api/v1/keys — Create a new API key
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateKeyCreate } from '@/lib/api/validation';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'keys');
  if (!auth.success) return auth.response;

  const keys = await store.getApiKeys();

  // Mask key value (show first 10 chars + last 4)
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.substring(0, 10) + '••••••••••' + k.key.substring(k.key.length - 4),
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

  // ── Parse & validate ──────────────────────────────────────────
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
  const key = await store.createApiKey(name, environment, scopes);

  // Return the full key ONCE — after this it's only available masked
  return apiSuccess(
    { key },
    201,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
