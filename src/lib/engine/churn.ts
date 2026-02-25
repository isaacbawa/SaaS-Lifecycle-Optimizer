/* ==========================================================================
 * Churn Risk Scoring Engine (v2)
 *
 * Production-grade weighted-signal scoring model that evaluates a user's
 * probability of churning.  Replaces the simpler heuristic in actions.ts
 * with a calibrated, category-weighted approach.
 *
 * Signal weights (total = 1.00):
 *   login_frequency_drop   0.25
 *   feature_usage_decline   0.20
 *   session_depth_decrease  0.12
 *   nps_score               0.12
 *   support_escalation      0.08
 *   contract_renewal        0.08
 *   lifecycle_state         0.10
 *   seat_utilization_drop   0.05
 *
 * The engine outputs: risk score (0–100), risk tier, explanation, factor
 * breakdown, actionable recommendations, and estimated MRR at risk.
 * ========================================================================== */

import type { User } from '@/lib/definitions';
import type { ChurnRiskAnalysisOutput, RiskFactor, Recommendation, RiskTier } from '@/lib/definitions';

/* ── Signal Weights ─────────────────────────────────────────────────── */

const WEIGHTS = {
  loginFrequency: 0.25,
  featureUsage: 0.20,
  sessionDepth: 0.12,
  npsScore: 0.12,
  lifecycleState: 0.10,
  supportEscalation: 0.08,
  contractRenewal: 0.08,
  seatUtilization: 0.05,
} as const;

/* ── Tier Classification ────────────────────────────────────────────── */

function getRiskTier(score: number): RiskTier {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

/* ── Individual Signal Scorers ──────────────────────────────────────── */

function scoreLoginFrequency(user: User): { score: number; factor: RiskFactor | null } {
  const { lastLoginDaysAgo, loginFrequencyLast7Days, loginFrequencyLast30Days } = user;

  let raw = 0;

  // No login recently
  if (lastLoginDaysAgo >= 30) raw = 100;
  else if (lastLoginDaysAgo >= 21) raw = 85;
  else if (lastLoginDaysAgo >= 14) raw = 65;
  else if (lastLoginDaysAgo >= 7) raw = 35;
  else raw = Math.max(0, 10 - loginFrequencyLast7Days * 2);

  // Weekly frequency penalty
  if (loginFrequencyLast7Days === 0) raw = Math.max(raw, 80);
  else if (loginFrequencyLast7Days < 2) raw = Math.max(raw, 50);

  // Monthly trend
  if (loginFrequencyLast30Days < 3) raw = Math.max(raw, 70);
  else if (loginFrequencyLast30Days < 8) raw = Math.max(raw, 40);

  raw = Math.min(raw, 100);

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.loginFrequency,
    factor: {
      signal: `Login frequency drop: ${lastLoginDaysAgo}d since last login, ${loginFrequencyLast7Days}/7d, ${loginFrequencyLast30Days}/30d`,
      weight: WEIGHTS.loginFrequency,
      description: raw >= 70
        ? 'Severe disengagement — login activity has dropped sharply.'
        : raw >= 40
          ? 'Declining login patterns — early warning of disengagement.'
          : 'Slightly below-average login frequency.',
      category: 'engagement',
    },
  };
}

function scoreFeatureUsage(user: User): { score: number; factor: RiskFactor | null } {
  const count = user.featureUsageLast30Days.length;

  let raw = 0;
  if (count === 0) raw = 100;
  else if (count === 1) raw = 75;
  else if (count <= 2) raw = 50;
  else if (count <= 3) raw = 25;
  else raw = 0;

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.featureUsage,
    factor: {
      signal: `Feature adoption: only ${count} feature(s) used in 30 days`,
      weight: WEIGHTS.featureUsage,
      description: count === 0
        ? 'No feature usage — user is effectively inactive.'
        : `Limited to ${user.featureUsageLast30Days.join(', ')}.`,
      category: 'adoption',
    },
  };
}

function scoreSessionDepth(user: User): { score: number; factor: RiskFactor | null } {
  const depth = user.sessionDepthMinutes;

  let raw = 0;
  if (depth === 0) raw = 100;
  else if (depth < 3) raw = 80;
  else if (depth < 5) raw = 55;
  else if (depth < 10) raw = 25;
  else raw = 0;

  if (raw <= 5 || user.lifecycleState === 'Lead' || user.lifecycleState === 'Trial') {
    return { score: 0, factor: null };
  }

  return {
    score: raw * WEIGHTS.sessionDepth,
    factor: {
      signal: `Session depth: ${depth}min average — ${raw >= 55 ? 'superficial' : 'below-average'} engagement`,
      weight: WEIGHTS.sessionDepth,
      description: `Average session is ${depth} minutes. Power users average 30+ minutes.`,
      category: 'engagement',
    },
  };
}

