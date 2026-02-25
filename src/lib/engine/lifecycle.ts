/* ==========================================================================
 * Lifecycle State Classification Engine
 *
 * Deterministically classifies a user into one of 8 lifecycle states
 * based on real-time behavioral signals.  The engine is stateless — it
 * takes a user record and returns the computed state.
 *
 * States (in order of lifecycle progression):
 *   Lead → Trial → Activated → PowerUser → ExpansionReady
 *   (At any point: AtRisk → Churned → Reactivated)
 *
 * In production this engine runs on every event ingestion and updates
 * the user's lifecycle state in real-time, emitting webhook events on
 * state transitions.
 * ========================================================================== */

import type { LifecycleState, User } from '@/lib/definitions';

/* ── Thresholds ─────────────────────────────────────────────────────── */

const THRESHOLDS = {
  /** Days since signup beyond which a Trial user without activation becomes a lead again */
  trialExpiryDays: 14,
  /** Minimum features used to be considered "activated" */
  activationMinFeatures: 3,
  /** Minimum session depth (minutes) for activation */
  activationMinSessionDepth: 10,
  /** Minimum login days per 30 days for power user */
  powerUserMinLogins30d: 20,
  /** Minimum features for power user */
  powerUserMinFeatures: 5,
  /** Minimum session depth for power user */
  powerUserMinSessionDepth: 30,
  /** Seat usage percentage to trigger expansion-ready */
  expansionSeatThreshold: 0.8,
  /** API usage percentage to trigger expansion-ready */
  expansionApiThreshold: 0.8,
  /** Days of no login to be considered at-risk */
  atRiskNoLoginDays: 14,
  /** Login frequency below this in 30d signals at-risk */
  atRiskLowFrequency30d: 5,
  /** Days of no login to be considered churned */
  churnedNoLoginDays: 30,
  /** Days since last login for a churned user to be considered "reactivated" */
  reactivationRecencyDays: 7,
} as const;

/* ── Classification ─────────────────────────────────────────────────── */

export interface LifecycleClassification {
  state: LifecycleState;
  confidence: number; // 0–100
  signals: string[];
  previousState?: LifecycleState;
}

/**
 * Classify a user into a lifecycle state using weighted behavioral
 * signals.  Returns the state, confidence score, and the signals that
 * contributed to the classification.
 */
