/* ==========================================================================
 * GET  /api/v1/accounts/[id]  — Retrieve account details + user breakdown
 * POST /api/v1/accounts/[id]  — Update account properties
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateAccountUpdate } from '@/lib/api/validation';
import { store } from '@/lib/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const account = await store.getAccount(id);

  if (!account) {
    return apiError('NOT_FOUND', `Account "${id}" not found.`, 404);
  }

  const accountUsers = await store.getAccountUsers(id);
  const recentActivity = (await store.getActivityFeed(100))
    .filter((a) => a.accountId === id)
    .slice(0, 10);

  return apiSuccess(
    {
      account,
      users: accountUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        lifecycleState: u.lifecycleState,
        churnRiskScore: u.churnRiskScore,
        expansionScore: u.expansionScore,
        lastLoginDaysAgo: u.lastLoginDaysAgo,
      })),
      recentActivity,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateAccountUpdate(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const account = await store.updateAccount(id, validation.data);
  if (!account) {
    return apiError('NOT_FOUND', `Account "${id}" not found.`, 404);
  }

  return apiSuccess(
    { account },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