function scoreNps(user: User): { score: number; factor: RiskFactor | null } {
  if (user.npsScore === undefined) return { score: 0, factor: null };

  let raw = 0;
  if (user.npsScore <= 3) raw = 100;
  else if (user.npsScore <= 5) raw = 75;
  else if (user.npsScore <= 6) raw = 40;
  else raw = 0;

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.npsScore,
    factor: {
      signal: `NPS score: ${user.npsScore} — ${user.npsScore <= 6 ? 'detractor' : 'passive'}`,
      weight: WEIGHTS.npsScore,
      description: `NPS of ${user.npsScore} indicates dissatisfaction. Scores ≤6 are detractors.`,
      category: 'satisfaction',
    },
  };
}

function scoreLifecycleState(user: User): { score: number; factor: RiskFactor | null } {
  const stateRisk: Record<string, number> = {
    Churned: 100,
    AtRisk: 75,
    Lead: 40,
    Trial: 20,
    Reactivated: 30,
    Activated: 5,
    PowerUser: 0,
    ExpansionReady: 0,
  };

  const raw = stateRisk[user.lifecycleState] ?? 0;
  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.lifecycleState,
    factor: {
      signal: `Lifecycle state: ${user.lifecycleState}`,
      weight: WEIGHTS.lifecycleState,
      description: `Current state "${user.lifecycleState}" carries inherent churn risk of ${raw}%.`,
      category: 'lifecycle',
    },
  };
}

function scoreSeatUtilization(user: User): { score: number; factor: RiskFactor | null } {
  if (user.seatLimit <= 1) return { score: 0, factor: null };

  const utilization = user.seatCount / user.seatLimit;

  // Low utilization = risk (they're paying for seats they don't use)
  let raw = 0;
  if (utilization < 0.1) raw = 80;
  else if (utilization < 0.2) raw = 50;
  else if (utilization < 0.4) raw = 25;
  else raw = 0;

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.seatUtilization,
    factor: {
      signal: `Seat utilization: ${user.seatCount}/${user.seatLimit} (${Math.round(utilization * 100)}%)`,
      weight: WEIGHTS.seatUtilization,
      description: 'Low seat utilization suggests the account may not see enough value to justify the subscription.',
      category: 'value_realization',
    },
  };
}

function scoreSupportEscalation(user: User): { score: number; factor: RiskFactor | null } {
  const tickets = user.supportTicketsLast30Days ?? 0;
  const escalations = user.supportEscalations ?? 0;

  let raw = 0;
  // High ticket volume indicates friction
  if (tickets >= 5) raw = 70;
  else if (tickets >= 3) raw = 45;
  else if (tickets >= 1) raw = 15;

  // Escalations are a stronger signal
  if (escalations >= 3) raw = Math.max(raw, 95);
  else if (escalations >= 2) raw = Math.max(raw, 75);
  else if (escalations >= 1) raw = Math.max(raw, 50);

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.supportEscalation,
    factor: {
      signal: `Support escalations: ${escalations} escalations, ${tickets} tickets in 30 days`,
      weight: WEIGHTS.supportEscalation,
      description: escalations > 0
        ? `${escalations} support escalation(s) indicate serious friction or unresolved problems.`
        : `${tickets} support tickets suggest the user is struggling with the product.`,
      category: 'support',
    },
  };
}

function scoreContractRenewal(user: User): { score: number; factor: RiskFactor | null } {
  const daysToRenewal = user.daysUntilRenewal ?? 365;

  let raw = 0;
  // Risk increases as renewal approaches, especially if there are other risk signals
  if (daysToRenewal <= 14) raw = 85;
  else if (daysToRenewal <= 30) raw = 60;
  else if (daysToRenewal <= 60) raw = 35;
  else if (daysToRenewal <= 90) raw = 15;
  else raw = 0;

  // If past renewal (negative days implies overdue), max risk
  if (daysToRenewal <= 0) raw = 100;

  if (raw <= 5) return { score: 0, factor: null };

  return {
    score: raw * WEIGHTS.contractRenewal,
    factor: {
      signal: `Contract renewal: ${daysToRenewal} days until renewal`,
      weight: WEIGHTS.contractRenewal,
      description: daysToRenewal <= 30
        ? `Renewal in ${daysToRenewal} days — critical window for retention action.`
        : `Renewal approaching in ${daysToRenewal} days. Prepare retention strategy.`,
      category: 'contract',
    },
  };
}

/* ── Recommendation Engine ──────────────────────────────────────────── */

