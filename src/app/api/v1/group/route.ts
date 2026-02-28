/* ==========================================================================
 * POST /api/v1/group — Account Grouping Endpoint
 *
 * Upserts an account with traits from the SDK group() call.
 * All data persisted to PostgreSQL via DB operations.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateGroup } from '@/lib/api/validation';
import {
  getTrackedAccountByExternalId,
  upsertTrackedAccount,
  getAllTrackedUsers,
  addActivityEntry,
} from '@/lib/db/operations';
import { mapTrackedAccountToAccount, mapTrackedUserToUser } from '@/lib/db/mappers';
import { dispatchWebhooks } from '@/lib/engine/webhooks';
import type { PlanTier } from '@/lib/definitions';

export async function POST(request: NextRequest) {
  // ── Auth (group scope, standard rate tier) ────────────────────
  const auth = await authenticate(request, ['group'], 'standard');
  if (!auth.success) return auth.response;

  const orgId = auth.orgId;
  if (!orgId) {
    return apiError('ORG_NOT_FOUND', 'No organization associated with this API key.', 400);
  }

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateGroup(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { groupId, traits } = validation.data;
  const now = new Date();

  // ── Check if account exists ──────────────────────────────────
  const existingAccount = await getTrackedAccountByExternalId(orgId, groupId);
  const isNew = !existingAccount;

  // ── Upsert Account ────────────────────────────────────────────
  const name = (traits.name as string) || existingAccount?.name || 'Unknown Account';

  const dbAccount = await upsertTrackedAccount(orgId, {
    externalId: groupId,
    name,
    domain: (traits.domain as string) || existingAccount?.domain || undefined,
    plan: (traits.plan as string) || existingAccount?.plan || 'Trial',
    mrr: existingAccount?.mrr ?? 0,
    arr: (traits.arr as number) || existingAccount?.arr || 0,
    userCount: existingAccount?.userCount ?? 1,
    seatLimit: (traits.seats as number) || existingAccount?.seatLimit || 3,
    health: existingAccount?.health ?? 'Fair',
    churnRiskScore: existingAccount?.churnRiskScore ?? 15,
    expansionScore: existingAccount?.expansionScore ?? 0,
    lifecycleDistribution: existingAccount?.lifecycleDistribution ?? { Lead: 1 },
    primaryContact: existingAccount?.primaryContact ?? '',
    primaryContactEmail: existingAccount?.primaryContactEmail ?? '',
    lastActivityAt: now,
    tags: existingAccount?.tags ?? ['sdk-created'],
    properties: {
      ...((existingAccount?.properties as Record<string, unknown>) ?? {}),
      industry: (traits.industry as string) || (existingAccount?.properties as Record<string, unknown>)?.industry || '',
    },
  });

  // ── Activity log for new accounts ────────────────────────────
  if (isNew) {
    await addActivityEntry(orgId, {
      type: 'account_event',
      title: 'New Account Created',
      description: `${name} created via SDK group() call`,
      accountId: dbAccount.id,
    });
  }

  // ── Recompute account metrics from its users ──────────────────
  // getAllTrackedUsers filters by the internal accountId UUID
  const accountUsers = await getAllTrackedUsers(orgId, { accountId: dbAccount.id });
  const distribution: Record<string, number> = {};
  let totalMrr = 0;
  let totalRisk = 0;
  let totalExpansion = 0;

  for (const u of accountUsers) {
    const state = u.lifecycleState ?? 'Lead';
    distribution[state] = (distribution[state] || 0) + 1;
    totalMrr += u.mrr ?? 0;
    totalRisk += u.churnRiskScore ?? 0;
    totalExpansion += u.expansionScore ?? 0;
  }

  const avgRisk = accountUsers.length > 0 ? Math.round(totalRisk / accountUsers.length) : 0;
  const avgExpansion = accountUsers.length > 0 ? Math.round(totalExpansion / accountUsers.length) : 0;

  const updatedAccount = await upsertTrackedAccount(orgId, {
    externalId: groupId,
    name: dbAccount.name ?? name,
    userCount: accountUsers.length,
    mrr: totalMrr,
    arr: totalMrr * 12,
    lifecycleDistribution: distribution,
    churnRiskScore: avgRisk,
    expansionScore: avgExpansion,
    health: avgRisk >= 60 ? 'Poor' : avgRisk >= 30 ? 'Fair' : 'Good',
    lastActivityAt: now,
  });

  // ── Webhook ─────────────────────────────────────────────────
  void dispatchWebhooks('account.updated', {
    accountId: groupId,
    traits,
    isNew,
    timestamp: now.toISOString(),
  }, orgId);

  // ── Response ────────────────────────────────────────────────
  const final = mapTrackedAccountToAccount(updatedAccount);

  return apiSuccess(
    { account: final, isNew },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
