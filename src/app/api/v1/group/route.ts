/* ==========================================================================
 * POST /api/v1/group — Account Grouping Endpoint
 *
 * Upserts an account with traits from the SDK group() call.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateGroup } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { dispatchWebhooks } from '@/lib/engine/webhooks';
import type { Account, PlanTier } from '@/lib/definitions';

export async function POST(request: NextRequest) {
  // ── Auth (group scope, standard rate tier) ────────────────────
  const auth = await authenticate(request, ['group'], 'standard');
  if (!auth.success) return auth.response;

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
  const now = new Date().toISOString();

  // ── Upsert Account ────────────────────────────────────────────
  let account = await store.getAccount(groupId);
  const isNew = !account;

  if (isNew) {
    const name = (traits.name as string) || 'Unknown Account';
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newAccount: Account = {
      id: groupId,
      name,
      initials,
      mrr: 0,
      arr: (traits.arr as number) || 0,
      userCount: 1,
      seatLimit: (traits.seats as number) || 3,
      health: 'Fair',
      plan: ((traits.plan as string) || 'Trial') as PlanTier,
      lifecycleDistribution: { Lead: 1 },
      churnRiskScore: 15,
      expansionScore: 0,
      signupDate: now.split('T')[0],
      lastActivityDate: now.split('T')[0],
      industry: (traits.industry as string) || '',
      primaryContact: '',
      primaryContactEmail: '',
      domain: (traits.domain as string) || '',
      tags: ['sdk-created'],
    };

    account = await store.upsertAccount(newAccount);

    await store.addActivity({
      id: `act_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
      type: 'account_event',
      title: 'New Account Created',
      description: `${name} created via SDK group() call`,
      timestamp: now,
      accountId: groupId,
    });
  } else {
    // Merge traits
    const updates: Partial<Account> = {
      lastActivityDate: now.split('T')[0],
    };

    if (traits.name) updates.name = traits.name as string;
    if (traits.industry) updates.industry = traits.industry as string;
    if (traits.plan) updates.plan = (traits.plan as string) as PlanTier;
    if (traits.seats) updates.seatLimit = traits.seats as number;
    if (traits.arr) updates.arr = traits.arr as number;
    if (traits.domain) updates.domain = traits.domain as string;

    account = (await store.updateAccount(groupId, updates))!;
  }

  // ── Recompute account metrics ─────────────────────────────────
  const accountUsers = await store.getAccountUsers(groupId);
  const distribution: Partial<Record<string, number>> = {};
  let totalMrr = 0;
  let totalRisk = 0;
  let totalExpansion = 0;

  for (const u of accountUsers) {
    distribution[u.lifecycleState] = (distribution[u.lifecycleState] || 0) + 1;
    totalMrr += u.mrr;
    totalRisk += u.churnRiskScore;
    totalExpansion += u.expansionScore;
  }

  const avgRisk = accountUsers.length > 0 ? Math.round(totalRisk / accountUsers.length) : 0;
  const avgExpansion = accountUsers.length > 0 ? Math.round(totalExpansion / accountUsers.length) : 0;

  await store.updateAccount(groupId, {
    userCount: accountUsers.length,
    mrr: totalMrr,
    arr: totalMrr * 12,
    lifecycleDistribution: distribution,
    churnRiskScore: avgRisk,
    expansionScore: avgExpansion,
    health: avgRisk >= 60 ? 'Poor' : avgRisk >= 30 ? 'Fair' : 'Good',
  });

  // ── Webhook ───────────────────────────────────────────────────
  void dispatchWebhooks('account.updated', {
    accountId: groupId,
    traits,
    isNew,
    timestamp: now,
  });

  // ── Response ──────────────────────────────────────────────────
  const final = await store.getAccount(groupId);

  return apiSuccess(
    { account: final, isNew },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
