import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const base = 'src/app/api/v1';

const files = {};

// ═══════════════════════════════════════════════════════════════════════
// 1. POST /api/v1/events
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/events/route.ts`] = `/* ==========================================================================
 * POST /api/v1/events — Event Ingestion Endpoint
 *
 * Accepts batched events from the SDK, persists them to the store,
 * and triggers the lifecycle engine + webhook dispatch for each event.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateEventsBatch } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { detectStateTransition } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';
import { dispatchWebhooks } from '@/lib/engine/webhooks';

export async function POST(request: NextRequest) {
  // ── Auth (scope: track, tier: events at 500/min) ─────────────
  const auth = await authenticate(request, ['track'], 'events');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateEventsBatch(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const { batch, sentAt } = validation.data;
  const now = new Date().toISOString();

  // ── Build StoredEvent records ─────────────────────────────────
  const toIngest = batch.map((item, i) => ({
    id: \`evt_\${Date.now().toString(36)}_\${i}_\${crypto.randomUUID().substring(0, 8)}\`,
    event: item.event,
    userId: item.userId,
    accountId: item.accountId,
    properties: (item.properties ?? {}) as Record<string, unknown>,
    timestamp: item.timestamp ?? sentAt ?? now,
    receivedAt: now,
    context: (item.context ?? {}) as Record<string, unknown>,
    messageId: item.messageId,
    processed: false,
  }));

  // ── Ingest (returns ingested + duplicate counts) ──────────────
  const result = await store.ingestEvents(toIngest);

  // ── Process events through lifecycle engine ───────────────────
  let processed = 0;
  for (const evt of toIngest) {
    if (!evt.userId) continue;

    const user = await store.getUser(evt.userId);
    if (!user) continue;

    const transition = detectStateTransition(user);

    if (transition.transitioned) {
      await store.updateUser(user.id, {
        lifecycleState: transition.to,
        previousState: transition.from,
        stateChangedAt: now,
      });

      const updatedUser = await store.getUser(user.id);
      if (updatedUser) {
        const churnResult = scoreChurnRisk(updatedUser);
        await store.updateUser(user.id, {
          churnRiskScore: churnResult.riskScore,
        });
      }

      await store.addActivity({
        id: \`act_\${Date.now().toString(36)}_\${crypto.randomUUID().substring(0, 6)}\`,
        type: 'lifecycle_change',
        title: 'Lifecycle State Change',
        description: \`\${user.name} moved from \${transition.from} → \${transition.to}\`,
        timestamp: now,
        userId: user.id,
        accountId: user.account.id,
      });

      void dispatchWebhooks('user.lifecycle_changed', {
        userId: user.id,
        userName: user.name,
        previousState: transition.from,
        newState: transition.to,
        account: user.account,
        confidence: transition.classification.confidence,
        signals: transition.classification.signals,
      });
    }

    void dispatchWebhooks('event.tracked', {
      event: evt.event,
      userId: evt.userId,
      accountId: evt.accountId,
      properties: evt.properties,
      timestamp: evt.timestamp,
    });

    processed++;
  }

  return apiSuccess(
    {
      ingested: result.ingested,
      duplicates: result.duplicates,
      processed,
      total: batch.length,
    },
    result.duplicates > 0 ? 207 : 200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 2. POST /api/v1/identify
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/identify/route.ts`] = `/* ==========================================================================
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
  // ── Auth (scope: identify) ────────────────────────────────────
  const auth = await authenticate(request, ['identify'], 'standard');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateIdentify(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const { userId, traits, timestamp } = validation.data;
  const now = timestamp ?? new Date().toISOString();

  // ── Upsert User ───────────────────────────────────────────────
  let user = await store.getUser(userId);
  const isNew = !user;

  if (isNew) {
    const name = (traits?.name as string) || 'Unknown User';
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser: User = {
      id: userId,
      name,
      email: (traits?.email as string) || '',
      initials,
      account: {
        id: (traits?.accountId as string) || \`acc_auto_\${userId}\`,
        name: (traits?.accountId as string) || 'Unknown Account',
      },
      lifecycleState: 'Lead',
      mrr: 0,
      lastLoginDaysAgo: 0,
      loginFrequencyLast7Days: 1,
      loginFrequencyLast30Days: 1,
      featureUsageLast30Days: [],
      sessionDepthMinutes: 0,
      plan: (traits?.plan as string) || 'Trial',
      signupDate: (traits?.createdAt as string) || now.split('T')[0],
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
      id: \`act_\${Date.now().toString(36)}_\${crypto.randomUUID().substring(0, 6)}\`,
      type: 'account_event',
      title: 'New User Identified',
      description: \`\${name} identified via SDK\`,
      timestamp: now,
      userId,
      accountId: user.account.id,
    });
  } else {
    // Merge traits into existing user
    const updates: Partial<User> = {};

    if (traits?.name) updates.name = traits.name as string;
    if (traits?.email) updates.email = traits.email as string;
    if (traits?.plan) updates.plan = traits.plan as string;
    if (traits?.accountId) {
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
    traits: traits ?? {},
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
`;

// ═══════════════════════════════════════════════════════════════════════
// 3. POST /api/v1/group
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/group/route.ts`] = `/* ==========================================================================
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
  // ── Auth (scope: group) ───────────────────────────────────────
  const auth = await authenticate(request, ['group'], 'standard');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateGroup(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const { groupId, traits, timestamp } = validation.data;
  const now = timestamp ?? new Date().toISOString();

  // ── Upsert Account ────────────────────────────────────────────
  let account = await store.getAccount(groupId);
  const isNew = !account;

  if (isNew) {
    const name = (traits?.name as string) || 'Unknown Account';
    const initials = name
      .split(' ')
      .map((p: string) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newAccount: Account = {
      id: groupId,
      name,
      initials,
      mrr: 0,
      arr: (traits?.arr as number) || 0,
      userCount: 1,
      seatLimit: (traits?.seats as number) || 3,
      health: 'Fair',
      plan: ((traits?.plan as string) || 'Trial') as PlanTier,
      lifecycleDistribution: { Lead: 1 },
      churnRiskScore: 15,
      expansionScore: 0,
      signupDate: now.split('T')[0],
      lastActivityDate: now.split('T')[0],
      industry: (traits?.industry as string) || '',
      primaryContact: '',
      primaryContactEmail: '',
      domain: (traits?.domain as string) || '',
      tags: ['sdk-created'],
    };

    account = await store.upsertAccount(newAccount);

    await store.addActivity({
      id: \`act_\${Date.now().toString(36)}_\${crypto.randomUUID().substring(0, 6)}\`,
      type: 'account_event',
      title: 'New Account Created',
      description: \`\${name} created via SDK group() call\`,
      timestamp: now,
      accountId: groupId,
    });
  } else {
    const updates: Partial<Account> = {
      lastActivityDate: now.split('T')[0],
    };

    if (traits?.name) updates.name = traits.name as string;
    if (traits?.industry) updates.industry = traits.industry as string;
    if (traits?.plan) updates.plan = (traits.plan as string) as PlanTier;
    if (traits?.seats) updates.seatLimit = traits.seats as number;
    if (traits?.arr) updates.arr = traits.arr as number;
    if (traits?.domain) updates.domain = traits.domain as string;

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
    traits: traits ?? {},
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
`;

// ═══════════════════════════════════════════════════════════════════════
// 4. GET/POST /api/v1/users/[id]
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/users/[id]/route.ts`] = `/* ==========================================================================
 * GET  /api/v1/users/[id]  — Retrieve user profile & lifecycle state
 * POST /api/v1/users/[id]  — Update user properties (allowlisted fields)
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateUserUpdate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const user = await store.getUser(id);

  if (!user) {
    return apiError('NOT_FOUND', \`User "\${id}" not found.\`, 404);
  }

  const classification = classifyLifecycleState(user);
  const churn = scoreChurnRisk(user);

  return apiSuccess(
    {
      user,
      lifecycle: {
        state: classification.state,
        confidence: classification.confidence,
        signals: classification.signals,
      },
      churnRisk: {
        score: churn.riskScore,
        tier: churn.riskTier,
        estimatedMrrAtRisk: churn.estimatedMrrAtRisk,
      },
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateUserUpdate(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const existing = await store.getUser(id);
  if (!existing) {
    return apiError('NOT_FOUND', \`User "\${id}" not found.\`, 404);
  }

  const user = await store.updateUser(id, validation.data);

  return apiSuccess(
    { user },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 5. POST /api/v1/users/[id]/analyze
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/users/[id]/analyze/route.ts`] = `/* ==========================================================================
 * POST /api/v1/users/[id]/analyze — Churn Risk Analysis Endpoint
 *
 * Runs the full churn risk scoring engine for a specific user and returns
 * the risk assessment with factors, recommendations, and MRR impact.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError } from '@/lib/api/auth';
import { store } from '@/lib/store';
import { scoreChurnRisk } from '@/lib/engine/churn';
import { detectExpansionSignals, computeExpansionScore } from '@/lib/engine/expansion';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { dispatchWebhooks } from '@/lib/engine/webhooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  // ── Auth (scope: read, tier: analysis at 30/min) ──────────────
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const user = await store.getUser(id);

  if (!user) {
    return apiError('NOT_FOUND', \`User "\${id}" not found.\`, 404);
  }

  // Parse options
  let options: { includeRecommendations?: boolean } = {};
  try {
    options = await request.json();
  } catch {
    // Empty body is fine
  }

  // ── Run Analysis ──────────────────────────────────────────────
  const churnResult = scoreChurnRisk(user);
  const lifecycle = classifyLifecycleState(user);

  await store.updateUser(id, {
    churnRiskScore: churnResult.riskScore,
  });

  // ── Expansion Analysis ────────────────────────────────────────
  let expansionData = null;
  const account = await store.getAccount(user.account.id);

  if (account) {
    const signals = detectExpansionSignals(user, account);
    const expansionScore = computeExpansionScore(signals);
    await store.updateUser(id, { expansionScore });

    expansionData = {
      score: expansionScore,
      signals: signals.map((s) => ({
        signal: s.signal,
        description: s.description,
        confidence: s.confidence,
        suggestedPlan: s.suggestedPlan,
        potentialUplift: s.upliftMrr,
      })),
    };
  }

  // ── Dispatch risk webhook if score changed significantly ──────
  if (Math.abs(churnResult.riskScore - user.churnRiskScore) >= 10) {
    void dispatchWebhooks('user.risk_score_changed', {
      userId: user.id,
      previousScore: user.churnRiskScore,
      newScore: churnResult.riskScore,
      riskTier: churnResult.riskTier,
      account: user.account,
    });
  }

  // ── Build Response ────────────────────────────────────────────
  const responseData: Record<string, unknown> = {
    userId: user.id,
    churnRisk: {
      riskScore: churnResult.riskScore,
      riskTier: churnResult.riskTier,
      explanation: churnResult.explanation,
      factors: churnResult.factors,
      estimatedMrrAtRisk: churnResult.estimatedMrrAtRisk,
    },
    lifecycle: {
      current: lifecycle.state,
      confidence: lifecycle.confidence,
      signals: lifecycle.signals,
    },
  };

  if (options.includeRecommendations !== false) {
    responseData.recommendations = churnResult.recommendations;
  }

  if (expansionData) {
    responseData.expansion = expansionData;
  }

  return apiSuccess(
    responseData,
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 6. GET/POST /api/v1/accounts/[id]
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/accounts/[id]/route.ts`] = `/* ==========================================================================
 * GET  /api/v1/accounts/[id]  — Retrieve account details + user breakdown
 * POST /api/v1/accounts/[id]  — Update account properties (allowlisted)
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
    return apiError('NOT_FOUND', \`Account "\${id}" not found.\`, 404);
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateAccountUpdate(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const existing = await store.getAccount(id);
  if (!existing) {
    return apiError('NOT_FOUND', \`Account "\${id}" not found.\`, 404);
  }

  const account = await store.updateAccount(id, validation.data);

  return apiSuccess(
    { account },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 7. GET /api/v1/flows (with pagination)
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/flows/route.ts`] = `/* ==========================================================================
 * GET /api/v1/flows — List all email flows with filtering & pagination
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { parsePagination, paginate } from '@/lib/api/validation';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const flows = await store.getAllFlows();
  const url = new URL(request.url);

  // ── Filtering ─────────────────────────────────────────────────
  const status = url.searchParams.get('status');
  const triggerType = url.searchParams.get('triggerType');

  let filtered = flows;

  if (status) {
    filtered = filtered.filter((f) => f.status.toLowerCase() === status.toLowerCase());
  }
  if (triggerType) {
    filtered = filtered.filter((f) => f.triggerType === triggerType);
  }

  // ── Pagination ────────────────────────────────────────────────
  const pagination = parsePagination(url.searchParams);
  const paged = paginate(filtered, pagination);

  return apiSuccess(
    {
      flows: paged.data,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
      totalPages: paged.totalPages,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 8. GET /api/v1/analytics/revenue (division-by-zero fix)
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/analytics/revenue/route.ts`] = `/* ==========================================================================
 * GET /api/v1/analytics/revenue — Revenue analytics endpoint
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const [revenue, waterfall, kpi] = await Promise.all([
    store.getRevenueData(),
    store.getRevenueWaterfall(),
    store.getKPISummary(),
  ]);

  const latestMonth = revenue.length > 0 ? revenue[revenue.length - 1] : null;
  const prevMonth = revenue.length > 1 ? revenue[revenue.length - 2] : null;

  // Safe division — avoid NaN/Infinity when prevMonth.netTotal is 0
  let mrrGrowth = 0;
  if (latestMonth && prevMonth && prevMonth.netTotal !== 0) {
    mrrGrowth = ((latestMonth.netTotal - prevMonth.netTotal) / prevMonth.netTotal) * 100;
  }

  return apiSuccess(
    {
      currentMrr: kpi.totalMrr,
      currentArr: kpi.totalArr,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      mrrByMovement: kpi.mrrByMovement,
      monthlyData: revenue,
      waterfall,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 9. GET /api/v1/analytics/retention
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/analytics/retention/route.ts`] = `/* ==========================================================================
 * GET /api/v1/analytics/retention — Retention cohort analytics
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const cohorts = await store.getRetentionCohorts();

  const totalUsers = cohorts.reduce((acc, c) => acc + c.size, 0);
  const cohortsWithRetention = cohorts.filter((c) => c.retention.length > 1);
  const avgMonth1Retention = cohortsWithRetention.length > 0
    ? Math.round(
        cohortsWithRetention.reduce((acc, c) => acc + c.retention[1], 0) /
        cohortsWithRetention.length * 10,
      ) / 10
    : 0;

  return apiSuccess(
    {
      cohorts,
      totalCohorts: cohorts.length,
      totalUsers,
      avgMonth1Retention,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 10. GET /api/v1/analytics/kpi
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/analytics/kpi/route.ts`] = `/* ==========================================================================
 * GET /api/v1/analytics/kpi — KPI Summary (lifecycle distribution, MRR, etc.)
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const kpi = await store.getKPISummary();

  return apiSuccess(
    kpi,
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 11. GET/POST /api/v1/webhooks
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/webhooks/route.ts`] = `/* ==========================================================================
 * GET    /api/v1/webhooks     — List all configured webhooks
 * POST   /api/v1/webhooks     — Create a new webhook
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiValidationError } from '@/lib/api/auth';
import { validateWebhookCreate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { getDeliveryLog } from '@/lib/engine/webhooks';
import type { WebhookConfig } from '@/lib/definitions';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'webhooks');
  if (!auth.success) return auth.response;

  const webhooks = await store.getWebhooks();

  const enriched = webhooks.map((wh) => {
    const recentDeliveries = getDeliveryLog(wh.id, 10);
    return {
      ...wh,
      recentDeliveries: recentDeliveries.length,
      recentSuccesses: recentDeliveries.filter((d) => d.success).length,
      recentFailures: recentDeliveries.filter((d) => !d.success).length,
    };
  });

  return apiSuccess(
    { webhooks: enriched, total: webhooks.length },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    const { apiError } = await import('@/lib/api/auth');
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateWebhookCreate(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const { url, events } = validation.data;

  // Use crypto-secure secret from store
  const secret = await store.generateWebhookSecret();

  const webhook: WebhookConfig = {
    id: \`wh_\${Date.now().toString(36)}_\${crypto.randomUUID().substring(0, 6)}\`,
    url,
    events,
    status: 'active',
    secret,
    createdDate: new Date().toISOString().split('T')[0],
    successRate: 100,
  };

  await store.upsertWebhook(webhook);

  return apiSuccess(
    { webhook },
    201,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 12. GET/PUT/DELETE /api/v1/webhooks/[id]
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/webhooks/[id]/route.ts`] = `/* ==========================================================================
 * GET    /api/v1/webhooks/[id]    — Get webhook details + delivery log
 * PUT    /api/v1/webhooks/[id]    — Update a webhook
 * DELETE /api/v1/webhooks/[id]    — Delete a webhook
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateWebhookUpdate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { getDeliveryLog, getDLQ, getCircuitState } from '@/lib/engine/webhooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const webhook = await store.getWebhook(id);

  if (!webhook) {
    return apiError('NOT_FOUND', \`Webhook "\${id}" not found.\`, 404);
  }

  const deliveries = getDeliveryLog(id, 20);
  const dlq = getDLQ(id);
  const circuit = getCircuitState(id);

  return apiSuccess(
    {
      webhook,
      deliveries,
      deadLetterQueue: dlq,
      circuitBreaker: circuit,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const webhook = await store.getWebhook(id);

  if (!webhook) {
    return apiError('NOT_FOUND', \`Webhook "\${id}" not found.\`, 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateWebhookUpdate(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

  const { url, events, status } = validation.data;

  if (url !== undefined) webhook.url = url;
  if (events !== undefined) webhook.events = events;
  if (status !== undefined) webhook.status = status;

  await store.upsertWebhook(webhook);

  return apiSuccess(
    { webhook },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const deleted = await store.deleteWebhook(id);

  if (!deleted) {
    return apiError('NOT_FOUND', \`Webhook "\${id}" not found.\`, 404);
  }

  return apiSuccess(
    { deleted: true },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// 13. GET/POST /api/v1/keys
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/keys/route.ts`] = `/* ==========================================================================
 * GET  /api/v1/keys — List API keys (secrets partially masked)
 * POST /api/v1/keys — Create a new API key
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiValidationError } from '@/lib/api/auth';
import { validateKeyCreate } from '@/lib/api/validation';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'keys');
  if (!auth.success) return auth.response;

  const keys = await store.getApiKeys();

  // Mask key value (show first 10 chars + last 4)
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.length > 14
      ? k.key.substring(0, 10) + '••••••••••' + k.key.substring(k.key.length - 4)
      : '••••••••••••••',
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
  const auth = await authenticate(request, ['admin'], 'keys');
  if (!auth.success) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    const { apiError } = await import('@/lib/api/auth');
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const validation = validateKeyCreate(raw);
  if (!validation.valid) return apiValidationError(validation.errors);

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
`;

// ═══════════════════════════════════════════════════════════════════════
// 14. DELETE /api/v1/keys/[id]
// ═══════════════════════════════════════════════════════════════════════
files[`${base}/keys/[id]/route.ts`] = `/* ==========================================================================
 * DELETE /api/v1/keys/[id] — Revoke an API key
 *
 * Includes self-revocation guard to prevent revoking the key currently
 * being used to authenticate the request.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError } from '@/lib/api/auth';
import { store } from '@/lib/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['admin'], 'keys');
  if (!auth.success) return auth.response;

  const { id } = await context.params;

  // ── Self-revocation guard ─────────────────────────────────────
  if (auth.apiKey.id === id) {
    return apiError(
      'SELF_REVOCATION',
      'Cannot revoke the API key currently used to authenticate this request. Use a different key.',
      409,
    );
  }

  const revoked = await store.revokeApiKey(id);

  if (!revoked) {
    return apiError('NOT_FOUND', \`API key "\${id}" not found.\`, 404);
  }

  return apiSuccess(
    { revoked: true },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════
// Write all files
// ═══════════════════════════════════════════════════════════════════════
let written = 0;
for (const [path, content] of Object.entries(files)) {
  const fullPath = join(process.cwd(), path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
  written++;
  console.log(`✓ ${path}`);
}

console.log(`\nDone: ${written} files written.`);
