/* ==========================================================================
 * SDK Type Definitions — @lifecycleos/sdk
 *
 * These types define the public API surface of the LifecycleOS SDK client
 * and the internal wire formats for API communication.
 * ========================================================================== */

/* ── Configuration ──────────────────────────────────────────────────── */

/** SDK initialization options */
export interface LifecycleOSConfig {
  /** Your LifecycleOS project API key (starts with `lcos_live_` or `lcos_test_`) */
  apiKey: string;
  /**
   * API base URL — defaults to the Next.js API routes in the same origin.
   * Override when pointing at a dedicated API server.
   */
  apiBaseUrl?: string;
  /** Environment tag sent with every event. Defaults to `'production'`. */
  environment?: 'production' | 'staging' | 'development';
  /**
   * Maximum number of events buffered before an automatic flush.
   * Defaults to `20`.
   */
  flushAt?: number;
  /**
   * Interval in milliseconds between automatic flushes.
   * Defaults to `10_000` (10 seconds).
   */
  flushInterval?: number;
  /**
   * Maximum number of retry attempts for failed requests.
   * Defaults to `3`.
   */
  maxRetries?: number;
  /**
   * Base delay in milliseconds for exponential backoff.
   * Actual delay = `retryBaseDelay * 2^attempt`. Defaults to `1000`.
   */
  retryBaseDelay?: number;
  /** Enable debug logging to console. Defaults to `false`. */
  debug?: boolean;
  /** Request timeout in milliseconds. Defaults to `10_000`. */
  timeout?: number;
}

/* ── Identify ───────────────────────────────────────────────────────── */

/** Traits passed to `identify()` */
export interface UserTraits {
  email?: string;
  name?: string;
  accountId?: string;
  plan?: string;
  createdAt?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

/** Wire format for the identify call */
export interface IdentifyPayload {
  userId: string;
  traits: UserTraits;
  timestamp: string;
  context: EventContext;
}

/* ── Track ──────────────────────────────────────────────────────────── */

/** Properties attached to a tracked event */
export interface EventProperties {
  userId?: string;
  accountId?: string;
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | undefined;
}

/** Wire format for a single event in a batch */
export interface TrackPayload {
  event: string;
  properties: EventProperties;
  timestamp: string;
  context: EventContext;
  messageId: string;
}

/** Batch of events sent to the ingestion endpoint */
export interface EventBatch {
  batch: TrackPayload[];
  sentAt: string;
}

/* ── Group ──────────────────────────────────────────────────────────── */

/** Traits passed to `group()` */
export interface GroupTraits {
  name?: string;
  industry?: string;
  plan?: string;
  seats?: number;
  arr?: number;
  domain?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Wire format for the group call */
export interface GroupPayload {
  groupId: string;
  traits: GroupTraits;
  timestamp: string;
  context: EventContext;
}

/* ── Common ─────────────────────────────────────────────────────────── */

/** Contextual metadata attached to every payload */
export interface EventContext {
  library: {
    name: string;
    version: string;
  };
  environment: string;
  page?: {
    url?: string;
    title?: string;
    referrer?: string;
  };
  userAgent?: string;
  locale?: string;
  timezone?: string;
}

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

/* ── Webhook Types ──────────────────────────────────────────────────── */

/** Event types that can trigger webhooks */
export type WebhookEventType =
  | 'user.identified'
  | 'user.lifecycle_changed'
  | 'user.risk_score_changed'
  | 'account.updated'
  | 'account.expansion_signal'
  | 'event.tracked'
  | 'flow.triggered'
  | 'flow.completed';

/** Webhook delivery payload */
export interface WebhookDeliveryPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
}

/** Webhook delivery attempt record */
export interface WebhookDeliveryAttempt {
  webhookId: string;
  deliveryId: string;
  url: string;
  event: WebhookEventType;
  statusCode: number | null;
  success: boolean;
  attemptNumber: number;
  timestamp: string;
  error?: string;
  responseTimeMs?: number;
}

/* ── Analytics Types ────────────────────────────────────────────────── */

/** Lifecycle distribution snapshot */
export interface LifecycleDistribution {
  Lead: number;
  Trial: number;
  Activated: number;
  PowerUser: number;
  ExpansionReady: number;
  AtRisk: number;
  Churned: number;
  Reactivated: number;
}

/** KPI summary returned by the analytics endpoints */
export interface KPISummary {
  totalUsers: number;
  totalAccounts: number;
  totalMrr: number;
  totalArr: number;
  avgChurnRisk: number;
  avgExpansionScore: number;
  lifecycleDistribution: LifecycleDistribution;
  mrrByMovement: {
    new: number;
    expansion: number;
    contraction: number;
    churn: number;
    reactivation: number;
  };
}

/* ── Stored Event ───────────────────────────────────────────────────── */

/** An ingested event persisted in the store */
export interface StoredEvent {
  id: string;
  event: string;
  userId?: string;
  accountId?: string;
  properties: EventProperties;
  timestamp: string;
  receivedAt: string;
  messageId?: string;
  context: EventContext;
  processed: boolean;
}

/* ── API Key ────────────────────────────────────────────────────────── */

/** API key record used for authentication */
export interface ApiKeyRecord {
  id: string;
  key: string;
  name: string;
  environment: 'production' | 'staging' | 'development';
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  scopes: string[];
}
