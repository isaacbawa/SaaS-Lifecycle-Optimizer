'use server';

import type {
  User,
  ChurnRiskAnalysisOutput,
  RiskFactor,
  Recommendation,
  RiskTier,
} from '@/lib/definitions';

/* ==========================================================================
 * Server Actions — production-grade lifecycle intelligence
 *
 * In production these call into the Churn Risk Engine, Revenue Attribution
 * Engine, and Email Orchestrator microservices. Currently deterministic
 * heuristics for development.
 * ========================================================================== */

function getRiskTier(score: number): RiskTier {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Low';
}

/**
 * Compute churn risk analysis for a given user.
 * Returns a structured risk assessment with factors, recommendations, and MRR impact.
 */
export async function runChurnAnalysis(
  user: User,
): Promise<ChurnRiskAnalysisOutput> {
  // Simulate network latency to a real prediction service
  await new Promise((resolve) => setTimeout(resolve, 500));

  let riskScore = 5;
  const factors: RiskFactor[] = [];
  const recommendations: Recommendation[] = [];

  // ── Already churned ──────────────────────────────────────────────
  if (user.lifecycleState === 'Churned') {
    return {
      riskScore: 100,
      riskTier: 'Critical',
      explanation: 'User has already churned. Immediate win-back sequence recommended.',
      factors: [
        { signal: 'Lifecycle state is Churned.', weight: 50, category: 'engagement' },
        { signal: `No login for ${user.lastLoginDaysAgo} days.`, weight: 30, category: 'engagement' },
        { signal: 'Zero feature usage in the last 30 days.', weight: 20, category: 'adoption' },
      ],
      recommendations: [
        { action: 'Trigger the Win-Back Campaign flow with a 50% discount offer.', priority: 'critical', effort: 'Low', expectedImpact: 'High' },
        { action: 'Review exit survey and support ticket history for root cause.', priority: 'high', effort: 'Medium', expectedImpact: 'Medium' },
        { action: 'Schedule personal outreach from CS lead within 48 hours.', priority: 'high', effort: 'Medium', expectedImpact: 'High' },
      ],
      estimatedMrrAtRisk: user.mrr,
    };
  }

  // ── Lifecycle state signals ──────────────────────────────────────
  if (user.lifecycleState === 'AtRisk') {
    riskScore += 30;
    factors.push({
      signal: 'User is in "At Risk" lifecycle state — engagement declining.',
      weight: 30,
      category: 'engagement',
    });
  }

  // ── Login decay ──────────────────────────────────────────────────
  if (user.lastLoginDaysAgo > 21) {
    riskScore += 25;
    factors.push({
      signal: `No login in ${user.lastLoginDaysAgo} days — severe disengagement.`,
      weight: 25,
      category: 'engagement',
    });
    recommendations.push({
      action: 'Send an urgent re-engagement email with a personalized subject line.',
      priority: 'critical',
      effort: 'Low',
      expectedImpact: 'High',
    });
  } else if (user.lastLoginDaysAgo > 14) {
    riskScore += 18;
    factors.push({
      signal: `No login in ${user.lastLoginDaysAgo} days — disengagement starting.`,
      weight: 18,
      category: 'engagement',
    });
    recommendations.push({
      action: 'Trigger re-engagement flow highlighting recent feature updates.',
      priority: 'high',
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  } else if (user.lastLoginDaysAgo > 7) {
    riskScore += 8;
    factors.push({
      signal: `Login gap of ${user.lastLoginDaysAgo} days — watch for pattern.`,
      weight: 8,
      category: 'engagement',
    });
  }

  // ── Login frequency ──────────────────────────────────────────────
  if (user.loginFrequencyLast7Days === 0) {
    riskScore += 15;
    factors.push({
      signal: 'Zero logins in the last 7 days.',
      weight: 15,
      category: 'engagement',
    });
    recommendations.push({
      action: 'Schedule personal check-in from customer success team within 24h.',
      priority: 'high',
      effort: 'Medium',
      expectedImpact: 'High',
    });
  } else if (user.loginFrequencyLast7Days < 2) {
    riskScore += 10;
    factors.push({
      signal: 'Very low login frequency (less than 2x in 7 days).',
      weight: 10,
      category: 'engagement',
    });
  }

  // ── Feature depth ────────────────────────────────────────────────
  if (user.featureUsageLast30Days.length === 0) {
    riskScore += 15;
    factors.push({
      signal: 'Zero feature usage in the last 30 days.',
      weight: 15,
      category: 'adoption',
    });
    recommendations.push({
      action: 'Trigger feature education flow focused on the top 3 use cases for their plan.',
      priority: 'high',
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  } else if (user.featureUsageLast30Days.length < 3) {
    riskScore += 8;
    factors.push({
      signal: `Only ${user.featureUsageLast30Days.length} feature(s) used in 30 days — limited adoption.`,
      weight: 8,
      category: 'adoption',
    });
    recommendations.push({
      action: 'Send a feature discovery email showing unused high-value features.',
      priority: 'medium',
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  }

  // ── Session depth ────────────────────────────────────────────────
  if (user.sessionDepthMinutes !== undefined && user.sessionDepthMinutes < 5 && user.lifecycleState !== 'Lead' && user.lifecycleState !== 'Trial') {
    riskScore += 8;
    factors.push({
      signal: `Average session depth is only ${user.sessionDepthMinutes} minutes — superficial engagement.`,
      weight: 8,
      category: 'engagement',
    });
    recommendations.push({
      action: 'Schedule a 15-minute guided walkthrough to deepen product understanding.',
      priority: 'medium',
      effort: 'Medium',
      expectedImpact: 'High',
    });
  }

  // ── NPS signal ───────────────────────────────────────────────────
  if (user.npsScore !== undefined && user.npsScore <= 5) {
    riskScore += 12;
    factors.push({
      signal: `NPS score is ${user.npsScore} — user is a detractor.`,
      weight: 12,
      category: 'satisfaction',
    });
    recommendations.push({
      action: 'Route to NPS follow-up flow with detractor branch. Flag for CS review.',
      priority: 'high',
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  }

  // ── Login frequency trend (30 day) ──────────────────────────────
  if (user.loginFrequencyLast30Days !== undefined && user.loginFrequencyLast30Days < 5 && user.lifecycleState !== 'Lead' && user.lifecycleState !== 'Trial') {
    riskScore += 5;
    factors.push({
      signal: `Only ${user.loginFrequencyLast30Days} logins in 30 days — well below healthy threshold.`,
      weight: 5,
      category: 'engagement',
    });
  }

  // ── Default recommendations if none triggered ───────────────────
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'Continue monitoring — no immediate intervention needed.',
      priority: 'low',
      effort: 'Low',
      expectedImpact: 'Low',
    });
  }

  riskScore = Math.min(Math.max(riskScore, 0), 100);
  const finalScore = Math.round(riskScore);

  return {
    riskScore: finalScore,
    riskTier: getRiskTier(finalScore),
    explanation: factors.length > 0
      ? factors.map((f) => f.signal).join(' ')
      : 'No significant risk signals detected. User appears healthy.',
    factors,
    recommendations,
    estimatedMrrAtRisk: finalScore >= 40 ? user.mrr : 0,
  };
}
