/* ==========================================================================
 * POST /api/v1/identify — User Identification Endpoint
 *
 * Upserts a tracked user with traits from the SDK identify() call.
 * Writes directly to PostgreSQL via Drizzle ORM.
 * Runs the lifecycle engine and dispatches webhooks on state transitions.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateIdentify } from '@/lib/api/validation';
import {
  getTrackedUserByExternalId,
  upsertTrackedUser,
  getTrackedAccountByExternalId,
  addActivityEntry,
} from '@/lib/db/operations';
import { mapTrackedUserToUser, mapTrackedAccountToAccount } from '@/lib/db/mappers';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';
import { detectExpansionSignals, computeExpansionScore } from '@/lib/engine/expansion';
import { dispatchWebhooks } from '@/lib/engine/webhooks';
import type { LifecycleState } from '@/lib/definitions';

export async function POST(request: NextRequest) {
  // ── Auth (identify scope, standard rate tier) ─────────────────
  const auth = await authenticate(request, ['identify'], 'standard');
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

  const validation = validateIdentify(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { userId, traits } = validation.data;
  const now = new Date();

  // ── Look up or create tracked user in DB ──────────────────────
  const existing = await getTrackedUserByExternalId(orgId, userId);
  const isNew = !existing;

  // Resolve account reference (if accountId trait provided)
  let dbAccountId: string | undefined;
  let accountName = 'Unknown Account';
  if (traits.accountId) {
    const account = await getTrackedAccountByExternalId(orgId, traits.accountId as string);
    if (account) {
      dbAccountId = account.id;
      accountName = account.name;
    }
  } else if (existing?.accountId) {
    dbAccountId = existing.accountId;
  }

  const name = (traits.name as string) || existing?.name || 'Unknown User';

  // Upsert tracked user
  const dbUser = await upsertTrackedUser(orgId, {
    id: existing?.id,
    externalId: userId,
    email: (traits.email as string) || existing?.email || undefined,
    name,
    accountId: dbAccountId ?? existing?.accountId ?? undefined,
    lifecycleState: existing?.lifecycleState ?? ('Lead' as const),
    previousState: existing?.previousState,
    mrr: existing?.mrr ?? 0,
    plan: (traits.plan as string) || existing?.plan || 'Trial',
    signupDate: (traits.createdAt ? new Date(traits.createdAt as string) : null) ?? existing?.signupDate ?? now,
    lastLoginAt: existing?.lastLoginAt ?? now,
    loginFrequency7d: existing?.loginFrequency7d ?? 1,
    loginFrequency30d: existing?.loginFrequency30d ?? 1,
    featureUsage30d: existing?.featureUsage30d ?? [],
    sessionDepthMinutes: existing?.sessionDepthMinutes ?? 0,
    churnRiskScore: existing?.churnRiskScore ?? 15,
    expansionScore: existing?.expansionScore ?? 0,
    seatCount: existing?.seatCount ?? 1,
    seatLimit: existing?.seatLimit ?? 3,
    apiCalls30d: existing?.apiCalls30d ?? 0,
    apiLimit: existing?.apiLimit ?? 500,
  });

  // Activity log for new users
  if (isNew) {
    await addActivityEntry(orgId, {
      type: 'account_event',
      title: 'New User Identified',
      description: `${name} identified via SDK`,
      trackedUserId: dbUser.id,
      accountId: dbAccountId ?? undefined,
    });
  }

  // ── Convert to UI User type for engine processing ─────────────
  let user = mapTrackedUserToUser(dbUser, accountName);

  // ── Classify Lifecycle State ──────────────────────────────────
  const classification = classifyLifecycleState(user);
  const stateChanged = classification.state !== user.lifecycleState;

  if (stateChanged) {
    await upsertTrackedUser(orgId, {
      id: dbUser.id,
      externalId: userId,
      name,
      lifecycleState: classification.state as LifecycleState,
      previousState: user.lifecycleState as LifecycleState,
      stateChangedAt: now,
    });
    user = { ...user, lifecycleState: classification.state, previousState: user.lifecycleState };
  }

  // ── Score Churn Risk ──────────────────────────────────────────
  const churnResult = scoreChurnRisk(user);
  await upsertTrackedUser(orgId, {
    id: dbUser.id,
    externalId: userId,
    name,
    churnRiskScore: churnResult.riskScore,
  });

  // ── Expansion Scan ────────────────────────────────────────────
  if (traits.accountId) {
    const dbAccount = await getTrackedAccountByExternalId(orgId, traits.accountId as string);
    if (dbAccount) {
      const account = mapTrackedAccountToAccount(dbAccount);
      const signals = detectExpansionSignals(user, account);
      const expansionScore = computeExpansionScore(signals);
      await upsertTrackedUser(orgId, {
        id: dbUser.id,
        externalId: userId,
        name,
        expansionScore,
      });
    }
  }

  // ── Webhooks ──────────────────────────────────────────────────
  void dispatchWebhooks('user.identified', {
    userId,
    traits,
    isNew,
    lifecycleState: classification.state,
    timestamp: now.toISOString(),
  }, orgId);

  if (stateChanged) {
    void dispatchWebhooks('user.lifecycle_changed', {
      userId,
      previousState: user.previousState,
      newState: classification.state,
      account: user.account,
    }, orgId);
  }

  // ── Response ──────────────────────────────────────────────────
  const finalUser = await getTrackedUserByExternalId(orgId, userId);
  const finalMapped = finalUser ? mapTrackedUserToUser(finalUser, accountName) : user;

  return apiSuccess(
    {
      user: finalMapped,
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
