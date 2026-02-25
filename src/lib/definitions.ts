/* ==========================================================================
 * Core Type Definitions — SaaS Lifecycle Infrastructure Platform
 * ========================================================================== */

/** Lifecycle states that the system engine automatically assigns */
export type LifecycleState =
  | 'Lead'
  | 'Trial'
  | 'Activated'
  | 'PowerUser'
  | 'ExpansionReady'
  | 'AtRisk'
  | 'Churned'
  | 'Reactivated';

/** Account health classification */
export type AccountHealth = 'Good' | 'Fair' | 'Poor';

/** Subscription plan tiers */
export type PlanTier = 'Trial' | 'Starter' | 'Growth' | 'Business' | 'Enterprise';

/** Email flow execution status */
export type FlowStatus = 'Active' | 'Draft' | 'Paused' | 'Archived';

/** Flow trigger type */
export type FlowTriggerType = 'lifecycle_change' | 'event' | 'schedule' | 'manual';

/** Churn risk tier */
export type RiskTier = 'Low' | 'Medium' | 'High' | 'Critical';

/** Expansion signal type */
export type ExpansionSignal = 'seat_cap' | 'plan_limit' | 'heavy_usage' | 'api_throttle' | 'feature_gate';

/** Revenue movement type */
export type RevenueMovement = 'new' | 'expansion' | 'contraction' | 'churn' | 'reactivation';

/** Domain verification status */
export type DomainStatus = 'verified' | 'pending' | 'failed';

/* -------------------------------------------------------------------------- */

/** A tracked user within a SaaS client's product */
export type User = {
  id: string;
  name: string;
  email: string;
  initials: string;
  account: { id: string; name: string };
  lifecycleState: LifecycleState;
  previousState?: LifecycleState;
  mrr: number;
  lastLoginDaysAgo: number;
  loginFrequencyLast7Days: number;
  loginFrequencyLast30Days: number;
  featureUsageLast30Days: string[];
  sessionDepthMinutes: number;
  plan: string;
  signupDate: string;
  activatedDate?: string;
  churnRiskScore: number;
  expansionScore: number;
  npsScore?: number;
  seatCount: number;
  seatLimit: number;
  apiCallsLast30Days: number;
  apiLimit: number;
  /** Number of support tickets raised in the last 30 days */
  supportTicketsLast30Days?: number;
  /** Number of support escalations (tier 2+) in the last 30 days */
  supportEscalations?: number;
  /** Days remaining until contract renewal (negative = overdue) */
  daysUntilRenewal?: number;
  /** ISO timestamp of last lifecycle state transition (for cooldown) */
  stateChangedAt?: string;
};

/** Output from the churn risk analysis engine */
export type ChurnRiskAnalysisOutput = {
  riskScore: number;
  riskTier: RiskTier;
  explanation: string;
  factors: RiskFactor[];
  recommendations: Recommendation[];
  estimatedMrrAtRisk: number;
};

export type RiskFactor = {
  signal: string;
  weight: number;
  description?: string;
  category?: string;
};

export type Recommendation = {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  automatable?: boolean;
  effort?: string;
  expectedImpact?: string;
};

/** A B2B customer account (may contain multiple users) */
export type Account = {
  id: string;
  name: string;
  initials: string;
  mrr: number;
  arr: number;
  userCount: number;
  seatLimit: number;
  health: AccountHealth;
  plan: PlanTier;
  lifecycleDistribution: Partial<Record<LifecycleState, number>>;
  churnRiskScore: number;
  expansionScore: number;
  signupDate: string;
  lastActivityDate: string;
  industry: string;
  primaryContact: string;
  primaryContactEmail: string;
  domain: string;
  contractRenewalDate?: string;
  tags: string[];
};

/** An automated email flow tied to lifecycle triggers */
export type EmailFlow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerType: FlowTriggerType;
  status: FlowStatus;
  steps: FlowStep[];
  recipients: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenueGenerated: number;
  unsubscribeRate: number;
  lastSentDate?: string;
  createdDate: string;
  updatedDate: string;
};

export type FlowStep = {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'action';
  name: string;
  config: Record<string, string | number | boolean>;
  sent?: number;
  opened?: number;
  clicked?: number;
};

