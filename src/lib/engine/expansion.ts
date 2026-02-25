/* ==========================================================================
 * Expansion Signal Detection Engine
 *
 * Scans users and accounts for expansion opportunities based on
 * resource utilization, feature gating, and behavioral signals.
 *
 * Detected signal types:
 *   • seat_cap      — Seat utilization ≥ 80%
 *   • plan_limit    — API calls approaching limit
 *   • heavy_usage   — Using most/all premium features
 *   • api_throttle  — API throttle events detected
 *   • feature_gate  — Attempted access to features not in plan
 *
 * Each detection returns a confidence score, revenue uplift estimate,
 * and a suggested plan upgrade.
 * ========================================================================== */

import type { User, Account, ExpansionOpportunity, ExpansionSignal, PlanTier } from '@/lib/definitions';

/* ── Configuration ──────────────────────────────────────────────────── */

const PLAN_HIERARCHY: PlanTier[] = ['Trial', 'Starter', 'Growth', 'Business', 'Enterprise'];

const PLAN_MRR: Record<PlanTier, number> = {
  Trial: 0,
  Starter: 49,
  Growth: 149,
  Business: 349,
  Enterprise: 799,
};

/** Features available per plan (cumulative) */
const PLAN_FEATURES: Record<PlanTier, string[]> = {
  Trial: ['Dashboard'],
  Starter: ['Dashboard', 'Reports', 'Flows'],
  Growth: ['Dashboard', 'Reports', 'Flows', 'Analytics', 'Exports'],
  Business: ['Dashboard', 'Reports', 'Flows', 'Analytics', 'Exports', 'Integrations', 'API Access'],
  Enterprise: ['Dashboard', 'Reports', 'Flows', 'Analytics', 'Exports', 'Integrations', 'API Access', 'SSO', 'Webhooks', 'Custom Flows'],
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function nextPlan(current: PlanTier): PlanTier {
  const idx = PLAN_HIERARCHY.indexOf(current);
  if (idx === -1 || idx >= PLAN_HIERARCHY.length - 1) return current;
  return PLAN_HIERARCHY[idx + 1];
}

/**
 * Expansion-ID counter persisted via globalThis so it survives HMR
 * reloads and never collides within a process lifetime.
 */
const _g = globalThis as unknown as { __lcos_expansion_counter?: number };
if (!_g.__lcos_expansion_counter) _g.__lcos_expansion_counter = 100;

function nextExpId(): string {
  _g.__lcos_expansion_counter = (_g.__lcos_expansion_counter ?? 100) + 1;
  return `exp_auto_${Date.now()}_${_g.__lcos_expansion_counter}`;
}

/* ── Signal Detectors ───────────────────────────────────────────────── */

export interface DetectedSignal {
  signal: ExpansionSignal;
  description: string;
  confidence: number;
  suggestedPlan: PlanTier;
  potentialMrr: number;
  upliftMrr: number;
}

/** Detect seat capacity signals */
function detectSeatCap(user: User, account: Account): DetectedSignal | null {
  if (account.seatLimit <= 0) return null;
  const utilization = account.userCount / account.seatLimit;
  if (utilization < 0.8) return null;

  const suggested = nextPlan(account.plan);
  if (suggested === account.plan) return null;

  return {
    signal: 'seat_cap',
    description: `Using ${account.userCount} of ${account.seatLimit} seats (${Math.round(utilization * 100)}%)`,
    confidence: Math.min(60 + Math.round(utilization * 35), 98),
    suggestedPlan: suggested,
    potentialMrr: PLAN_MRR[suggested] * Math.ceil(account.userCount / 10),
    upliftMrr: PLAN_MRR[suggested] * Math.ceil(account.userCount / 10) - account.mrr,
  };
}

/** Detect API limit signals */
function detectPlanLimit(user: User): DetectedSignal | null {
  if (user.apiLimit <= 0) return null;
  const utilization = user.apiCallsLast30Days / user.apiLimit;
  if (utilization < 0.8) return null;

  const currentPlan = user.plan as PlanTier;
  const suggested = nextPlan(currentPlan);
  if (suggested === currentPlan) return null;

  return {
    signal: 'plan_limit',
    description: `API usage at ${Math.round(utilization * 100)}% (${user.apiCallsLast30Days.toLocaleString()}/${user.apiLimit.toLocaleString()})`,
    confidence: Math.min(55 + Math.round(utilization * 40), 95),
    suggestedPlan: suggested,
    potentialMrr: PLAN_MRR[suggested],
    upliftMrr: PLAN_MRR[suggested] - (PLAN_MRR[currentPlan] || 0),
  };
}

/** Detect heavy feature usage */
function detectHeavyUsage(user: User): DetectedSignal | null {
  const currentPlan = user.plan as PlanTier;
  const planFeatures = PLAN_FEATURES[currentPlan] ?? [];
  if (planFeatures.length === 0) return null;

  const usageRatio = user.featureUsageLast30Days.length / planFeatures.length;
  if (usageRatio < 0.8) return null;

  const suggested = nextPlan(currentPlan);
  if (suggested === currentPlan) return null;

  return {
    signal: 'heavy_usage',
    description: `Using ${user.featureUsageLast30Days.length} of ${planFeatures.length} available features (${Math.round(usageRatio * 100)}%)`,
    confidence: Math.min(50 + Math.round(usageRatio * 40), 90),
    suggestedPlan: suggested,
    potentialMrr: PLAN_MRR[suggested],
    upliftMrr: PLAN_MRR[suggested] - (PLAN_MRR[currentPlan] || 0),
  };
}

/** Detect API throttling */
function detectApiThrottle(user: User): DetectedSignal | null {
  if (user.apiLimit <= 0) return null;
  const utilization = user.apiCallsLast30Days / user.apiLimit;
  // Throttle detected when usage exceeds 95%
  if (utilization < 0.95) return null;

  const currentPlan = user.plan as PlanTier;
  const suggested = nextPlan(currentPlan);
  if (suggested === currentPlan) return null;

  return {
    signal: 'api_throttle',
    description: `API rate limit hit — usage at ${Math.round(utilization * 100)}% of ${user.apiLimit.toLocaleString()} limit`,
    confidence: Math.min(70 + Math.round((utilization - 0.95) * 500), 98),
    suggestedPlan: suggested,
    potentialMrr: PLAN_MRR[suggested],
    upliftMrr: PLAN_MRR[suggested] - (PLAN_MRR[currentPlan] || 0),
  };
}

/** Detect feature gate hits */
function detectFeatureGate(user: User): DetectedSignal | null {
  const currentPlan = user.plan as PlanTier;
  const planFeatures = PLAN_FEATURES[currentPlan] ?? [];

  // Check if user is using features NOT in their plan
  const gatedFeatures = user.featureUsageLast30Days.filter(
    (f) => !planFeatures.includes(f),
  );

  if (gatedFeatures.length === 0) return null;

  const suggested = nextPlan(currentPlan);
  if (suggested === currentPlan) return null;

  return {
    signal: 'feature_gate',
    description: `Accessed ${gatedFeatures.length} feature(s) outside current plan: ${gatedFeatures.join(', ')}`,
    confidence: Math.min(55 + gatedFeatures.length * 10, 90),
    suggestedPlan: suggested,
    potentialMrr: PLAN_MRR[suggested],
    upliftMrr: PLAN_MRR[suggested] - (PLAN_MRR[currentPlan] || 0),
  };
}

/* ── Main Detection Function ────────────────────────────────────────── */

/**
 * Scan a user (within their account context) for all expansion signals.
 * Returns an array of detected opportunities.
 */
export function detectExpansionSignals(
  user: User,
  account: Account,
): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  const detectors = [
    () => detectSeatCap(user, account),
    () => detectPlanLimit(user),
    () => detectHeavyUsage(user),
    () => detectApiThrottle(user),
    () => detectFeatureGate(user),
  ];

  for (const detect of detectors) {
    const result = detect();
    if (result && result.upliftMrr > 0) {
      signals.push(result);
    }
  }

  return signals;
}

