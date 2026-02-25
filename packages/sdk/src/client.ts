/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk — Core Client
 *
 * Production-grade analytics client for Next.js SaaS applications.
 *
 * Features:
 *   • Automatic event batching with configurable flush thresholds
 *   • Exponential backoff retry with jitter
 *   • Request timeout and abort controller
 *   • Plugin system for extensibility
 *   • Page visibility-aware flushing (flushes on tab hide)
 *   • Debug mode with structured console output
 *   • Idempotency keys on every event
 *   • Server-side safe (no window/document access in core)
 *
 * Usage:
 *   import { createClient } from '@lifecycleos/sdk';
 *
 *   const los = createClient({ apiKey: 'lcos_live_...' });
 *   await los.identify('user_123', { email: 'j@co.com', plan: 'Growth' });
 *   los.track('feature_used', { feature: 'reports' });
 * ═══════════════════════════════════════════════════════════════════════ */

import type {
    LifecycleOSConfig,
    ResolvedConfig,
    UserTraits,
    EventProperties,
    GroupTraits,
    PageProperties,
    EventContext,
    QueuedEvent,
    ApiResponse,
    IdentifyResponse,
    TrackResponse,
    GroupResponse,
    FlushCallback,
    LifecycleOSPlugin,
    LifecycleOSClient,
} from './types';

const SDK_VERSION = '1.0.0';
const SDK_NAME = '@lifecycleos/sdk';

/* ── Default Config ─────────────────────────────────────────────────── */

function resolveConfig(config: LifecycleOSConfig): ResolvedConfig {
    return {
        apiKey: config.apiKey,
        apiBaseUrl: config.apiBaseUrl ?? '/api/v1',
        environment: config.environment ?? 'production',
        flushAt: config.flushAt ?? 20,
        flushInterval: config.flushInterval ?? 10_000,
        maxRetries: config.maxRetries ?? 3,
        retryBaseDelay: config.retryBaseDelay ?? 1_000,
        debug: config.debug ?? false,
        timeout: config.timeout ?? 10_000,
    };
}

/* ── UUID Generator ─────────────────────────────────────────────────── */

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/* ── Context Builder ────────────────────────────────────────────────── */