/* ==========================================================================
 * Flow Builder — Node-Graph Type System
 *
 * Supports a visual DAG (directed acyclic graph) of nodes connected by
 * edges. Each node has a concrete config discriminated by `nodeType`.
 * ========================================================================== */

/** Every possible node category in the builder */
export type FlowNodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'split'
  | 'filter'
  | 'goto'
  | 'exit';

/* ── Trigger Configs ─────────────────────────────────────────────────── */

export type TriggerKind =
  | 'lifecycle_change'
  | 'event_received'
  | 'schedule'
  | 'manual'
  | 'segment_entry'
  | 'webhook_received'
  | 'date_property';

export interface TriggerNodeConfig {
  kind: TriggerKind;
  /** lifecycle_change: which transitions fire this trigger */
  lifecycleFrom?: LifecycleState[];
  lifecycleTo?: LifecycleState[];
  /** event_received: event name pattern (supports wildcards) */
  eventName?: string;
  eventFilters?: ConditionRule[];
  /** schedule: cron expression */
  cronExpression?: string;
  timezone?: string;
  /** segment_entry: segment id */
  segmentId?: string;
  /** webhook_received: path suffix */
  webhookPath?: string;
  /** date_property: user/account date field + offset */
  dateProperty?: string;
  dateOffsetDays?: number;
  /** Re-enrollment: can a user re-enter? */
  allowReEntry: boolean;
  reEntryCooldownMinutes?: number;
}

/* ── Action Configs ──────────────────────────────────────────────────── */

export type ActionKind =
  | 'send_email'
  | 'send_webhook'
  | 'update_user'
  | 'add_tag'
  | 'remove_tag'
  | 'assign_segment'
  | 'create_task'
  | 'api_call'
  | 'set_variable'
  | 'send_notification';

export interface ActionNodeConfig {
  kind: ActionKind;
  /** send_email */
  emailSubject?: string;
  emailBody?: string;          // supports {{variables}}
  emailFromName?: string;
  emailReplyTo?: string;
  emailTemplateId?: string;
  /** send_webhook */
  webhookUrl?: string;
  webhookMethod?: 'POST' | 'PUT' | 'PATCH';
  webhookHeaders?: Record<string, string>;
  webhookPayload?: string;     // JSON template with {{variables}}
  /** update_user: key-value pairs to set */
  userProperties?: Record<string, string | number | boolean>;
  /** add_tag / remove_tag */
  tag?: string;
  /** assign_segment */
  segmentId?: string;
  /** create_task */
  taskTitle?: string;
  taskAssignee?: string;
  taskPriority?: 'low' | 'medium' | 'high' | 'critical';
  /** api_call (generic) */
  apiUrl?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  apiHeaders?: Record<string, string>;
  apiBodyTemplate?: string;
  apiResponseVariable?: string;
  /** set_variable */
  variableKey?: string;
  variableValue?: string;
  /** send_notification (in-app) */
  notificationTitle?: string;
  notificationBody?: string;
  notificationChannel?: 'in_app' | 'push' | 'sms';
}

/* ── Condition Configs ───────────────────────────────────────────────── */

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_set'
  | 'is_not_set'
  | 'in_list'
  | 'not_in_list'
  | 'matches_regex';

export interface ConditionRule {
  field: string;                       // e.g. "user.lifecycleState", "event.properties.plan"
  operator: ConditionOperator;
  value?: string | number | boolean;
  values?: (string | number)[];        // for in_list / not_in_list
}

export type ConditionLogic = 'AND' | 'OR';

export interface ConditionNodeConfig {
  logic: ConditionLogic;
  rules: ConditionRule[];
  /** The outgoing handles: "yes" (rules pass) and "no" (rules fail) */
}

/* ── Delay Configs ───────────────────────────────────────────────────── */

export type DelayKind =
  | 'fixed_duration'
  | 'until_event'
  | 'until_date'
  | 'until_time_of_day'
  | 'smart_send_time';