export function classifyLifecycleState(user: User): LifecycleClassification {
  const signals: string[] = [];

  // ── Churned (highest priority — escape hatch) ──────────────────
  if (
    user.lastLoginDaysAgo >= THRESHOLDS.churnedNoLoginDays &&
    user.loginFrequencyLast30Days === 0 &&
    user.featureUsageLast30Days.length === 0
  ) {
    signals.push(`No login for ${user.lastLoginDaysAgo} days`);
    signals.push('Zero feature usage in 30 days');
    signals.push('Zero logins in 30 days');
    return {
      state: 'Churned',
      confidence: 95,
      signals,
      previousState: user.lifecycleState !== 'Churned' ? user.lifecycleState : user.previousState,
    };
  }

  // ── Reactivated (previously churned, now showing life) ─────────
  if (
    user.previousState === 'Churned' &&
    user.lastLoginDaysAgo <= THRESHOLDS.reactivationRecencyDays &&
    user.loginFrequencyLast7Days > 0
  ) {
    signals.push('Previously churned user returned');
    signals.push(`Last login ${user.lastLoginDaysAgo} day(s) ago`);
    signals.push(`${user.loginFrequencyLast7Days} logins in last 7 days`);
    return {
      state: 'Reactivated',
      confidence: 90,
      signals,
      previousState: 'Churned',
    };
  }

  // ── Lead (no meaningful activity yet) ──────────────────────────
  if (
    user.featureUsageLast30Days.length === 0 &&
    user.loginFrequencyLast30Days <= 1 &&
    user.sessionDepthMinutes === 0
  ) {
    signals.push('No feature usage');
    signals.push('Minimal or no logins');
    return {
      state: 'Lead',
      confidence: 85,
      signals,
    };
  }

  // ── At Risk (signals declining before churn) ───────────────────
  const atRiskSignals: string[] = [];
  let atRiskWeight = 0;

  if (user.lastLoginDaysAgo >= THRESHOLDS.atRiskNoLoginDays) {
    atRiskWeight += 35;
    atRiskSignals.push(`No login for ${user.lastLoginDaysAgo} days`);
  }
  if (user.loginFrequencyLast30Days < THRESHOLDS.atRiskLowFrequency30d && user.loginFrequencyLast30Days > 0) {
    atRiskWeight += 25;
    atRiskSignals.push(`Only ${user.loginFrequencyLast30Days} logins in 30 days`);
  }
  if (user.featureUsageLast30Days.length <= 1 && user.plan !== 'Trial') {
    atRiskWeight += 20;
    atRiskSignals.push(`Using only ${user.featureUsageLast30Days.length} feature(s)`);
  }
  if (user.sessionDepthMinutes < 5 && user.plan !== 'Trial') {
    atRiskWeight += 10;
    atRiskSignals.push(`Session depth only ${user.sessionDepthMinutes}min`);
  }
  if (user.npsScore !== undefined && user.npsScore <= 5) {
    atRiskWeight += 10;
    atRiskSignals.push(`NPS score ${user.npsScore} (detractor)`);
  }

  if (atRiskWeight >= 50) {
    return {
      state: 'AtRisk',
      confidence: Math.min(atRiskWeight, 95),
      signals: atRiskSignals,
      previousState: user.lifecycleState !== 'AtRisk' ? user.lifecycleState : user.previousState,
    };
  }

  // ── Expansion Ready (hitting plan limits) ──────────────────────
  const seatUsage = user.seatLimit > 0 ? user.seatCount / user.seatLimit : 0;
  const apiUsage = user.apiLimit > 0 ? user.apiCallsLast30Days / user.apiLimit : 0;

  if (seatUsage >= THRESHOLDS.expansionSeatThreshold || apiUsage >= THRESHOLDS.expansionApiThreshold) {
    const expansionSignals: string[] = [];
    if (seatUsage >= THRESHOLDS.expansionSeatThreshold) {
      expansionSignals.push(`Seat usage at ${Math.round(seatUsage * 100)}%`);
    }
    if (apiUsage >= THRESHOLDS.expansionApiThreshold) {
      expansionSignals.push(`API usage at ${Math.round(apiUsage * 100)}%`);
    }

    // Only expansion-ready if they're also healthy (not at-risk)
    if (
      user.loginFrequencyLast7Days >= 3 &&
      user.featureUsageLast30Days.length >= THRESHOLDS.activationMinFeatures
    ) {
      return {
        state: 'ExpansionReady',
        confidence: Math.min(70 + Math.round(Math.max(seatUsage, apiUsage) * 25), 95),
        signals: expansionSignals,
        previousState: user.lifecycleState !== 'ExpansionReady' ? user.lifecycleState : user.previousState,
      };
    }
  }

  // ── Power User (deep, consistent engagement) ───────────────────
  if (
    user.loginFrequencyLast30Days >= THRESHOLDS.powerUserMinLogins30d &&
    user.featureUsageLast30Days.length >= THRESHOLDS.powerUserMinFeatures &&
    user.sessionDepthMinutes >= THRESHOLDS.powerUserMinSessionDepth
  ) {
    signals.push(`${user.loginFrequencyLast30Days} logins in 30 days`);
    signals.push(`${user.featureUsageLast30Days.length} features used`);
    signals.push(`${user.sessionDepthMinutes}min avg session depth`);
    return {
      state: 'PowerUser',
      confidence: 90,
      signals,
      previousState: user.lifecycleState !== 'PowerUser' ? user.lifecycleState : user.previousState,
    };
  }

  // ── Activated (has reached the "aha moment") ───────────────────
  if (
    user.activatedDate ||
    (user.featureUsageLast30Days.length >= THRESHOLDS.activationMinFeatures &&
      user.sessionDepthMinutes >= THRESHOLDS.activationMinSessionDepth)
  ) {
    signals.push(user.activatedDate ? `Activated on ${user.activatedDate}` : 'Met activation criteria');
    signals.push(`${user.featureUsageLast30Days.length} features used`);
    return {
      state: 'Activated',
      confidence: 85,
      signals,
      previousState: user.lifecycleState !== 'Activated' ? user.lifecycleState : user.previousState,
    };
  }

  // ── Trial (default for users with some but insufficient activity)
  signals.push('User has activity but has not met activation criteria');
  if (user.featureUsageLast30Days.length > 0) {
    signals.push(`${user.featureUsageLast30Days.length} feature(s) used so far`);
  }

  return {
    state: 'Trial',
    confidence: 75,
    signals,
    previousState: user.lifecycleState !== 'Trial' ? user.lifecycleState : user.previousState,
  };
}