function buildContext(config: ResolvedConfig): EventContext {
    const ctx: EventContext = {
        library: { name: SDK_NAME, version: SDK_VERSION },
        environment: config.environment,
    };

    // Capture browser context if available
    if (typeof window !== 'undefined') {
        ctx.page = {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer || undefined,
        };
        ctx.userAgent = navigator.userAgent;
        ctx.locale = navigator.language;
        try {
            ctx.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            // ignore
        }
    }

    return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Client Implementation
 * ═══════════════════════════════════════════════════════════════════════ */

class LifecycleOSClientImpl implements LifecycleOSClient {
    private config: ResolvedConfig;
    private queue: QueuedEvent[] = [];
    private userId: string | null = null;
    private accountId: string | null = null;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private plugins: LifecycleOSPlugin[] = [];
    private flushing = false;
    private destroyed = false;

    constructor(config: LifecycleOSConfig) {
        if (!config.apiKey) {
            throw new Error('[LifecycleOS] apiKey is required. Get yours at Settings → SDK & API Keys.');
        }

        this.config = resolveConfig(config);
        this.startFlushTimer();
        this.setupVisibilityListener();
        this.log('Client initialized', {
            apiBaseUrl: this.config.apiBaseUrl,
            environment: this.config.environment,
            flushAt: this.config.flushAt,
            flushInterval: this.config.flushInterval,
        });
    }

    /* ── Public API ─────────────────────────────────────────────────── */

    async identify(userId: string, traits: UserTraits = {}): Promise<ApiResponse<IdentifyResponse>> {
        if (!userId) throw new Error('[LifecycleOS] identify() requires a userId');

        this.userId = userId;
        if (traits.accountId) this.accountId = traits.accountId;

        this.log('identify', { userId, traits });

        return this.request<IdentifyResponse>('/identify', {
            userId,
            traits,
            timestamp: new Date().toISOString(),
            context: buildContext(this.config),
        });
    }

    track(event: string, properties: EventProperties = {}): void {
        if (!event) throw new Error('[LifecycleOS] track() requires an event name');

        let finalProps: EventProperties = {
            ...properties,
            userId: properties.userId ?? this.userId ?? undefined,
            accountId: properties.accountId ?? this.accountId ?? undefined,
        };

        // Run plugin hooks
        for (const plugin of this.plugins) {
            if (plugin.beforeTrack) {
                const result = plugin.beforeTrack(event, finalProps);
                if (result === null) {
                    this.log('Event suppressed by plugin', { plugin: plugin.name, event });
                    return;
                }
                finalProps = result as EventProperties;
            }
        }

        const queuedEvent: QueuedEvent = {
            event,
            properties: finalProps,
            timestamp: new Date().toISOString(),
            messageId: `msg_${generateId()}`,
            context: buildContext(this.config),
        };

        this.queue.push(queuedEvent);
        this.log('track', { event, queueLength: this.queue.length });

        if (this.queue.length >= this.config.flushAt) {
            this.flush().catch((err) => this.log('Auto-flush error', err));
        }
    }

    async group(groupId: string, traits: GroupTraits = {}): Promise<ApiResponse<GroupResponse>> {
        if (!groupId) throw new Error('[LifecycleOS] group() requires a groupId');

        this.accountId = groupId;
        this.log('group', { groupId, traits });

        return this.request<GroupResponse>('/group', {
            groupId,
            traits,
            timestamp: new Date().toISOString(),
            context: buildContext(this.config),
        });
    }

    page(properties: PageProperties = {}): void {
        const pageProps: EventProperties = {
            ...properties,
            url: properties.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
            path: properties.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
            title: properties.title ?? (typeof document !== 'undefined' ? document.title : undefined),
            referrer: properties.referrer ?? (typeof document !== 'undefined' ? document.referrer : undefined),
        };
        this.track('$page', pageProps);
    }

    async flush(): Promise<ApiResponse<TrackResponse>> {
        if (this.flushing || this.queue.length === 0) {
            return { success: true, data: { ingested: 0, duplicates: 0, processed: 0, pipeline: { lifecycleTransitions: 0, flowEnrollments: 0, webhooksDispatched: 0, errors: 0 } } };
        }

        this.flushing = true;
        const batch = [...this.queue];
        this.queue = [];

        this.log('flush', { batchSize: batch.length });

        try {
            const result = await this.request<TrackResponse>('/events', {
                batch,
                sentAt: new Date().toISOString(),
            });

            // Run plugin hooks
            for (const plugin of this.plugins) {
                if (plugin.afterFlush) {
                    plugin.afterFlush(batch, result);
                }
            }

            return result;
        } catch (err) {
            // Re-queue events on failure
            this.queue.unshift(...batch);
            this.log('Flush failed, re-queued events', { count: batch.length, error: (err as Error).message });
            throw err;
        } finally {
            this.flushing = false;
        }
    }

    setUserId(userId: string): void {
        this.userId = userId;
        this.log('setUserId', { userId });
    }

    setAccountId(accountId: string): void {
        this.accountId = accountId;
        this.log('setAccountId', { accountId });
    }

    reset(): void {
        this.userId = null;
        this.accountId = null;
        this.queue = [];
        this.log('reset');
    }

    async shutdown(): Promise<void> {
        this.destroyed = true;
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.queue.length > 0) {
            await this.flush();
        }
        this.log('shutdown');
    }

    use(plugin: LifecycleOSPlugin): void {
        this.plugins.push(plugin);
        if (plugin.initialize) {
            plugin.initialize(this);
        }
        this.log('Plugin registered', { name: plugin.name });
    }

    async health(): Promise<ApiResponse> {
        return this.request('/health', undefined, 'GET');
    }

    /* ── HTTP Layer ─────────────────────────────────────────────────── */

    private async request<T>(
        path: string,
        body?: unknown,
        method: 'GET' | 'POST' = 'POST',
    ): Promise<ApiResponse<T>> {
        const url = `${this.config.apiBaseUrl}${path}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            if (attempt > 0) {
                const delay = this.config.retryBaseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * delay * 0.5;
                await new Promise((r) => setTimeout(r, delay + jitter));
                this.log('Retrying request', { path, attempt });
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                const headers: Record<string, string> = {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-SDK-Version': SDK_VERSION,
                    'X-SDK-Name': SDK_NAME,
                };

                const response = await fetch(url, {
                    method,
                    headers,
                    body: method === 'POST' && body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const json = (await response.json()) as ApiResponse<T>;

                if (!response.ok && response.status >= 500 && attempt < this.config.maxRetries) {
                    lastError = new Error(`HTTP ${response.status}`);
                    continue; // Retry on 5xx
                }

                return json;
            } catch (err) {
                lastError = err as Error;
                if ((err as Error).name === 'AbortError') {
                    lastError = new Error(`Request timeout after ${this.config.timeout}ms`);
                }
                if (attempt === this.config.maxRetries) break;
            }
        }

        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: lastError?.message ?? 'Request failed after all retries',
            },
        };
    }

    /* ── Internals ──────────────────────────────────────────────────── */

    private startFlushTimer(): void {
        if (typeof setInterval === 'undefined') return; // SSR safety
        this.flushTimer = setInterval(() => {
            if (!this.destroyed && this.queue.length > 0) {
                this.flush().catch((err) => this.log('Timer flush error', err));
            }
        }, this.config.flushInterval);
    }

    private setupVisibilityListener(): void {
        if (typeof document === 'undefined') return;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.queue.length > 0) {
                // Use sendBeacon for reliability on tab close
                const url = `${this.config.apiBaseUrl}/events`;
                const payload = JSON.stringify({
                    batch: this.queue,
                    sentAt: new Date().toISOString(),
                });
                try {
                    const blob = new Blob([payload], { type: 'application/json' });
                    // We can't add auth headers to sendBeacon, so include API key in query
                    navigator.sendBeacon(`${url}?key=${this.config.apiKey}`, blob);
                    this.queue = [];
                } catch {
                    // Fallback: try regular flush
                    this.flush().catch(() => { });
                }
            }
        });
    }

    private log(action: string, data?: unknown): void {
        if (!this.config.debug) return;
        const timestamp = new Date().toISOString().split('T')[1];
        console.log(`[LifecycleOS ${timestamp}] ${action}`, data ?? '');
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Factory
 * ═══════════════════════════════════════════════════════════════════════ */

/** Create a new LifecycleOS client instance */
export function createClient(config: LifecycleOSConfig): LifecycleOSClient {
    return new LifecycleOSClientImpl(config);
}

/** Singleton client for convenience */
let _defaultClient: LifecycleOSClient | null = null;

/** Initialize the default singleton client */
export function init(config: LifecycleOSConfig): LifecycleOSClient {
    if (_defaultClient) {
        console.warn('[LifecycleOS] Client already initialized. Call reset() first to re-initialize.');
        return _defaultClient;
    }
    _defaultClient = createClient(config);
    return _defaultClient;
}

/** Get the default singleton client */
export function getClient(): LifecycleOSClient {
    if (!_defaultClient) {
        throw new Error('[LifecycleOS] Client not initialized. Call init({ apiKey }) first.');
    }
    return _defaultClient;
}

/** Reset the default singleton client */
export function resetClient(): void {
    if (_defaultClient) {
        _defaultClient.shutdown().catch(() => { });
        _defaultClient = null;
    }
}
