/* ==========================================================================
 * DELETE /api/v1/keys/[id] — Revoke an API key (with self-revocation guard)
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError } from '@/lib/api/auth';
import { store } from '@/lib/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'keys');
  if (!auth.success) return auth.response;

  const { id } = await context.params;

  // Guard: prevent revoking the key currently being used for this request
  if (auth.apiKey.id === id) {
    return apiError(
      'SELF_REVOCATION',
      'Cannot revoke the API key that is authenticating this request.',
      409,
    );
  }

  const revoked = await store.revokeApiKey(id);

  if (!revoked) {
    return apiError('NOT_FOUND', `API key "${id}" not found.`, 404);
  }

  return apiSuccess(
    { revoked: true },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