export interface DelayNodeConfig {
  kind: DelayKind;
  /** fixed_duration */
  durationMinutes?: number;
  /** until_event */
  waitForEvent?: string;
  waitTimeoutMinutes?: number;
  /** until_date: ISO date string template (can be {{variable}}) */
  untilDate?: string;
  /** until_time_of_day: "HH:mm" */
  untilTime?: string;
  untilTimezone?: string;
  /** smart_send_time: AI-picked window */
  sendWindowStart?: string;   // "HH:mm"
  sendWindowEnd?: string;     // "HH:mm"
}

/* ── Split (A/B Test) Config ─────────────────────────────────────────── */

export interface SplitVariant {
  id: string;
  label: string;
  percentage: number;         // 0–100, all variants must sum to 100
}

export interface SplitNodeConfig {
  variants: SplitVariant[];
  /** Which metric decides the "winner" */
  winnerMetric?: 'open_rate' | 'click_rate' | 'conversion_rate';
  /** Auto-pick winner after N enrollees */
  autoPickAfter?: number;
  winnerId?: string;
}

/* ── Filter Config ───────────────────────────────────────────────────── */

export interface FilterNodeConfig {
  logic: ConditionLogic;
  rules: ConditionRule[];
  /** Users who match continue; others are silently dropped */
}

/* ── GoTo / Exit ─────────────────────────────────────────────────────── */

export interface GoToNodeConfig {
  targetNodeId: string;
  maxLoops?: number;
}

export interface ExitNodeConfig {
  reason?: string;
}

/* ── The Universal Flow Node ─────────────────────────────────────────── */

export interface FlowNodePosition {
  x: number;
  y: number;
}

export interface FlowNodeData {
  label: string;
  description?: string;
  nodeType: FlowNodeType;
  triggerConfig?: TriggerNodeConfig;
  actionConfig?: ActionNodeConfig;
  conditionConfig?: ConditionNodeConfig;
  delayConfig?: DelayNodeConfig;
  splitConfig?: SplitNodeConfig;
  filterConfig?: FilterNodeConfig;
  goToConfig?: GoToNodeConfig;
  exitConfig?: ExitNodeConfig;
  /** Runtime metrics (updated by engine) */
  metrics?: {
    entered: number;
    completed: number;
    failed: number;
    skipped: number;
  };
}

/** A single node in the flow graph — compatible with @xyflow/react */
export interface FlowNodeDef {
  id: string;
  type: string;             // matches React Flow custom node type key
  position: FlowNodePosition;
  data: FlowNodeData;
}

/* ── Edges ───────────────────────────────────────────────────────────── */

export type FlowEdgeLabel = 'yes' | 'no' | string;

export interface FlowEdgeDef {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;     // e.g. 'yes' | 'no' | 'variant-a'
  targetHandle?: string;
  label?: FlowEdgeLabel;
  animated?: boolean;
}

/* ── Flow Variables ──────────────────────────────────────────────────── */

export interface FlowVariable {
  key: string;                         // e.g. "discount_code"
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  defaultValue?: string | number | boolean;
  source?: 'static' | 'user_property' | 'account_property' | 'event_property' | 'api_response';
  sourceField?: string;                // the property path
}

/* ── The Complete Flow Definition ────────────────────────────────────── */

export type FlowBuilderStatus = 'draft' | 'active' | 'paused' | 'archived' | 'error';

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  /** Human-readable trigger description (e.g. 'User starts trial') */
  trigger: string;
  status: FlowBuilderStatus;
  version: number;
  nodes: FlowNodeDef[];
  edges: FlowEdgeDef[];
  variables: FlowVariable[];
  /** Settings */
  settings: FlowSettings;
  /** Aggregate metrics */
  metrics: FlowMetrics;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface FlowSettings {
  /** Global enrollment cap (0 = unlimited) */
  enrollmentCap: number;
  /** Maximum concurrent enrollments */
  maxConcurrentEnrollments: number;
  /** Auto-exit after N days if user is still in flow */
  autoExitDays: number;
  /** Suppress during business hours only */
  respectQuietHours: boolean;
  quietHoursStart?: string;   // "HH:mm"
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  /** Goal metric — when hit, the flow is considered successful for that user */
  goalEvent?: string;
  goalTimeout?: number;        // minutes
  /** Tags applied to enrolled users */
  enrollmentTags?: string[];
  /** Priority relative to other flows (higher = trumps) */
  priority: number;
}