/* ── Cooldown Logic ──────────────────────────────────────────────────
 * Prevent rapid state oscillation by enforcing a minimum dwell time
 * before a user can transition *again*.  A transition to Churned or
 * AtRisk is always allowed (safety takes priority over cooldown).
 * ── ───────────────────────────────────────────────────────────────── */

/** Minimum milliseconds a user must dwell in a state before transitioning */
const COOLDOWN_MS: Record<LifecycleState, number> = {
  Lead: 0,           // no cooldown — classify immediately
  Trial: 0,           // ditto
  Activated: 24 * 3600e3, // 1 day
  PowerUser: 48 * 3600e3, // 2 days
  ExpansionReady: 24 * 3600e3, // 1 day
  AtRisk: 0,           // always allow; safety
  Churned: 0,           // always allow; safety
  Reactivated: 72 * 3600e3, // 3 days — give re-engagement time to settle
};

/** States that bypass cooldown enforcement entirely */
const COOLDOWN_EXEMPT: ReadonlySet<LifecycleState> = new Set<LifecycleState>([
  'AtRisk',
  'Churned',
]);

/**
 * Returns true if the cooldown period for the user's *current* state
 * has elapsed (or is not applicable).
 */
function cooldownElapsed(user: User, proposedState: LifecycleState): boolean {
  // Negative-path states always bypass cooldown
  if (COOLDOWN_EXEMPT.has(proposedState)) return true;

  const changedAt = user.stateChangedAt;
  if (!changedAt) return true; // no timestamp → first classification

  const elapsed = Date.now() - new Date(changedAt).getTime();
  const required = COOLDOWN_MS[user.lifecycleState] ?? 0;

  return elapsed >= required;
}

/**
 * Process a user record through the lifecycle engine and return
 * whether a state transition occurred.
 *
 * Transition cooldown: if the user changed state too recently the
 * engine will suppress the new state and keep the current one,
 * unless the proposed state is a safety state (AtRisk / Churned).
 */
export function detectStateTransition(user: User): {
  transitioned: boolean;
  from: LifecycleState;
  to: LifecycleState;
  classification: LifecycleClassification;
  suppressedByCooldown: boolean;
} {
  const classification = classifyLifecycleState(user);
  const proposedDiffers = classification.state !== user.lifecycleState;

  // If the engine wants to move the user but cooldown hasn't elapsed,
  // suppress the transition.
  if (proposedDiffers && !cooldownElapsed(user, classification.state)) {
    return {
      transitioned: false,
      from: user.lifecycleState,
      to: user.lifecycleState,
      classification: {
        ...classification,
        state: user.lifecycleState, // override — keep current state
        signals: [
          ...classification.signals,
          `Cooldown active — dwell time in "${user.lifecycleState}" has not elapsed`,
        ],
      },
      suppressedByCooldown: true,
    };
  }

  return {
    transitioned: proposedDiffers,
    from: user.lifecycleState,
    to: classification.state,
    classification,
    suppressedByCooldown: false,
  };
}
