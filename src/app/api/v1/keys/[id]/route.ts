/* ==========================================================================
 * DELETE /api/v1/keys/[id] — Revoke an API key (with self-revocation guard)
 *
 * Supports BOTH Bearer token and Clerk session auth.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, apiSuccess, apiError } from '@/lib/api/auth';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import { revokeApiKey } from '@/lib/db/operations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function dualAuth(request: NextRequest) {
  if (request.headers.get('authorization')) {
    const auth = await authenticate(request, ['write'], 'keys');
    if (auth.success) return { orgId: auth.orgId, isApi: true as const, auth };
    return { error: auth.response };
  }
  const dash = await requireDashboardAuth();
  if (dash.success) return { orgId: dash.orgId, isApi: false as const };
  return { error: dash.response };
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const result = await dualAuth(request);
  if ('error' in result) return result.error;

  const { id } = await context.params;

  // Guard: prevent revoking the key currently being used for this request
  if (result.isApi && result.auth.apiKey.id === id) {
    return apiError(
      'SELF_REVOCATION',
      'Cannot revoke the API key that is authenticating this request.',
      409,
    );
  }

  const revoked = await revokeApiKey(result.orgId, id);

  if (!revoked) {
    return apiError('NOT_FOUND', `API key "${id}" not found.`, 404);
  }

  if (result.isApi && result.auth) {
    return apiSuccess({ revoked: true }, 200, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  return NextResponse.json({ success: true, data: { revoked: true } });
}