/**
 * Convert detected signals into full ExpansionOpportunity records
 * suitable for persistence in the data store.
 */
export function signalsToOpportunities(
  signals: DetectedSignal[],
  accountId: string,
  accountName: string,
  currentPlan: PlanTier,
  currentMrr: number,
): ExpansionOpportunity[] {
  return signals.map((s) => ({
    id: nextExpId(),
    accountId,
    accountName,
    signal: s.signal,
    signalDescription: s.description,
    currentPlan,
    suggestedPlan: s.suggestedPlan,
    currentMrr,
    potentialMrr: s.potentialMrr,
    upliftMrr: s.upliftMrr,
    confidence: s.confidence,
    status: 'identified' as const,
    identifiedDate: new Date().toISOString().split('T')[0],
  }));
}

/**
 * Compute a composite expansion score (0–100) for a user.
 * Aggregates all detected signals into a single metric.
 */
export function computeExpansionScore(signals: DetectedSignal[]): number {
  if (signals.length === 0) return 0;

  // Take the highest confidence signal as the base
  const maxConfidence = Math.max(...signals.map((s) => s.confidence));

  // Boost slightly for multiple signals (but cap at 98)
  const multiSignalBoost = Math.min((signals.length - 1) * 5, 15);

  return Math.min(maxConfidence + multiSignalBoost, 98);
}
