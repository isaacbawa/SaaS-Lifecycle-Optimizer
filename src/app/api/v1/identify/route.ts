/* ==========================================================================
 * POST /api/v1/identify — User Identification Endpoint
 *
 * Upserts a user with traits from the SDK identify() call.
 * Runs the lifecycle engine and dispatches webhooks on state transitions.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateIdentify } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';
import { detectExpansionSignals, computeExpansionScore } from '@/lib/engine/expansion';
import { dispatchWebhooks } from '@/lib/engine/webhooks';
import type { User } from '@/lib/definitions';

export async function POST(request: NextRequest) {
  // ── Auth (identify scope, standard rate tier) ─────────────────
  const auth = await authenticate(request, ['identify'], 'standard');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateIdentify(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { userId, traits } = validation.data;
  const now = new Date().toISOString();

  // ── Upsert User ───────────────────────────────────────────────
  let user = await store.getUser(userId);
  const isNew = !user;

  if (isNew) {
    const name = (traits.name as string) || 'Unknown User';
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser: User = {
      id: userId,
      name,
      email: (traits.email as string) || '',
      initials,
      account: {
        id: (traits.accountId as string) || `acc_auto_${userId}`,
        name: (traits.accountId as string) || 'Unknown Account',
      },
      lifecycleState: 'Lead',
      mrr: 0,
      lastLoginDaysAgo: 0,
      loginFrequencyLast7Days: 1,
      loginFrequencyLast30Days: 1,
      featureUsageLast30Days: [],
      sessionDepthMinutes: 0,
      plan: (traits.plan as string) || 'Trial',
      signupDate: (traits.createdAt as string) || now.split('T')[0],
      churnRiskScore: 15,
      expansionScore: 0,
      seatCount: 1,
      seatLimit: 3,
      apiCallsLast30Days: 0,
      apiLimit: 500,
      stateChangedAt: now,
    };

    user = await store.upsertUser(newUser);

    await store.addActivity({
      id: `act_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
      type: 'account_event',
      title: 'New User Identified',
      description: `${name} identified via SDK`,
      timestamp: now,
      userId,
      accountId: user.account.id,
    });
  } else {
    // Merge traits into existing user
    const updates: Partial<User> = {};

    if (traits.name) updates.name = traits.name as string;
    if (traits.email) updates.email = traits.email as string;
    if (traits.plan) updates.plan = traits.plan as string;
    if (traits.accountId) {
      updates.account = {
        id: traits.accountId as string,
        name: user!.account.name,
      };
    }

    if (Object.keys(updates).length > 0) {
      user = (await store.updateUser(userId, updates))!;
    }
  }

  // ── Classify Lifecycle State ──────────────────────────────────
  const classification = classifyLifecycleState(user!);
  const stateChanged = classification.state !== user!.lifecycleState;

  if (stateChanged) {
    await store.updateUser(userId, {
      lifecycleState: classification.state,
      previousState: user!.lifecycleState,
      stateChangedAt: now,
    });
  }

  // ── Score Risks ───────────────────────────────────────────────
  const refreshed = (await store.getUser(userId))!;
  const churnResult = scoreChurnRisk(refreshed);
  await store.updateUser(userId, { churnRiskScore: churnResult.riskScore });

  // ── Expansion Scan ────────────────────────────────────────────
  const account = await store.getAccount(refreshed.account.id);
  if (account) {
    const signals = detectExpansionSignals(refreshed, account);
    const expansionScore = computeExpansionScore(signals);
    await store.updateUser(userId, { expansionScore });
  }

  // ── Webhooks ──────────────────────────────────────────────────
  void dispatchWebhooks('user.identified', {
    userId,
    traits,
    isNew,
    lifecycleState: classification.state,
    timestamp: now,
  });

  if (stateChanged) {
    void dispatchWebhooks('user.lifecycle_changed', {
      userId,
      previousState: user!.lifecycleState,
      newState: classification.state,
      account: user!.account,
    });
  }

  // ── Response ──────────────────────────────────────────────────
  const final = await store.getUser(userId);

  return apiSuccess(
    {
      user: final,
      isNew,
      lifecycleState: classification.state,
      stateChanged,
      churnRisk: {
        score: churnResult.riskScore,
        tier: churnResult.riskTier,
      },
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
