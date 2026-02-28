/* ==========================================================================
 * GET  /api/v1/accounts/[id]  — Retrieve account details + user breakdown
 * POST /api/v1/accounts/[id]  — Update account properties
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateAccountUpdate } from '@/lib/api/validation';
import {
  getTrackedAccountByExternalId, upsertTrackedAccount,
  getAllTrackedUsers, getActivityLog,
} from '@/lib/db/operations';
import { mapTrackedAccountToAccount, mapTrackedUserToUser, mapActivityLogToEntry } from '@/lib/db/mappers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const dbAccount = await getTrackedAccountByExternalId(auth.orgId, id);

  if (!dbAccount) {
    return apiError('NOT_FOUND', `Account "${id}" not found.`, 404);
  }

  const account = mapTrackedAccountToAccount(dbAccount);

  // Get users belonging to this account (filter by internal account ID)
  const allUsers = await getAllTrackedUsers(auth.orgId);
  const accountUsers = allUsers
    .filter((u) => u.accountId === dbAccount.id)
    .map((u) => {
      const mapped = mapTrackedUserToUser(u, dbAccount.name);
      return {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        lifecycleState: mapped.lifecycleState,
        churnRiskScore: mapped.churnRiskScore,
        expansionScore: mapped.expansionScore,
        lastLoginDaysAgo: mapped.lastLoginDaysAgo,
      };
    });

  // Recent activity for this account
  const dbActivity = await getActivityLog(auth.orgId, 100);
  const recentActivity = dbActivity
    .filter((a) => a.accountId === dbAccount.id)
    .slice(0, 10)
    .map(mapActivityLogToEntry);

  return apiSuccess(
    { account, users: accountUsers, recentActivity },
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

  const existing = await getTrackedAccountByExternalId(auth.orgId, id);
  if (!existing) {
    return apiError('NOT_FOUND', `Account "${id}" not found.`, 404);
  }

  const updated = await upsertTrackedAccount(auth.orgId, {
    ...existing,
    ...(validation.data as Record<string, unknown>),
    externalId: id,
    name: (validation.data as Record<string, unknown>).name as string ?? existing.name,
  });

  const account = mapTrackedAccountToAccount(updated);

  return apiSuccess(
    { account },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
