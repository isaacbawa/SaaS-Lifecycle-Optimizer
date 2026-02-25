/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk — Core Types
 *
 * All public type definitions for the LifecycleOS SDK.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Configuration ──────────────────────────────────────────────────── */

/** SDK initialization options */
export interface LifecycleOSConfig {
    /** Your LifecycleOS API key (starts with `lcos_live_` or `lcos_test_`) */
    apiKey: string;
    /**
     * API base URL. Defaults to `/api/v1` (same-origin).
     * Set to your LifecycleOS instance URL for cross-origin.
     */
    apiBaseUrl?: string;
    /** Environment tag. Defaults to `'production'`. */
    environment?: 'production' | 'staging' | 'development';
    /** Max events buffered before auto-flush. Defaults to `20`. */
    flushAt?: number;
    /** Auto-flush interval in ms. Defaults to `10000`. */
    flushInterval?: number;
    /** Max retry attempts for failed requests. Defaults to `3`. */
    maxRetries?: number;
    /** Base delay in ms for exponential backoff. Defaults to `1000`. */
    retryBaseDelay?: number;
    /** Enable debug logging. Defaults to `false`. */
    debug?: boolean;
    /** Request timeout in ms. Defaults to `10000`. */
    timeout?: number;
}

/** Resolved config with defaults applied */
export interface ResolvedConfig extends Required<LifecycleOSConfig> { }

/* ── Identify ───────────────────────────────────────────────────────── */

export interface UserTraits {
    email?: string;
    name?: string;
    accountId?: string;
    plan?: string;
    createdAt?: string;
    avatar?: string;
    role?: string;
    [key: string]: string | number | boolean | string[] | undefined;
}

/* ── Track ──────────────────────────────────────────────────────────── */

export interface EventProperties {
    userId?: string;
    accountId?: string;
    [key: string]: string | number | boolean | string[] | Record<string, unknown> | undefined;
}

/* ── Group ──────────────────────────────────────────────────────────── */

export interface GroupTraits {
    name?: string;
    industry?: string;
    plan?: string;
    seats?: number;
    arr?: number;
    domain?: string;
    [key: string]: string | number | boolean | undefined;
}

/* ── Page / Screen ──────────────────────────────────────────────────── */

export interface PageProperties {
    url?: string;
    path?: string;
    title?: string;
    referrer?: string;
    [key: string]: string | undefined;
}

/* ── Internal Wire Formats ──────────────────────────────────────────── */

export interface EventContext {
    library: { name: string; version: string };
    environment: string;
    page?: { url?: string; title?: string; referrer?: string };
    userAgent?: string;
    locale?: string;
    timezone?: string;
}

export interface QueuedEvent {
    event: string;
    properties: EventProperties;
    timestamp: string;
    messageId: string;
    context: EventContext;
}

/* ── API Response ───────────────────────────────────────────────────── */

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

/* ── Lifecycle Types ────────────────────────────────────────────────── */

export type LifecycleState =
    | 'Lead'
    | 'Trial'
    | 'Activated'
    | 'PowerUser'
    | 'AtRisk'
    | 'ExpansionReady'
    | 'Churned'
    | 'Reactivated';

export interface IdentifyResponse {
    userId: string;
    lifecycleState: LifecycleState;
    previousState?: LifecycleState;
    stateChanged: boolean;
    churnRisk: number;
    expansionScore: number;
}

export interface TrackResponse {
    ingested: number;
    duplicates: number;
    processed: number;
    pipeline: {
        lifecycleTransitions: number;
        flowEnrollments: number;
        webhooksDispatched: number;
        errors: number;
    };
}

export interface GroupResponse {
    groupId: string;
    name: string;
    plan: string;
    health: string;
    userCount: number;
    mrr: number;
}

/* ── Callback Types ─────────────────────────────────────────────────── */

export type FlushCallback = (err: Error | null, batch: QueuedEvent[]) => void;

export interface LifecycleOSPlugin {
    name: string;
    initialize?: (client: LifecycleOSClient) => void;
    beforeTrack?: (event: string, properties: EventProperties) => EventProperties | null;
    afterFlush?: (batch: QueuedEvent[], results: ApiResponse) => void;
}

/* ── Client Interface ───────────────────────────────────────────────── */

export interface LifecycleOSClient {
    /** Identify a user with traits */
    identify(userId: string, traits?: UserTraits): Promise<ApiResponse<IdentifyResponse>>;
    /** Track an event */
    track(event: string, properties?: EventProperties): void;
    /** Associate a user with an account/group */
    group(groupId: string, traits?: GroupTraits): Promise<ApiResponse<GroupResponse>>;
    /** Track a page view (auto-captures URL, title, referrer) */
    page(properties?: PageProperties): void;
    /** Flush all queued events immediately */
    flush(): Promise<ApiResponse<TrackResponse>>;
    /** Set the current user ID for all subsequent calls */
    setUserId(userId: string): void;
    /** Set the current account ID for all subsequent calls */
    setAccountId(accountId: string): void;
    /** Reset state (on logout) */
    reset(): void;
    /** Shutdown: flush and stop timers */
    shutdown(): Promise<void>;
    /** Register a plugin */
    use(plugin: LifecycleOSPlugin): void;
    /** Check system health */
    health(): Promise<ApiResponse>;
}