function generateRecommendations(
  score: number,
  tier: RiskTier,
  factors: RiskFactor[],
  user: User,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const categories = new Set(factors.map((f) => f.category));

  // Critical — immediate intervention
  if (tier === 'Critical') {
    if (user.lifecycleState === 'Churned') {
      recs.push({
        action: 'Trigger Win-Back Campaign flow with a personalized re-engagement offer.',
        priority: 'critical',
        automatable: true,
        effort: 'Low',
        expectedImpact: 'High',
      });
      recs.push({
        action: 'Review exit survey and last 5 support tickets for root cause analysis.',
        priority: 'critical',
        automatable: false,
        effort: 'Medium',
        expectedImpact: 'High',
      });
    } else {
      recs.push({
        action: 'Assign account to senior CS rep for personal outreach within 24 hours.',
        priority: 'critical',
        automatable: false,
        effort: 'Medium',
        expectedImpact: 'High',
      });
    }
  }

  // Engagement-specific
  if (categories.has('engagement')) {
    if (score >= 60) {
      recs.push({
        action: 'Send urgent re-engagement email with personalized product updates.',
        priority: 'high',
        automatable: true,
        effort: 'Low',
        expectedImpact: 'Medium',
      });
    } else {
      recs.push({
        action: 'Schedule a 15-minute guided walkthrough focused on underutilized features.',
        priority: 'medium',
        automatable: false,
        effort: 'Medium',
        expectedImpact: 'High',
      });
    }
  }

  // Adoption-specific
  if (categories.has('adoption')) {
    recs.push({
      action: `Trigger Feature Adoption flow for features not in [${user.featureUsageLast30Days.join(', ')}].`,
      priority: score >= 60 ? 'high' : 'medium',
      automatable: true,
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  }

  // Satisfaction-specific
  if (categories.has('satisfaction') && user.npsScore !== undefined && user.npsScore <= 6) {
    recs.push({
      action: 'Route to NPS Follow-up flow with detractor branch. Flag for CS review.',
      priority: 'high',
      automatable: true,
      effort: 'Low',
      expectedImpact: 'Medium',
    });
  }

  // Contract renewal approaching
  if (categories.has('contract') || tier === 'High' || tier === 'Critical') {
    recs.push({
      action: 'Review account health dashboard and prepare retention offer before renewal.',
      priority: 'medium',
      automatable: false,
      effort: 'High',
      expectedImpact: 'High',
    });
  }

  // Fallback
  if (recs.length === 0) {
    recs.push({
      action: 'Continue monitoring — no immediate intervention needed.',
      priority: 'low',
      automatable: false,
      effort: 'Low',
      expectedImpact: 'Low',
    });
  }

  return recs;
}

/* ── Main Scoring Function ──────────────────────────────────────────── */

/**
 * Run the full churn risk analysis for a user.
 *
 * This is the production scoring engine that combines 8 weighted signals
 * into a composite risk score, generates per-signal explanations, and
 * produces actionable recommendations.
 */
export function scoreChurnRisk(user: User): ChurnRiskAnalysisOutput {
  // Short-circuit for already churned
  if (user.lifecycleState === 'Churned') {
    return {
      riskScore: 100,
      riskTier: 'Critical',
      explanation: 'User has already churned. Immediate win-back sequence recommended.',
      factors: [
        { signal: 'Lifecycle state is Churned.', weight: 0.50, category: 'lifecycle' },
        { signal: `No login for ${user.lastLoginDaysAgo} days.`, weight: 0.30, category: 'engagement' },
        { signal: 'Zero feature usage in the last 30 days.', weight: 0.20, category: 'adoption' },
      ],
      recommendations: [
        { action: 'Trigger Win-Back Campaign flow with a 50% discount offer.', priority: 'critical', automatable: true, effort: 'Low', expectedImpact: 'High' },
        { action: 'Review exit survey and support ticket history for root cause.', priority: 'high', automatable: false, effort: 'Medium', expectedImpact: 'Medium' },
        { action: 'Schedule personal outreach from CS lead within 48 hours.', priority: 'high', automatable: false, effort: 'Medium', expectedImpact: 'High' },
      ],
      estimatedMrrAtRisk: user.mrr,
    };
  }

  // Compute all 8 signals (weights sum to 1.00)
  const signals = [
    scoreLoginFrequency(user),
    scoreFeatureUsage(user),
    scoreSessionDepth(user),
    scoreNps(user),
    scoreLifecycleState(user),
    scoreSupportEscalation(user),
    scoreContractRenewal(user),
    scoreSeatUtilization(user),
  ];

  let totalScore = 0;
  const factors: RiskFactor[] = [];

  for (const signal of signals) {
    totalScore += signal.score;
    if (signal.factor) {
      factors.push(signal.factor);
    }
  }

  // Clamp to 0–100
  totalScore = Math.min(Math.max(Math.round(totalScore), 0), 100);
  const riskTier = getRiskTier(totalScore);

  // Build explanation
  const explanation = factors.length > 0
    ? factors.map((f) => f.signal).join(' ')
    : 'No significant risk signals detected. User appears healthy.';

  // Generate recommendations
  const recommendations = generateRecommendations(totalScore, riskTier, factors, user);

  // MRR at risk
  const estimatedMrrAtRisk = totalScore >= 35 ? user.mrr : 0;

  return {
    riskScore: totalScore,
    riskTier,
    explanation,
    factors,
    recommendations,
    estimatedMrrAtRisk,
  };
}
