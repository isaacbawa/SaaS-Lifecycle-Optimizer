/* ==========================================================================
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
  // ── Auth (read scope, analysis rate tier — 30 req/min) ────────
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const user = await store.getUser(id);

  if (!user) {
    return apiError('NOT_FOUND', `User "${id}" not found.`, 404);
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

  // Update stored scores
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
