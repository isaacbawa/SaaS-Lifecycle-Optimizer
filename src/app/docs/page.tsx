'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { CodeBlock } from '@/components/ui/code-block';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    ChevronRight,
    Menu,
    X,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   Table of Contents definition
   ═══════════════════════════════════════════════════════════════════════ */

const tocSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'sdk-installation', label: 'SDK Installation' },
    { id: 'user-identification', label: 'User Identification' },
    { id: 'account-grouping', label: 'Account Grouping' },
    { id: 'event-tracking', label: 'Event Tracking' },
    { id: 'standard-events', label: 'Standard Events' },
    { id: 'lifecycle-states', label: 'Lifecycle States' },
    { id: 'email-flows', label: 'Email Flows' },
    { id: 'churn-risk', label: 'Churn Risk Analysis' },
    { id: 'expansion', label: 'Expansion Intelligence' },
    { id: 'activation', label: 'Activation Funnel' },
    { id: 'revenue', label: 'Revenue Analytics' },
    { id: 'deliverability', label: 'Deliverability' },
    { id: 'rest-api', label: 'REST API Reference' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'use-cases', label: 'Use Cases & Examples' },
    { id: 'rate-limits', label: 'Rate Limits' },
    { id: 'errors', label: 'Error Handling' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Code samples
   ═══════════════════════════════════════════════════════════════════════ */

const installSnippet = `# npm
npm install @lifecycleos/sdk

# yarn
yarn add @lifecycleos/sdk

# pnpm
pnpm add @lifecycleos/sdk`;

const pythonInstallSnippet = `pip install lifecycleos`;

const initJsSnippet = `import { LifecycleOS } from '@lifecycleos/sdk';

const lifecycle = new LifecycleOS({
  apiKey: process.env.LIFECYCLEOS_API_KEY,
  environment: 'production',   // 'production' | 'staging' | 'development'
  flushInterval: 10000,         // batch flush interval in ms (default: 10s)
  maxBatchSize: 100,            // max events per batch (default: 100)
  retryAttempts: 3,             // retry failed requests (default: 3)
});`;

const initPythonSnippet = `from lifecycleos import LifecycleOS

lifecycle = LifecycleOS(
    api_key="lcos_live_a1b2c3d4e5f6g7h8i9j0",
    environment="production",
    flush_interval=10,        # seconds
    max_batch_size=100,
)`;

const identifySnippet = `lifecycle.identify('user-456', {
  email: 'maria@acmecorp.com',
  name: 'Maria Garcia',
  accountId: 'acc-012',
  plan: 'Growth',
  createdAt: '2025-01-10T08:00:00Z',
  traits: {
    role: 'admin',
    department: 'Engineering',
    jobTitle: 'VP of Engineering',
  },
});`;

const identifyPythonSnippet = `lifecycle.identify("user-456", {
    "email": "maria@acmecorp.com",
    "name": "Maria Garcia",
    "account_id": "acc-012",
    "plan": "Growth",
    "created_at": "2025-01-10T08:00:00Z",
    "traits": {
        "role": "admin",
        "department": "Engineering",
    },
})`;

const groupSnippet = `lifecycle.group('acc-012', {
  name: 'Acme Corp',
  industry: 'Technology',
  plan: 'Growth',
  seats: 25,
  seatLimit: 50,
  arr: 59880,
  domain: 'acmecorp.com',
  primaryContact: 'maria@acmecorp.com',
});`;

const trackSnippet = `// Track a product usage event
lifecycle.track('feature_used', {
  userId: 'user-456',
  properties: {
    feature: 'email_flow_builder',
    duration: 120,      // seconds spent
    success: true,
  },
});

// Track a revenue event
lifecycle.track('subscription_upgraded', {
  userId: 'user-456',
  properties: {
    previousPlan: 'Starter',
    newPlan: 'Growth',
    mrrChange: 100,
    reason: 'seat_cap_reached',
  },
});

// Track a lifecycle milestone
lifecycle.track('trial_activated', {
  userId: 'user-456',
  properties: {
    plan: 'Growth',
    activationDay: 3,
    completedSteps: ['profile', 'first_flow', 'domain_verified'],
  },
});`;

const trackPythonSnippet = `lifecycle.track("feature_used", {
    "user_id": "user-456",
    "properties": {
        "feature": "email_flow_builder",
        "duration": 120,
        "success": True,
    },
})`;

const webhookPayloadSnippet = `{
  "id": "evt_a1b2c3d4e5",
  "event": "user.lifecycle_changed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "userId": "user-456",
    "previousState": "Trial",
    "newState": "Activated",
    "account": {
      "id": "acc-012",
      "name": "Acme Corp"
    },
    "metadata": {
      "activationDay": 3,
      "triggerEvent": "domain_verified"
    }
  },
  "signature": "sha256=9f86d0818..."
}`;

const webhookVerifySnippet = `import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
app.post('/webhooks/lifecycleos', (req, res) => {
  const signature = req.headers['x-lifecycleos-signature'];
  const isValid = verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.WEBHOOK_SECRET
  );
  if (!isValid) return res.status(401).send('Invalid signature');

  const { event, data } = req.body;
  switch (event) {
    case 'user.lifecycle_changed':
      handleLifecycleChange(data);
      break;
    case 'user.churn_risk_elevated':
      handleChurnRisk(data);
      break;
    case 'account.expansion_detected':
      handleExpansion(data);
      break;
  }
  res.status(200).send('OK');
});`;

const apiAuthSnippet = `// All API requests require a Bearer token
const response = await fetch('https://api.lifecycleos.com/v1/users/user-456', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer lcos_live_a1b2c3d4e5f6g7h8i9j0',
    'Content-Type': 'application/json',
  },
});

const user = await response.json();`;

const churnAnalysisSnippet = `const response = await fetch(
  'https://api.lifecycleos.com/v1/users/user-456/analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer lcos_live_...',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeRecommendations: true,
      lookbackDays: 30,
    }),
  }
);

const analysis = await response.json();
// Response shape:
// {
//   riskScore: 72,
//   riskTier: "High",
//   explanation: "Login frequency dropped 60% ...",
//   factors: [
//     { signal: "login_frequency_drop", weight: 0.35, category: "engagement" },
//     { signal: "feature_usage_decline", weight: 0.25, category: "product" },
//     ...
//   ],
//   recommendations: [
//     { action: "Trigger re-engagement flow", priority: "high", automatable: true },
//     { action: "Schedule CSM outreach", priority: "medium", automatable: false },
//   ],
//   estimatedMrrAtRisk: 2400,
// }`;

const flowTriggerSnippet = `// Lifecycle change trigger — fires when a user transitions between states
{
  "trigger": "lifecycle_change",
  "conditions": {
    "from": "Trial",
    "to": "Activated"
  },
  "flow": "activation-welcome-sequence"
}

// Event-based trigger — fires on a specific tracked event
{
  "trigger": "event",
  "conditions": {
    "event": "subscription_cancelled",
    "filters": { "plan": ["Growth", "Business"] }
  },
  "flow": "win-back-sequence"
}

// Schedule trigger — fires on a recurring schedule
{
  "trigger": "schedule",
  "conditions": {
    "cron": "0 9 * * 1",
    "timezone": "America/New_York",
    "segment": "at_risk_users"
  },
  "flow": "weekly-at-risk-digest"
}`;

const expansionSnippet = `// Expansion signals are detected automatically. Query them via API:
const response = await fetch(
  'https://api.lifecycleos.com/v1/accounts/acc-012/expansion-signals',
  {
    headers: { 'Authorization': 'Bearer lcos_live_...' },
  }
);

const signals = await response.json();
// Response:
// [
//   {
//     signal: "seat_cap",
//     signalDescription: "Using 23 of 25 seats (92%)",
//     currentPlan: "Growth",
//     suggestedPlan: "Business",
//     currentMrr: 149,
//     potentialMrr: 349,
//     upliftMrr: 200,
//     confidence: 0.87,
//     status: "identified",
//   }
// ]`;

const domainSetupSnippet = `// 1. Add your sending domain via the API
const response = await fetch(
  'https://api.lifecycleos.com/v1/deliverability/domains',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer lcos_live_...',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: 'mail.acmecorp.com',
    }),
  }
);

// Response includes DNS records to configure:
// {
//   "id": "dom-abc123",
//   "domain": "mail.acmecorp.com",
//   "status": "pending",
//   "dnsRecords": {
//     "dkim": {
//       "type": "CNAME",
//       "name": "lcos._domainkey.mail.acmecorp.com",
//       "value": "dkim.lifecycleos.com"
//     },
//     "spf": {
//       "type": "TXT",
//       "name": "mail.acmecorp.com",
//       "value": "v=spf1 include:spf.lifecycleos.com ~all"
//     },
//     "dmarc": {
//       "type": "TXT",
//       "name": "_dmarc.mail.acmecorp.com",
//       "value": "v=DMARC1; p=quarantine; rua=mailto:dmarc@lifecycleos.com"
//     }
//   }
// }

// 2. After configuring DNS, verify:
await fetch(
  'https://api.lifecycleos.com/v1/deliverability/domains/dom-abc123/verify',
  {
    method: 'POST',
    headers: { 'Authorization': 'Bearer lcos_live_...' },
  }
);`;

const errorResponseSnippet = `// Error response format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The 'email' field is required for user identification.",
    "details": {
      "field": "email",
      "constraint": "required"
    }
  },
  "requestId": "req_a1b2c3d4e5"
}

// Common error codes:
// AUTHENTICATION_ERROR  — Invalid or expired API key
// AUTHORIZATION_ERROR   — Insufficient permissions for this action
// VALIDATION_ERROR      — Request body failed validation
// NOT_FOUND             — Resource does not exist
// RATE_LIMIT_EXCEEDED   — Too many requests, retry after cooldown
// CONFLICT              — Resource state conflict (e.g., duplicate)
// INTERNAL_ERROR        — Server error, contact support with requestId`;

const useCaseActivationSnippet = `// Use Case: Accelerate trial-to-paid activation
//
// Goal: Identify users who signed up but haven't completed key
// activation milestones, then nudge them with targeted emails.

// Step 1: SDK tracks activation milestones automatically
lifecycle.track('setup_step_completed', {
  userId: 'user-789',
  properties: {
    step: 'domain_verified',
    stepNumber: 3,
    totalSteps: 5,
  },
});

// Step 2: The lifecycle engine detects stalled trials.
// If a user hasn't reached "Activated" state by day 3,
// they enter the "activation-nudge" flow automatically.

// Step 3: The flow sends contextual emails:
// Day 3 — "You're 2 steps away from seeing your first lifecycle report"
// Day 5 — "Here's what [similar company] achieved after activating"
// Day 7 — "Your trial ends in 7 days — let's get you set up"

// Step 4: If the user activates, the flow stops automatically.
// If they don't, the engine escalates to "AtRisk" state
// and triggers the churn-prevention flow.`;

const useCaseChurnSnippet = `// Use Case: Prevent churn before it happens
//
// Goal: Detect at-risk users through behavioral signals
// and intervene with automated + human outreach.

// The churn risk engine continuously scores every user based on:
// - Login frequency decline (compared to their own baseline)
// - Feature usage drop (fewer features used in last 14 days)
// - Support ticket sentiment (negative keywords detected)
// - NPS score below 7
// - Approaching contract renewal with declining engagement

// When riskScore crosses the "High" threshold (score >= 60):
// 1. User's lifecycle state changes to "AtRisk"
// 2. Webhook fires: "user.churn_risk_elevated"
// 3. Automated flow triggers:
//    - Email: "We noticed you haven't used [top feature] recently"
//    - If no engagement in 48h: personal email from CSM
//    - If still no engagement: Slack alert to account team
// 4. Expansion intelligence pauses for this user
//    (no upgrade prompts while resolving risk)`;

const useCaseExpansionSnippet = `// Use Case: Capture expansion revenue from power users
//
// Goal: Detect accounts approaching plan limits and
// present upgrade opportunities at the right moment.

// Expansion signals detected automatically:
// - seat_cap:      Using 92% of seat allocation
// - api_throttle:  Hitting API rate limits regularly
// - plan_limit:    Approaching tracked user limit
// - heavy_usage:   Feature usage 3x above plan median
// - feature_gate:  Attempted to access a higher-tier feature

// When signal confidence >= 0.7:
// 1. Opportunity created in Expansion dashboard
// 2. Webhook fires: "account.expansion_detected"
// 3. If auto-flow enabled, contextual email triggers:
//    "Your team is using 23 of 25 seats.
//     Upgrade to Business for 50 seats and dedicated IP sending."
// 4. Revenue attribution tracks if the upgrade converts,
//    crediting the expansion flow in the Revenue dashboard.`;

/* ═══════════════════════════════════════════════════════════════════════
   Standard events reference table
   ═══════════════════════════════════════════════════════════════════════ */

const standardEvents = [
    { event: 'user_signed_up', category: 'Lifecycle', description: 'A new user creates an account. This is the entry point for the lifecycle engine. The user is assigned the "Lead" state.', required: 'userId, email', optional: 'name, plan, accountId' },
    { event: 'trial_started', category: 'Lifecycle', description: 'Trial period begins for a user. Transitions the user from "Lead" to "Trial" state.', required: 'userId, plan', optional: 'trialDays, accountId' },
    { event: 'trial_activated', category: 'Lifecycle', description: 'User completes activation criteria during trial. Transitions from "Trial" to "Activated".', required: 'userId, activationDay', optional: 'completedSteps, plan' },
    { event: 'subscription_created', category: 'Revenue', description: 'A new paid subscription is created. Used for MRR/ARR calculations and revenue attribution.', required: 'userId, plan, mrr', optional: 'billingCycle, currency' },
    { event: 'subscription_upgraded', category: 'Revenue', description: 'User upgrades to a higher plan. Records the MRR delta for expansion revenue tracking.', required: 'userId, previousPlan, newPlan, mrrChange', optional: 'reason' },
    { event: 'subscription_downgraded', category: 'Revenue', description: 'User downgrades to a lower plan. Records negative MRR delta for contraction tracking.', required: 'userId, previousPlan, newPlan, mrrChange', optional: 'reason' },
    { event: 'subscription_cancelled', category: 'Revenue', description: 'User cancels their subscription. Triggers churn recording and win-back flow eligibility.', required: 'userId, reason', optional: 'feedback, effectiveDate' },
    { event: 'feature_used', category: 'Product', description: 'A product feature is used. Tracked for engagement scoring, lifecycle classification, and expansion signal detection.', required: 'userId, feature', optional: 'duration, success, metadata' },
    { event: 'session_started', category: 'Product', description: 'A user session begins. Used to calculate login frequency, session depth, and engagement baselines.', required: 'userId', optional: 'source, device, referrer' },
    { event: 'nps_submitted', category: 'Feedback', description: 'NPS score submitted by a user. Scores below 7 contribute to churn risk. Scores of 9-10 contribute to expansion readiness.', required: 'userId, score', optional: 'comment' },
    { event: 'support_ticket_created', category: 'Support', description: 'A support ticket is opened. High-priority or repeated tickets increase churn risk scoring.', required: 'userId, priority', optional: 'subject, category' },
    { event: 'email_opened', category: 'Email', description: 'An email from a LifecycleOS flow was opened by the recipient. Used for flow performance analytics.', required: 'userId, flowId, stepId', optional: '' },
    { event: 'email_clicked', category: 'Email', description: 'A link inside a LifecycleOS email was clicked. Used for conversion attribution and flow optimization.', required: 'userId, flowId, stepId, link', optional: '' },
];

const categoryColors: Record<string, string> = {
    Lifecycle: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    Revenue: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    Product: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    Feedback: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    Support: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    Email: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
};

/* ═══════════════════════════════════════════════════════════════════════
   Lifecycle states definition
   ═══════════════════════════════════════════════════════════════════════ */

const lifecycleStates = [
    { state: 'Lead', description: 'User has signed up but has not started a trial or subscription. They exist in the system but have no meaningful product engagement yet.', trigger: 'user_signed_up event is tracked.', exits: 'Moves to Trial when trial_started fires, or directly to Activated if immediate activation criteria are met.' },
    { state: 'Trial', description: 'User is in an active trial period. The engine monitors their progress through activation milestones and flags stalled trials for intervention.', trigger: 'trial_started event fires.', exits: 'Moves to Activated when activation criteria (configurable per plan) are completed. Moves to Churned if the trial expires without activation.' },
    { state: 'Activated', description: 'User has completed the minimum activation criteria: typically a combination of profile setup, first feature use, and a core "aha moment" action. They are now an engaged user.', trigger: 'Activation milestone threshold is met (e.g., 3 of 5 milestones completed within trial period).', exits: 'Moves to PowerUser with sustained high engagement. Moves to AtRisk if engagement declines below baseline.' },
    { state: 'PowerUser', description: 'User shows sustained high engagement — frequent logins, broad feature adoption, and deep session activity. These users are the best candidates for expansion.', trigger: 'loginFrequencyLast7Days >= 5, featureUsageLast30Days covers 70%+ of available features, and sessionDepthMinutes >= 30 consistently.', exits: 'Moves to ExpansionReady when plan limits are approached. Moves to AtRisk if engagement drops significantly.' },
    { state: 'ExpansionReady', description: 'User or account is approaching plan limits (seats, API calls, tracked users) or is actively using premium-tier features. This state activates expansion flow eligibility.', trigger: 'Seat usage >= 80%, API usage >= 80%, or feature gate hit on higher-tier feature.', exits: 'Moves back to PowerUser after upgrade. Moves to AtRisk if engagement declines.' },
    { state: 'AtRisk', description: 'User shows behavioral signals consistent with potential churn: login frequency decline, reduced feature usage, negative NPS score, or approaching contract renewal with low engagement.', trigger: 'Churn risk score crosses the "High" threshold (>= 60/100). Specific signals: 50%+ login drop, feature usage decline, NPS < 7, support escalation.', exits: 'Moves back to Activated or PowerUser if re-engagement succeeds. Moves to Churned if subscription is cancelled or trial expires.' },
    { state: 'Churned', description: 'User has cancelled their subscription, their trial expired without conversion, or they have been inactive for more than 90 days on a paid plan.', trigger: 'subscription_cancelled event, trial expiration without payment, or 90-day inactivity threshold.', exits: 'Moves to Reactivated if they return and create a new subscription.' },
    { state: 'Reactivated', description: 'A previously churned user has returned and started a new subscription or trial. These users are tracked separately for cohort analysis and have distinct flow eligibility.', trigger: 'subscription_created or trial_started event fires for a user whose last state was Churned.', exits: 'Follows the same progression: Activated → PowerUser → ExpansionReady, or back to AtRisk if the pattern repeats.' },
];

/* ═══════════════════════════════════════════════════════════════════════
   REST API endpoints reference
   ═══════════════════════════════════════════════════════════════════════ */

const apiEndpoints = [
    { method: 'GET', path: '/users/:id', description: 'Retrieve a user profile, including current lifecycle state, engagement metrics, and plan details.' },
    { method: 'POST', path: '/users/:id/identify', description: 'Create or update a user with traits. Equivalent to the SDK identify() call.' },
    { method: 'POST', path: '/users/:id/analyze', description: 'Run churn risk analysis. Returns risk score, tier, contributing factors, and actionable recommendations.' },
    { method: 'GET', path: '/accounts/:id', description: 'Retrieve account details including MRR, user count, health score, and lifecycle distribution.' },
    { method: 'POST', path: '/accounts/:id/group', description: 'Create or update an account with properties. Equivalent to the SDK group() call.' },
    { method: 'GET', path: '/accounts/:id/expansion-signals', description: 'List detected expansion signals for an account, including confidence scores and suggested plans.' },
    { method: 'POST', path: '/events', description: 'Ingest a batch of events. Supports up to 1,000 events per request. Each event must include a userId and event name.' },
    { method: 'GET', path: '/flows', description: 'List all email flows with their status, trigger configuration, and performance metrics.' },
    { method: 'GET', path: '/flows/:id', description: 'Retrieve a single flow with detailed step-by-step configuration and per-step analytics.' },
    { method: 'POST', path: '/flows/:id/activate', description: 'Activate a draft or paused flow. The flow will begin processing eligible users.' },
    { method: 'POST', path: '/flows/:id/pause', description: 'Pause an active flow. Users currently in the flow will stop receiving emails until resumed.' },
    { method: 'GET', path: '/analytics/revenue', description: 'Revenue analytics: MRR/ARR over time, waterfall data (new, expansion, contraction, churn, reactivation).' },
    { method: 'GET', path: '/analytics/retention', description: 'Retention cohort data. Returns monthly cohorts with week-over-week or month-over-month retention rates.' },
    { method: 'GET', path: '/analytics/activation', description: 'Activation funnel data: signups, setup completions, aha moments, activations, and conversions over time.' },
    { method: 'GET', path: '/deliverability/domains', description: 'List sending domains with verification status (DKIM, SPF, DMARC) and last check timestamps.' },
    { method: 'POST', path: '/deliverability/domains', description: 'Add a new sending domain. Returns DNS records that must be configured before verification.' },
    { method: 'POST', path: '/deliverability/domains/:id/verify', description: 'Trigger DNS verification for a pending domain. Returns updated status.' },
    { method: 'GET', path: '/deliverability/metrics', description: 'Email deliverability metrics: sent, delivered, opened, clicked, bounced, spam complaints, and unsubscribes.' },
    { method: 'GET', path: '/webhooks', description: 'List configured webhook endpoints with their event subscriptions and status.' },
    { method: 'POST', path: '/webhooks', description: 'Create a new webhook endpoint. Specify URL, event subscriptions, and an optional secret for signature verification.' },
    { method: 'DELETE', path: '/webhooks/:id', description: 'Delete a webhook endpoint. Pending deliveries will be discarded.' },
];

const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */

function SectionHeading({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    return (
        <h2
            id={id}
            className="text-2xl sm:text-3xl font-bold tracking-tight scroll-mt-20 pt-8 first:pt-0"
        >
            {children}
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-lg sm:text-xl font-semibold mt-6 mb-2">{children}</h3>
    );
}

function Prose({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-muted-foreground leading-relaxed">{children}</p>
    );
}

function InfoBox({
    type = 'note',
    children,
}: {
    type?: 'note' | 'warning' | 'tip';
    children: React.ReactNode;
}) {
    const styles = {
        note: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300',
        warning:
            'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300',
        tip: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 text-green-800 dark:text-green-300',
    };
    const labels = { note: 'Note', warning: 'Important', tip: 'Tip' };

    return (
        <div className={cn('rounded-lg border p-4 text-sm', styles[type])}>
            <p className="font-semibold mb-1">{labels[type]}</p>
            <div className="leading-relaxed">{children}</div>
        </div>
    );
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('overview');
    const [tocOpen, setTocOpen] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                }
            },
            { rootMargin: '-80px 0px -70% 0px' },
        );

        tocSections.forEach((section) => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <MarketingHeader />

            <main className="flex-1">
                <div className="container py-10 md:py-16">
                    {/* Page header */}
                    <div className="max-w-3xl mb-10">
                        <Badge variant="secondary" className="mb-3">
                            Documentation
                        </Badge>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            LifecycleOS Documentation
                        </h1>
                        <Prose>
                            Complete reference for integrating and operating the LifecycleOS
                            platform — from SDK installation to production deployment. Every
                            section includes working code examples and explains exactly what
                            happens under the hood.
                        </Prose>
                    </div>

                    {/* Mobile TOC toggle */}
                    <div className="lg:hidden mb-6">
                        <button
                            type="button"
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2 w-full"
                            onClick={() => setTocOpen(!tocOpen)}
                        >
                            {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            Table of Contents
                        </button>
                        {tocOpen && (
                            <nav className="mt-2 border rounded-lg p-3 bg-muted/30">
                                <ul className="space-y-1">
                                    {tocSections.map((s) => (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                onClick={() => setTocOpen(false)}
                                                className={cn(
                                                    'block text-sm py-1 px-2 rounded transition-colors',
                                                    activeSection === s.id
                                                        ? 'text-primary font-medium bg-primary/5'
                                                        : 'text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {s.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </div>

                    {/* Two-column layout */}
                    <div className="flex gap-10 lg:gap-16">
                        {/* Sticky sidebar TOC — desktop */}
                        <aside className="hidden lg:block w-56 shrink-0">
                            <nav className="sticky top-20">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    On this page
                                </p>
                                <ul className="space-y-0.5">
                                    {tocSections.map((s) => (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                className={cn(
                                                    'block text-sm py-1 px-2 rounded transition-colors',
                                                    activeSection === s.id
                                                        ? 'text-primary font-medium bg-primary/5'
                                                        : 'text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {s.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>

                        {/* Main content */}
                        <article className="min-w-0 flex-1 max-w-4xl space-y-8">
                            {/* ─── Overview ────────────────────────────── */}
                            <section>
                                <SectionHeading id="overview">Overview</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        LifecycleOS is a lifecycle infrastructure platform built
                                        exclusively for SaaS companies. It connects your product
                                        data to automated email flows that activate trials, prevent
                                        churn, and expand accounts — all driven by real user
                                        behavior.
                                    </Prose>
                                    <Prose>
                                        The platform consists of four core layers:
                                    </Prose>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-2">
                                        <li>
                                            <strong className="text-foreground">Event SDK</strong> —
                                            Lightweight client (JavaScript &amp; Python) that tracks
                                            user identification, product events, and revenue events.
                                            Auto-batching, retry logic, and schema validation are
                                            built in.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Lifecycle Engine</strong> —
                                            Real-time classification engine that assigns each user one
                                            of eight lifecycle states (Lead, Trial, Activated,
                                            PowerUser, ExpansionReady, AtRisk, Churned, Reactivated)
                                            based on behavioral data.
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Email Flow System</strong> —
                                            Multi-step automated email sequences triggered by lifecycle
                                            state transitions, tracked events, or schedules. Includes
                                            built-in deliverability infrastructure (DKIM, SPF, DMARC,
                                            IP warming).
                                        </li>
                                        <li>
                                            <strong className="text-foreground">Analytics Suite</strong> —
                                            Revenue waterfall (MRR/ARR), retention cohorts, activation
                                            funnel, churn risk scoring, and expansion intelligence —
                                            with direct attribution from email flows to revenue
                                            outcomes.
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Getting Started ─────────────────────── */}
                            <section>
                                <SectionHeading id="getting-started">Getting Started</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        Getting LifecycleOS running in your product takes three
                                        steps. Most teams complete this in under 30 minutes.
                                    </Prose>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        {[
                                            {
                                                step: '1',
                                                title: 'Install the SDK',
                                                desc: 'Add the SDK package to your project and initialize it with your API key. The SDK begins batching events immediately.',
                                            },
                                            {
                                                step: '2',
                                                title: 'Identify users & track events',
                                                desc: 'Call identify() when users log in and track() for product events. The lifecycle engine starts classifying users in real-time.',
                                            },
                                            {
                                                step: '3',
                                                title: 'Configure email flows',
                                                desc: 'Set up automated email sequences in the dashboard. Flows trigger on lifecycle transitions, tracked events, or schedules.',
                                            },
                                        ].map((item) => (
                                            <Card key={item.step}>
                                                <CardHeader className="pb-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary mb-2">
                                                        {item.step}
                                                    </div>
                                                    <CardTitle className="text-base">{item.title}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {item.desc}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <InfoBox type="note">
                                        Your API key is available in the{' '}
                                        <Link href="/settings" className="underline font-medium">
                                            Settings &rarr; API
                                        </Link>{' '}
                                        section of the dashboard. Use a live key for production and
                                        a test key for development. Test keys prefix events with{' '}
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
                                            test_
                                        </code>{' '}
                                        and do not affect live lifecycle states.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── SDK Installation ────────────────────── */}
                            <section>
                                <SectionHeading id="sdk-installation">SDK Installation</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <SubHeading>JavaScript / TypeScript</SubHeading>
                                    <Prose>
                                        The JavaScript SDK works in Node.js (v16+), browser
                                        environments, and edge runtimes. It ships with TypeScript
                                        declarations.
                                    </Prose>
                                    <CodeBlock code={installSnippet} />
                                    <Prose>Initialize the SDK once at your application entry point:</Prose>
                                    <CodeBlock code={initJsSnippet} />

                                    <SubHeading>Python</SubHeading>
                                    <Prose>
                                        The Python SDK supports Python 3.8+ and provides the same
                                        identify, track, and group methods with automatic batching.
                                    </Prose>
                                    <CodeBlock code={pythonInstallSnippet} />
                                    <CodeBlock code={initPythonSnippet} />

                                    <InfoBox type="tip">
                                        Set <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">environment</code> to{' '}
                                        <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">&quot;development&quot;</code>{' '}
                                        during local development. Events sent in development mode are
                                        visible in the dashboard under the &quot;Dev&quot; tab but do not
                                        affect production lifecycle states or analytics.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── User Identification ─────────────────── */}
                            <section>
                                <SectionHeading id="user-identification">User Identification</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The <code className="bg-muted px-1.5 py-0.5 rounded text-sm">identify()</code> method
                                        creates or updates a user in LifecycleOS. Call it whenever a
                                        user logs in, updates their profile, or when you learn new
                                        information about them.
                                    </Prose>

                                    <SubHeading>JavaScript</SubHeading>
                                    <CodeBlock code={identifySnippet} />

                                    <SubHeading>Python</SubHeading>
                                    <CodeBlock code={identifyPythonSnippet} />

                                    <SubHeading>Parameters</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Parameter</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Required</TableHead>
                                                    <TableHead>Description</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">userId</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>Yes</TableCell>
                                                    <TableCell className="text-muted-foreground">Your internal user ID. Must be unique and stable.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">email</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>Yes</TableCell>
                                                    <TableCell className="text-muted-foreground">User&apos;s email address. Used for email flows and deduplication.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">name</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Full name for personalization in email templates.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">accountId</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Associates this user with an account. Required for B2B lifecycle tracking.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">plan</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Current subscription plan name. Used for segmentation and expansion detection.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">createdAt</code></TableCell>
                                                    <TableCell>string (ISO 8601)</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">When the user originally created their account in your system.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">traits</code></TableCell>
                                                    <TableCell>object</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Arbitrary key-value pairs for segmentation (role, department, etc.).</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <InfoBox type="warning">
                                        The <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">userId</code> you
                                        provide must be stable across sessions. Do not use ephemeral
                                        session IDs. Anonymous events tracked before{' '}
                                        <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">identify()</code> is
                                        called are not counted toward your tracked user limit.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Account Grouping ────────────────────── */}
                            <section>
                                <SectionHeading id="account-grouping">Account Grouping</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The <code className="bg-muted px-1.5 py-0.5 rounded text-sm">group()</code> method
                                        associates users with a company or account. This is essential
                                        for B2B SaaS where multiple users belong to a single paying
                                        account.
                                    </Prose>
                                    <CodeBlock code={groupSnippet} />
                                    <Prose>
                                        Account grouping enables:
                                    </Prose>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                                        <li>Account-level health scoring (aggregated from individual user behavior)</li>
                                        <li>Account-level lifecycle distribution (how many users in each state)</li>
                                        <li>Expansion signal detection based on collective seat and API usage</li>
                                        <li>Account-level churn risk (if multiple users disengage simultaneously)</li>
                                        <li>Revenue attribution at the account level (MRR, ARR, plan)</li>
                                    </ul>
                                    <InfoBox type="note">
                                        If a user is identified with an{' '}
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">accountId</code>{' '}
                                        that does not yet exist, the account will be created
                                        automatically with the user as the primary contact. Call{' '}
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">group()</code>{' '}
                                        to add additional metadata (industry, plan, seats) afterward.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Event Tracking ──────────────────────── */}
                            <section>
                                <SectionHeading id="event-tracking">Event Tracking</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The <code className="bg-muted px-1.5 py-0.5 rounded text-sm">track()</code> method
                                        records events for lifecycle classification, flow triggers,
                                        and analytics. Events are batched locally and flushed to the
                                        API at the configured interval.
                                    </Prose>

                                    <SubHeading>JavaScript</SubHeading>
                                    <CodeBlock code={trackSnippet} />

                                    <SubHeading>Python</SubHeading>
                                    <CodeBlock code={trackPythonSnippet} />

                                    <SubHeading>Event structure</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Field</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Required</TableHead>
                                                    <TableHead>Description</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">eventName</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>Yes</TableCell>
                                                    <TableCell className="text-muted-foreground">The event name. Use snake_case for consistency.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">userId</code></TableCell>
                                                    <TableCell>string</TableCell>
                                                    <TableCell>Yes</TableCell>
                                                    <TableCell className="text-muted-foreground">The user this event belongs to. Must match an identified user.</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">properties</code></TableCell>
                                                    <TableCell>object</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Arbitrary key-value pairs specific to this event. Certain properties are required for standard events (see below).</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><code className="text-xs bg-muted px-1 rounded">timestamp</code></TableCell>
                                                    <TableCell>string (ISO 8601)</TableCell>
                                                    <TableCell>No</TableCell>
                                                    <TableCell className="text-muted-foreground">Defaults to the current time. Use this to backfill historical events.</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <InfoBox type="tip">
                                        Track revenue events (subscription_created, subscription_upgraded, subscription_cancelled) server-side for accuracy. Client-side tracking is fine for product usage events.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Standard Events ─────────────────────── */}
                            <section>
                                <SectionHeading id="standard-events">Standard Events</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The following events are recognized by the LifecycleOS
                                        engine for automatic lifecycle state transitions, flow
                                        triggers, and analytics calculations. You can also define
                                        custom events — they will appear in analytics but won&apos;t
                                        trigger built-in logic unless you configure a flow for them.
                                    </Prose>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Event</TableHead>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Required Properties</TableHead>
                                                    <TableHead>Optional</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {standardEvents.map((ev) => (
                                                    <TableRow key={ev.event}>
                                                        <TableCell>
                                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                {ev.event}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={cn(
                                                                    'border-transparent text-xs whitespace-nowrap',
                                                                    categoryColors[ev.category],
                                                                )}
                                                            >
                                                                {ev.category}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground min-w-[200px]">
                                                            {ev.description}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                            {ev.required}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                            {ev.optional || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Lifecycle States ────────────────────── */}
                            <section>
                                <SectionHeading id="lifecycle-states">Lifecycle States</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The lifecycle engine automatically assigns one of eight states
                                        to each tracked user. State transitions are real-time and
                                        based on behavioral data — not manual tagging. Transitions
                                        fire webhooks and can trigger email flows.
                                    </Prose>
                                    <div className="space-y-4">
                                        {lifecycleStates.map((ls) => (
                                            <Card key={ls.state}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {ls.state}
                                                        </Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <p className="text-muted-foreground leading-relaxed">
                                                        {ls.description}
                                                    </p>
                                                    <div>
                                                        <span className="font-medium text-foreground">Entry trigger: </span>
                                                        <span className="text-muted-foreground">{ls.trigger}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-foreground">Exits: </span>
                                                        <span className="text-muted-foreground">{ls.exits}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <InfoBox type="note">
                                        State transitions are unidirectional in the primary flow
                                        (Lead → Trial → Activated → PowerUser → ExpansionReady)
                                        but can move backward to AtRisk from any active state.
                                        The Reactivated state is only reachable from Churned. The
                                        engine evaluates state every time a new event is processed
                                        for that user.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Email Flows ─────────────────────────── */}
                            <section>
                                <SectionHeading id="email-flows">Email Flows</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        Email flows are multi-step automated sequences that trigger
                                        when a user meets specific criteria. Each flow consists of
                                        ordered steps: emails, delays, conditions, and actions.
                                    </Prose>

                                    <SubHeading>Trigger types</SubHeading>
                                    <Prose>
                                        Flows can be triggered by three mechanisms. Here are
                                        configuration examples for each:
                                    </Prose>
                                    <CodeBlock code={flowTriggerSnippet} />

                                    <SubHeading>Flow step types</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Configuration</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell><Badge variant="outline" className="text-xs">email</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground">Send an email to the user. Supports personalization variables and conditional content blocks.</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-mono">subject, templateId, replyTo</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><Badge variant="outline" className="text-xs">delay</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground">Wait a specified duration before proceeding to the next step.</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-mono">hours, days</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><Badge variant="outline" className="text-xs">condition</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground">Branch the flow based on user attributes, event data, or engagement with previous steps.</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-mono">field, operator, value, trueBranch, falseBranch</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><Badge variant="outline" className="text-xs">action</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground">Execute a system action: update a user trait, fire a webhook, assign a tag, or change lifecycle state.</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-mono">actionType, payload</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>Flow statuses</SubHeading>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                                        <li><strong className="text-foreground">Active</strong> — Processing eligible users. New entrants and existing users in the queue receive steps on schedule.</li>
                                        <li><strong className="text-foreground">Draft</strong> — Being configured. Not processing any users. Ideal for testing email content and triggers.</li>
                                        <li><strong className="text-foreground">Paused</strong> — Previously active but temporarily stopped. Users in the queue will resume when reactivated. No new entrants.</li>
                                        <li><strong className="text-foreground">Archived</strong> — Permanently deactivated. Historical analytics are retained but the flow cannot be reactivated.</li>
                                    </ul>

                                    <InfoBox type="warning">
                                        When a user&apos;s lifecycle state changes mid-flow (e.g., they
                                        move from AtRisk to Churned), the flow evaluates exit
                                        conditions. If the user no longer meets the flow&apos;s entry
                                        criteria, they are removed from the queue automatically.
                                        This prevents sending irrelevant emails.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Churn Risk Analysis ─────────────────── */}
                            <section>
                                <SectionHeading id="churn-risk">Churn Risk Analysis</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The churn risk engine continuously scores every tracked user
                                        on a 0–100 scale based on behavioral signals. The score maps
                                        to a tier: Low (0–29), Medium (30–59), High (60–79), or
                                        Critical (80–100).
                                    </Prose>

                                    <SubHeading>Risk factors</SubHeading>
                                    <Prose>
                                        The scoring model evaluates these weighted signals:
                                    </Prose>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Signal</TableHead>
                                                    <TableHead>Weight</TableHead>
                                                    <TableHead>Description</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { signal: 'login_frequency_drop', weight: '0.30', desc: 'Login count in last 7 days compared to the user\'s own 30-day baseline. A 50%+ drop contributes heavily.' },
                                                    { signal: 'feature_usage_decline', weight: '0.25', desc: 'Number of distinct features used in last 14 days vs. previous 14 days. Fewer features = higher risk.' },
                                                    { signal: 'session_depth_decrease', weight: '0.15', desc: 'Average session duration trending downward. Shallow sessions indicate disengagement.' },
                                                    { signal: 'nps_score_negative', weight: '0.10', desc: 'Most recent NPS score is below 7 (detractor range). Strong signal of dissatisfaction.' },
                                                    { signal: 'support_escalation', weight: '0.10', desc: 'Active support tickets with high priority or repeated contacts within 30 days.' },
                                                    { signal: 'contract_renewal_proximity', weight: '0.10', desc: 'Renewal date within 30 days, combined with declining engagement.' },
                                                ].map((f) => (
                                                    <TableRow key={f.signal}>
                                                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.signal}</code></TableCell>
                                                        <TableCell className="font-mono text-sm">{f.weight}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{f.desc}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>API usage</SubHeading>
                                    <Prose>
                                        You can request a churn risk analysis for any user via the
                                        REST API:
                                    </Prose>
                                    <CodeBlock code={churnAnalysisSnippet} />

                                    <InfoBox type="note">
                                        The analysis endpoint can be called on-demand or configured
                                        to run on a schedule. When the risk tier changes, a{' '}
                                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
                                            user.churn_risk_elevated
                                        </code>{' '}
                                        webhook fires automatically.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Expansion Intelligence ──────────────── */}
                            <section>
                                <SectionHeading id="expansion">Expansion Intelligence</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The expansion detection engine identifies accounts that are
                                        approaching plan limits or exhibiting usage patterns
                                        consistent with a need for a higher-tier plan. Each detected
                                        signal includes a confidence score (0–1) and a suggested
                                        next plan.
                                    </Prose>

                                    <SubHeading>Signal types</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Signal</TableHead>
                                                    <TableHead>Detects</TableHead>
                                                    <TableHead>Example</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { signal: 'seat_cap', detects: 'Seat allocation nearing limit', example: 'Using 23 of 25 seats (92%)' },
                                                    { signal: 'plan_limit', detects: 'Tracked user count approaching plan maximum', example: '9,200 of 10,000 tracked users' },
                                                    { signal: 'api_throttle', detects: 'API call volume hitting rate limits', example: 'Hit rate limit 12 times in last 7 days' },
                                                    { signal: 'heavy_usage', detects: 'Feature usage significantly above plan median', example: 'Sending 3x email volume vs. Growth average' },
                                                    { signal: 'feature_gate', detects: 'Attempted access to a higher-tier feature', example: 'Tried to enable SSO (Enterprise feature)' },
                                                ].map((s) => (
                                                    <TableRow key={s.signal}>
                                                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.signal}</code></TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{s.detects}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground italic">{s.example}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>Querying expansion signals</SubHeading>
                                    <CodeBlock code={expansionSnippet} />

                                    <SubHeading>Opportunity statuses</SubHeading>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                                        <li><strong className="text-foreground">identified</strong> — Signal detected, no action taken yet.</li>
                                        <li><strong className="text-foreground">contacted</strong> — User or account has been reached via automated flow or manual outreach.</li>
                                        <li><strong className="text-foreground">negotiating</strong> — Upgrade conversation is in progress.</li>
                                        <li><strong className="text-foreground">converted</strong> — Upgrade completed. Revenue delta is attributed.</li>
                                        <li><strong className="text-foreground">declined</strong> — User declined the upgrade. Signal is archived.</li>
                                    </ul>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Activation Funnel ───────────────────── */}
                            <section>
                                <SectionHeading id="activation">Activation Funnel</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The activation funnel tracks how users progress from signup
                                        through setup milestones to full activation and conversion.
                                        Each stage is populated by events tracked through the SDK.
                                    </Prose>

                                    <SubHeading>Funnel stages</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Stage</TableHead>
                                                    <TableHead>Event that advances</TableHead>
                                                    <TableHead>Description</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { stage: 'Signups', event: 'user_signed_up', desc: 'Total new users who created an account in the period.' },
                                                    { stage: 'Completed Setup', event: 'setup_step_completed (all required)', desc: 'Users who completed all required setup steps (SDK installed, domain verified, etc.).' },
                                                    { stage: 'Reached Aha', event: 'Custom per-product (e.g., first_flow_created)', desc: 'Users who reached the "aha moment" — the key action that correlates with long-term retention.' },
                                                    { stage: 'Activated', event: 'trial_activated', desc: 'Users who met the full activation criteria. They are now meaningfully engaged.' },
                                                    { stage: 'Converted', event: 'subscription_created', desc: 'Users who converted from trial to a paid subscription.' },
                                                ].map((s) => (
                                                    <TableRow key={s.stage}>
                                                        <TableCell className="font-medium">{s.stage}</TableCell>
                                                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.event}</code></TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{s.desc}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>Activation milestones</SubHeading>
                                    <Prose>
                                        Milestones are configurable checkpoints within the setup
                                        process. The platform tracks completion rate, average time
                                        to complete, and drop-off rate for each milestone. Use these
                                        metrics to identify where users stall and deploy targeted
                                        email flows at those points.
                                    </Prose>
                                    <InfoBox type="tip">
                                        Define your &quot;aha moment&quot; based on data, not assumptions.
                                        Look at which early actions correlate most strongly with
                                        30-day retention. LifecycleOS surfaces this correlation in
                                        the Activation dashboard automatically.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Revenue Analytics ───────────────────── */}
                            <section>
                                <SectionHeading id="revenue">Revenue Analytics</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        Revenue analytics provides month-over-month MRR and ARR
                                        tracking, broken down by movement type. Every revenue change
                                        is attributed to its source — including which email flow
                                        influenced the conversion, upgrade, or win-back.
                                    </Prose>

                                    <SubHeading>MRR waterfall categories</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>What it measures</TableHead>
                                                    <TableHead>Positive/Negative</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { cat: 'Starting MRR', desc: 'MRR at the beginning of the month (carried from previous month\'s ending).', pn: 'Baseline' },
                                                    { cat: 'New Business', desc: 'MRR from accounts that converted from trial to paid for the first time.', pn: 'Positive' },
                                                    { cat: 'Expansion', desc: 'MRR increase from existing accounts upgrading or adding seats.', pn: 'Positive' },
                                                    { cat: 'Contraction', desc: 'MRR decrease from existing accounts downgrading plans or removing seats.', pn: 'Negative' },
                                                    { cat: 'Churn', desc: 'MRR lost from accounts that cancelled their subscription entirely.', pn: 'Negative' },
                                                    { cat: 'Reactivation', desc: 'MRR from previously churned accounts returning to a paid plan.', pn: 'Positive' },
                                                    { cat: 'Ending MRR', desc: 'Starting MRR + New + Expansion − Contraction − Churn + Reactivation.', pn: 'Result' },
                                                ].map((r) => (
                                                    <TableRow key={r.cat}>
                                                        <TableCell className="font-medium">{r.cat}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{r.desc}</TableCell>
                                                        <TableCell className="text-sm">
                                                            <Badge variant="outline" className="text-xs">{r.pn}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>Revenue attribution</SubHeading>
                                    <Prose>
                                        When a user converts, upgrades, or reactivates, the system
                                        checks whether they interacted with an email flow in the
                                        preceding 14-day attribution window. If they did, the revenue
                                        delta is attributed to that flow. This surfaces which flows
                                        are directly contributing to revenue growth in the Revenue
                                        dashboard.
                                    </Prose>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Deliverability ──────────────────────── */}
                            <section>
                                <SectionHeading id="deliverability">Deliverability</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        LifecycleOS includes built-in email sending infrastructure.
                                        Deliverability is not bolted on — it is a core component.
                                        The platform manages DKIM, SPF, and DMARC verification, IP
                                        warming, and real-time inbox placement monitoring.
                                    </Prose>

                                    <SubHeading>Domain setup</SubHeading>
                                    <Prose>
                                        Add your sending domain and configure the DNS records
                                        provided by the API. Verification is automated — the system
                                        checks DNS propagation and marks the domain as verified when
                                        all records are confirmed.
                                    </Prose>
                                    <CodeBlock code={domainSetupSnippet} />

                                    <SubHeading>IP warming</SubHeading>
                                    <Prose>
                                        New sending IPs go through a warming schedule to build
                                        sender reputation. The platform manages this automatically:
                                    </Prose>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                                        <li>The warming process is divided into phases (typically 6–8, spanning 4–6 weeks).</li>
                                        <li>Daily sending limits increase gradually with each phase.</li>
                                        <li>The system monitors delivery rates and pauses warming if reputation dips below thresholds.</li>
                                        <li>Reputation score (0–100) is calculated from bounce rates, spam complaint rates, and inbox placement.</li>
                                    </ul>

                                    <SubHeading>Monitoring metrics</SubHeading>
                                    <Prose>
                                        The deliverability dashboard tracks daily metrics:
                                    </Prose>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-2">
                                        <li><strong className="text-foreground">Sent</strong> — Total emails dispatched.</li>
                                        <li><strong className="text-foreground">Delivered</strong> — Emails accepted by the receiving server.</li>
                                        <li><strong className="text-foreground">Opened</strong> — Recipients who opened the email (pixel tracking).</li>
                                        <li><strong className="text-foreground">Clicked</strong> — Recipients who clicked a link in the email.</li>
                                        <li><strong className="text-foreground">Bounced</strong> — Emails that were rejected (hard or soft bounce).</li>
                                        <li><strong className="text-foreground">Spam</strong> — Emails marked as spam by recipients.</li>
                                        <li><strong className="text-foreground">Unsubscribed</strong> — Recipients who unsubscribed via the email footer link.</li>
                                    </ul>
                                    <InfoBox type="warning">
                                        Keep your spam complaint rate below 0.1% and bounce rate
                                        below 2%. The platform will alert you when these thresholds
                                        are approached and can automatically pause sending to protect
                                        your domain reputation.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── REST API Reference ──────────────────── */}
                            <section>
                                <SectionHeading id="rest-api">REST API Reference</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        The REST API is available at{' '}
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                            https://api.lifecycleos.com/v1
                                        </code>
                                        . All requests require a Bearer token in the Authorization
                                        header.
                                    </Prose>

                                    <SubHeading>Authentication</SubHeading>
                                    <CodeBlock code={apiAuthSnippet} />

                                    <SubHeading>Endpoints</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-20">Method</TableHead>
                                                    <TableHead>Endpoint</TableHead>
                                                    <TableHead>Description</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {apiEndpoints.map((ep) => (
                                                    <TableRow key={`${ep.method}-${ep.path}`}>
                                                        <TableCell>
                                                            <Badge
                                                                className={cn(
                                                                    'border-transparent text-xs font-mono',
                                                                    methodColors[ep.method],
                                                                )}
                                                            >
                                                                {ep.method}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                {ep.path}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {ep.description}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Webhooks ────────────────────────────── */}
                            <section>
                                <SectionHeading id="webhooks">Webhooks</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        Webhooks deliver real-time notifications to your server when
                                        lifecycle events occur. Use them to sync LifecycleOS data
                                        with your CRM, Slack, or any internal system.
                                    </Prose>

                                    <SubHeading>Available webhook events</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Event</TableHead>
                                                    <TableHead>Fires when</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { event: 'user.lifecycle_changed', desc: 'A user transitions to a new lifecycle state.' },
                                                    { event: 'user.churn_risk_elevated', desc: 'A user\'s churn risk score crosses into a higher tier.' },
                                                    { event: 'user.activated', desc: 'A user meets activation criteria for the first time.' },
                                                    { event: 'account.expansion_detected', desc: 'An expansion signal is detected for an account.' },
                                                    { event: 'account.health_changed', desc: 'An account\'s health classification changes (Good, Fair, Poor).' },
                                                    { event: 'flow.email_sent', desc: 'An email step in a flow is executed for a user.' },
                                                    { event: 'flow.completed', desc: 'A user completes all steps in a flow.' },
                                                    { event: 'revenue.subscription_changed', desc: 'A subscription is created, upgraded, downgraded, or cancelled.' },
                                                ].map((w) => (
                                                    <TableRow key={w.event}>
                                                        <TableCell>
                                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                {w.event}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{w.desc}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <SubHeading>Payload format</SubHeading>
                                    <CodeBlock code={webhookPayloadSnippet} />

                                    <SubHeading>Signature verification</SubHeading>
                                    <Prose>
                                        Every webhook request includes an{' '}
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                            X-LifecycleOS-Signature
                                        </code>{' '}
                                        header. Verify it to ensure the payload is authentic:
                                    </Prose>
                                    <CodeBlock code={webhookVerifySnippet} />

                                    <InfoBox type="warning">
                                        Always verify signatures before processing webhook
                                        payloads. Use{' '}
                                        <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">
                                            crypto.timingSafeEqual
                                        </code>{' '}
                                        to prevent timing attacks. Respond with a 200 status within
                                        5 seconds — if your endpoint times out, the webhook will be
                                        retried up to 3 times with exponential backoff.
                                    </InfoBox>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Use Cases & Examples ────────────────── */}
                            <section>
                                <SectionHeading id="use-cases">Use Cases &amp; Examples</SectionHeading>
                                <div className="space-y-6 mt-4">
                                    <Prose>
                                        The following are concrete, end-to-end scenarios showing how
                                        LifecycleOS components work together to produce measurable
                                        outcomes. Each use case describes the goal, the technical
                                        implementation, and the expected behavior.
                                    </Prose>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">
                                                Use Case 1: Accelerate trial-to-paid activation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">Goal:</strong> Identify
                                                trial users who have not completed key activation milestones
                                                and nudge them with targeted, contextual emails before the
                                                trial expires.
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">How it works:</strong> The
                                                SDK tracks each setup milestone. The lifecycle engine detects
                                                when a trial user stalls (no progress in 48+ hours). An
                                                automated flow triggers with emails specific to the missing
                                                milestones. If the user activates, the flow exits
                                                automatically.
                                            </p>
                                            <CodeBlock code={useCaseActivationSnippet} />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">
                                                Use Case 2: Prevent churn before it happens
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">Goal:</strong> Detect
                                                at-risk users through declining behavioral signals and
                                                intervene with a combination of automated emails and
                                                team notifications before they cancel.
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">How it works:</strong> The
                                                churn risk engine scores every user continuously. When the
                                                score crosses the &quot;High&quot; threshold, the user moves to the
                                                AtRisk lifecycle state. This triggers a multi-step flow
                                                that escalates from automated email to personal CSM
                                                outreach. Expansion prompts are paused while the risk is
                                                being addressed.
                                            </p>
                                            <CodeBlock code={useCaseChurnSnippet} />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">
                                                Use Case 3: Capture expansion revenue from power users
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">Goal:</strong> Automatically
                                                detect accounts approaching plan limits and present upgrade
                                                opportunities at the moment of highest intent.
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                <strong className="text-foreground">How it works:</strong> The
                                                expansion engine monitors seat usage, API call volume,
                                                tracked user counts, and feature gate hits. When a signal
                                                exceeds the confidence threshold, an expansion opportunity
                                                is created and optionally triggers a contextual email flow.
                                                If the user upgrades, the revenue delta is attributed to
                                                the expansion flow.
                                            </p>
                                            <CodeBlock code={useCaseExpansionSnippet} />
                                        </CardContent>
                                    </Card>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Rate Limits ─────────────────────────── */}
                            <section>
                                <SectionHeading id="rate-limits">Rate Limits</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        API rate limits protect service stability and ensure fair
                                        usage across all accounts. Limits are applied per API key.
                                    </Prose>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Plan</TableHead>
                                                    <TableHead>Requests / minute</TableHead>
                                                    <TableHead>Events / batch</TableHead>
                                                    <TableHead>Webhooks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Starter</TableCell>
                                                    <TableCell>100</TableCell>
                                                    <TableCell>500</TableCell>
                                                    <TableCell>3 endpoints</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Growth</TableCell>
                                                    <TableCell>500</TableCell>
                                                    <TableCell>1,000</TableCell>
                                                    <TableCell>10 endpoints</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Enterprise</TableCell>
                                                    <TableCell>2,000</TableCell>
                                                    <TableCell>5,000</TableCell>
                                                    <TableCell>Unlimited</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <Prose>
                                        When you exceed the rate limit, the API returns HTTP 429
                                        with a{' '}
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                            Retry-After
                                        </code>{' '}
                                        header indicating how many seconds to wait. The SDK handles
                                        this automatically with exponential backoff.
                                    </Prose>
                                </div>
                            </section>

                            <Separator />

                            {/* ─── Error Handling ───────────────────────── */}
                            <section>
                                <SectionHeading id="errors">Error Handling</SectionHeading>
                                <div className="space-y-4 mt-4">
                                    <Prose>
                                        All API errors follow a consistent format. The response body
                                        always includes an error code, human-readable message, and a
                                        request ID for support reference.
                                    </Prose>
                                    <CodeBlock code={errorResponseSnippet} />
                                    <SubHeading>HTTP status codes</SubHeading>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Meaning</TableHead>
                                                    <TableHead>Recommended action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { code: '200', meaning: 'Success', action: 'Process the response body.' },
                                                    { code: '201', meaning: 'Created', action: 'Resource was created successfully.' },
                                                    { code: '400', meaning: 'Bad Request', action: 'Check the error details for the invalid field and fix the request body.' },
                                                    { code: '401', meaning: 'Unauthorized', action: 'Verify your API key. Ensure the Authorization header uses "Bearer" prefix.' },
                                                    { code: '403', meaning: 'Forbidden', action: 'Your API key does not have permission for this endpoint. Check plan limits.' },
                                                    { code: '404', meaning: 'Not Found', action: 'Verify the resource ID. The user or account may not exist yet.' },
                                                    { code: '409', meaning: 'Conflict', action: 'A resource with this identifier already exists. Use update instead of create.' },
                                                    { code: '429', meaning: 'Too Many Requests', action: 'Wait the number of seconds in the Retry-After header, then retry.' },
                                                    { code: '500', meaning: 'Internal Server Error', action: 'Retry the request. If persistent, contact support with the requestId.' },
                                                ].map((e) => (
                                                    <TableRow key={e.code}>
                                                        <TableCell className="font-mono font-medium">{e.code}</TableCell>
                                                        <TableCell className="font-medium">{e.meaning}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{e.action}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <InfoBox type="tip">
                                        Always include the{' '}
                                        <code className="bg-green-100 dark:bg-green-900 px-1 rounded text-xs">
                                            requestId
                                        </code>{' '}
                                        from error responses when contacting support. This allows
                                        the team to trace the exact request in server logs.
                                    </InfoBox>
                                </div>
                            </section>

                            {/* ─── Bottom spacer ────────────────────────── */}
                            <div className="pt-12 pb-4 border-t mt-12">
                                <p className="text-sm text-muted-foreground">
                                    Need help? Reach out at{' '}
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                                        support@lifecycleos.com
                                    </code>{' '}
                                    or visit the{' '}
                                    <Link href="/settings" className="text-primary underline">
                                        Settings
                                    </Link>{' '}
                                    page to manage your API keys and team.
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
            </main>

            <MarketingFooter />
        </div>
    );
}
