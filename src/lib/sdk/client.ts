/* ==========================================================================
 * LifecycleOS SDK Client — @lifecycleos/sdk
 *
 * Production-grade client library for ingesting events, identifying users,
 * and grouping accounts into the LifecycleOS platform.
 *
 * Features:
 *   • Auto-batching event queue with configurable flush threshold & interval
 *   • Exponential backoff retry on transient failures
 *   • Rich context collection (library, page, environment)
 *   • Idempotent message IDs for deduplication
 *   • Graceful shutdown with drain on `beforeunload`
 *   • Full TypeScript type safety
 * ========================================================================== */

import type {
  LifecycleOSConfig,
  UserTraits,
  IdentifyPayload,
  EventProperties,
  TrackPayload,
  EventBatch,
  GroupTraits,
  GroupPayload,
  EventContext,
  ApiResponse,
} from './types';

const SDK_NAME = '@lifecycleos/sdk';
const SDK_VERSION = '1.0.0';

/* ── Helpers ────────────────────────────────────────────────────────── */

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `msg_${ts}_${rand}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/* ── Client Class ───────────────────────────────────────────────────── */

export class LifecycleOS {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly environment: string;
  private readonly flushAt: number;
  private readonly flushInterval: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly debug: boolean;
  private readonly timeout: number;

  private static readonly MAX_QUEUE_SIZE = 1000;

  private queue: TrackPayload[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private disposed = false;

  constructor(config: LifecycleOSConfig) {
    if (!config.apiKey) {
      throw new Error('[LifecycleOS] apiKey is required. Get one at /settings → API Keys.');
    }

    this.apiKey = config.apiKey;
    this.apiBaseUrl = (config.apiBaseUrl ?? '/api/v1').replace(/\/+$/, '');
    this.environment = config.environment ?? 'production';
    this.flushAt = config.flushAt ?? 20;
    this.flushInterval = config.flushInterval ?? 10_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay ?? 1_000;
    this.debug = config.debug ?? false;
    this.timeout = config.timeout ?? 10_000;

    this.startTimer();
    this.registerShutdownHook();
    this.log('Initialized', { environment: this.environment, flushAt: this.flushAt });
  }

  /* ── Public API ─────────────────────────────────────────────────── */

  /**
   * Identify a user and attach persistent traits.
   * Call this on login, signup, or whenever traits change.
   *
   * @param userId - Unique user identifier in your system
   * @param traits - User properties (email, name, plan, etc.)
   */
  async identify(userId: string, traits: UserTraits = {}): Promise<ApiResponse> {
    this.assertNotDisposed();

    if (!userId) {
      throw new Error('[LifecycleOS] identify() requires a userId.');
    }

    const payload: IdentifyPayload = {
      userId,
      traits,
      timestamp: new Date().toISOString(),
      context: this.buildContext(),
    };

    this.log('identify', { userId, traits });
    return this.sendWithRetry(`${this.apiBaseUrl}/identify`, payload);
  }

  /**
   * Track a product event with optional properties.
   * Events are buffered and sent in batches.
   *
   * @param event  - Event name (e.g. `'feature_used'`, `'subscription_upgraded'`)
   * @param properties - Event properties (userId, feature, etc.)
   */
  track(event: string, properties: EventProperties = {}): void {
    this.assertNotDisposed();

    if (!event) {
      throw new Error('[LifecycleOS] track() requires an event name.');
    }

    const payload: TrackPayload = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      context: this.buildContext(),
      messageId: generateId(),
    };

    // Enforce queue cap — drop oldest events if at capacity
    if (this.queue.length >= LifecycleOS.MAX_QUEUE_SIZE) {
      const dropped = this.queue.splice(0, this.queue.length - LifecycleOS.MAX_QUEUE_SIZE + 1);
      this.log('queue cap reached — dropped oldest events', { dropped: dropped.length });
    }

    this.queue.push(payload);
    this.log('track (queued)', { event, queueSize: this.queue.length });

    if (this.queue.length >= this.flushAt) {
      void this.flush();
    }
  }

  /**
   * Associate a user with an account / company.
   * Call this when a user joins an organization.
   *
   * @param groupId - Account / company identifier
   * @param traits  - Account properties (name, industry, plan, etc.)
   */
  async group(groupId: string, traits: GroupTraits = {}): Promise<ApiResponse> {
    this.assertNotDisposed();

    if (!groupId) {
      throw new Error('[LifecycleOS] group() requires a groupId.');
    }

    const payload: GroupPayload = {
      groupId,
      traits,
      timestamp: new Date().toISOString(),
      context: this.buildContext(),
    };

    this.log('group', { groupId, traits });
    return this.sendWithRetry(`${this.apiBaseUrl}/group`, payload);
  }

  /**
   * Flush all queued events immediately.
   * Returns once the batch has been sent (or after all retries fail).
   */
  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    const batch = this.queue.splice(0, this.flushAt);

    try {
      const body: EventBatch = {
        batch,
        sentAt: new Date().toISOString(),
      };

      this.log('flush', { batchSize: batch.length });
      await this.sendWithRetry(`${this.apiBaseUrl}/events`, body);
    } catch (err) {
      // Re-enqueue failed events at the front
      this.queue.unshift(...batch);
      this.log('flush failed — events re-queued', { error: (err as Error).message });
    } finally {
      this.flushing = false;

      // If there are still events queued, flush recursively
      if (this.queue.length >= this.flushAt) {
        void this.flush();
      }
    }
  }

  /**
   * Gracefully shut down the client.
   * Flushes remaining events and stops the timer.
   */
  async shutdown(): Promise<void> {
    this.disposed = true;
    this.stopTimer();
    await this.flush();
    this.log('shutdown complete');
  }

  /** Number of events currently buffered. */
  get queueSize(): number {
    return this.queue.length;
  }

  /* ── Network Layer ──────────────────────────────────────────────── */

  private async sendWithRetry(url: string, body: unknown): Promise<ApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { response, parsed } = await this.httpPost(url, body);

        if (parsed.success) {
          return parsed;
        }

        // Non-retryable client errors (4xx except 429)
        const status = response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          return parsed;
        }

        lastError = new Error(parsed.error?.message ?? `HTTP ${status}`);
      } catch (err) {
        lastError = err as Error;
      }

      if (attempt < this.maxRetries) {
        const delay = this.retryBaseDelay * Math.pow(2, attempt);
        const jitter = delay * 0.2 * Math.random();
        this.log(`retry ${attempt + 1}/${this.maxRetries}`, { delay: delay + jitter });
        await this.sleep(delay + jitter);
      }
    }

    throw lastError ?? new Error('All retries exhausted');
  }

  private async httpPost(url: string, body: unknown): Promise<{ response: Response; parsed: ApiResponse }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-SDK-Version': `${SDK_NAME}/${SDK_VERSION}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const json = await res.json();
      return { response: res, parsed: json as ApiResponse };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /* ── Context Builder ────────────────────────────────────────────── */

  private buildContext(): EventContext {
    const ctx: EventContext = {
      library: { name: SDK_NAME, version: SDK_VERSION },
      environment: this.environment,
    };

    if (isBrowser()) {
      ctx.page = {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || undefined,
      };
      ctx.userAgent = navigator.userAgent;
      ctx.locale = navigator.language;
      ctx.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    return ctx;
  }

  /* ── Timer Management ───────────────────────────────────────────── */

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);

    // Unref the timer in Node so it doesn't prevent process exit
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as NodeJS.Timeout).unref();
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private registerShutdownHook(): void {
    if (isBrowser()) {
      window.addEventListener('beforeunload', () => {
        // sendBeacon cannot set Authorization headers.
        // Embed the token in a custom header-like field inside
        // the JSON body so the server can fall back to it.
        if (this.queue.length > 0 && navigator.sendBeacon) {
          const body = {
            batch: this.queue.splice(0),
            sentAt: new Date().toISOString(),
            _beacon: true,
            _token: this.apiKey,
          };
          navigator.sendBeacon(
            `${this.apiBaseUrl}/events`,
            new Blob([JSON.stringify(body)], { type: 'application/json' }),
          );
        }
      });
    }
  }

  /* ── Utilities ──────────────────────────────────────────────────── */

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('[LifecycleOS] Client has been shut down. Create a new instance.');
    }
  }

  private log(action: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      console.log(`[LifecycleOS] ${action}`, data ?? '');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