export interface FlowMetrics {
  totalEnrolled: number;
  currentlyActive: number;
  completed: number;
  goalReached: number;
  exitedEarly: number;
  errorCount: number;
  /** Revenue directly attributed to this flow ($) */
  revenueGenerated: number;
  /** Aggregate open rate across all email steps (%) */
  openRate: number;
  /** Aggregate click rate across all email steps (%) */
  clickRate: number;
}

/* ── Flow Enrollment (per-user execution state) ──────────────────────── */

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'exited' | 'error';

export interface FlowEnrollment {
  id: string;
  flowId: string;
  flowVersion: number;
  userId: string;
  accountId?: string;
  status: EnrollmentStatus;
  currentNodeId: string;
  /** Snapshot of variables resolved for this enrollment */
  variables: Record<string, string | number | boolean>;
  /** Timestamps */
  enrolledAt: string;
  lastProcessedAt: string;
  completedAt?: string;
  /** Next scheduled processing time (for delays) */
  nextProcessAt?: string;
  /** Error details if status === 'error' */
  errorMessage?: string;
  errorNodeId?: string;
  /** Execution history for this enrollment */
  history: EnrollmentHistoryEntry[];
}

export interface EnrollmentHistoryEntry {
  nodeId: string;
  nodeName: string;
  nodeType: FlowNodeType;
  action: 'entered' | 'completed' | 'skipped' | 'failed' | 'waiting';
  timestamp: string;
  details?: string;
}

/** Monthly recurring revenue data point */
export type RevenueData = {
  month: string;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnMrr: number;
  reactivationMrr: number;
  netTotal: number;
};

/** Activation funnel stage data */
export type ActivationData = {
  date: string;
  signups: number;
  completedSetup: number;
  reachedAha: number;
  activated: number;
  converted: number;
};

/** Activation milestone definition */
export type ActivationMilestone = {
  id: string;
  name: string;
  description: string;
  completionRate: number;
  avgTimeToComplete: string;
  dropoffRate: number;
};

/** Retention cohort data */
export type RetentionCohort = {
  cohort: string;
  size: number;
  retention: number[];
};

/** Email deliverability metrics data point */
export type DeliverabilityData = {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  unsubscribed: number;
};

/** Email sending domain */
export type SendingDomain = {
  id: string;
  domain: string;
  status: DomainStatus;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  addedDate: string;
  lastChecked: string;
};

/** IP warming schedule */
export type IPWarmingStatus = {
  ip: string;
  phase: number;
  totalPhases: number;
  dailyLimit: number;
  currentDailySent: number;
  startDate: string;
  estimatedCompletionDate: string;
  reputation: number;
};

/** Expansion opportunity */
export type ExpansionOpportunity = {
  id: string;
  accountId: string;
  accountName: string;
  signal: ExpansionSignal;
  signalDescription: string;
  currentPlan: PlanTier;
  suggestedPlan: PlanTier;
  currentMrr: number;
  potentialMrr: number;
  upliftMrr: number;
  confidence: number;
  status: 'identified' | 'contacted' | 'negotiating' | 'converted' | 'declined';
  identifiedDate: string;
  lastActionDate?: string;
};

/** Revenue waterfall data */
export type RevenueWaterfall = {
  month: string;
  startingMrr: number;
  newBusiness: number;
  expansion: number;
  contraction: number;
  churn: number;
  reactivation: number;
  endingMrr: number;
};

/** Activity log entry */
export type ActivityEntry = {
  id: string;
  type: 'lifecycle_change' | 'flow_triggered' | 'risk_alert' | 'expansion_signal' | 'account_event' | 'system';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  accountId?: string;
  metadata?: Record<string, string | number>;
};

/** Team member */
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: 'Admin' | 'Manager' | 'Marketer' | 'Analyst' | 'Viewer';
  lastActive: string;
  status: 'active' | 'invited' | 'deactivated';
};

/** Webhook configuration */
export type WebhookConfig = {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failing';
  secret: string;
  createdDate: string;
  lastTriggered?: string;
  successRate: number;
};
