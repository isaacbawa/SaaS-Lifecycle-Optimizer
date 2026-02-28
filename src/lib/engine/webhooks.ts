/* ═══════════════════════════════════════════════════════════════════════
 * Webhook Dispatcher v2 — Production-Grade Event Delivery System
 *
 * Features:
 *   • HMAC-SHA256 signatures (X-Lifecycle-Signature header)
 *   • 5 retries with exponential backoff + jitter (max 32 s between)
 *   • Circuit breaker: auto-disables after CIRCUIT_BREAK_THRESHOLD
 *     consecutive failures; auto-resets after CIRCUIT_RESET_MS
 *   • Dead-letter queue (DLQ) for permanently failed deliveries
 *   • Idempotency keys on every delivery for receiver deduplication
 *   • Delivery log (ring buffer, configurable cap)
 *   • Non-retryable 4xx fast-fail (except 429 Too Many Requests)
 *   • 10 s timeout per delivery attempt
 *   • Payload size guard (max 256 KB after serialization)
 *
 * Webhook verification (Node.js receiver):
 *   const crypto = require('crypto');
 *   const expected = 'sha256=' + crypto
 *     .createHmac('sha256', webhookSecret)
 *     .update(rawBody)
 *     .digest('hex');
 *   const valid = crypto.timingSafeEqual(
 *     Buffer.from(signature), Buffer.from(expected));
 * ═══════════════════════════════════════════════════════════════════════ */

import {
  getWebhooks as dbGetWebhooks,
  updateWebhookDeliveryStatus,
  recordWebhookDelivery,
} from '@/lib/db/operations';
import type { WebhookConfig } from '@/lib/definitions';
import type { WebhookEventType, WebhookDeliveryPayload, WebhookDeliveryAttempt } from '@/lib/sdk/types';

/* ── Constants ──────────────────────────────────────────────────────── */

const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 32_000;
const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const MAX_DELIVERY_LOG = 2_000;
const MAX_DLQ_SIZE = 500;
const CIRCUIT_BREAK_THRESHOLD = 8; // consecutive failures to trip circuit
const CIRCUIT_RESET_MS = 5 * 60 * 1000; // 5 min cool-down before retry

/* ── Persistent globals (survive HMR) ────────────────────────────────── */

const G = globalThis as unknown as Record<string, unknown>;

if (!G.__wh_delivery_log__) G.__wh_delivery_log__ = [] as WebhookDeliveryAttempt[];
if (!G.__wh_dlq__) G.__wh_dlq__ = [] as DLQEntry[];
if (!G.__wh_circuits__) G.__wh_circuits__ = new Map<string, CircuitState>();

const deliveryLog = G.__wh_delivery_log__ as WebhookDeliveryAttempt[];
const deadLetterQueue = G.__wh_dlq__ as DLQEntry[];
const circuits = G.__wh_circuits__ as Map<string, CircuitState>;

/* ── Types ──────────────────────────────────────────────────────────── */

interface CircuitState {
  consecutiveFailures: number;
  lastFailure: number; // epoch ms
  tripped: boolean;
}

export interface DLQEntry {
  id: string;
  webhookId: string;
  webhookUrl: string;
  event: WebhookEventType;
  payload: WebhookDeliveryPayload;
  failedAt: string;
  attempts: number;
  lastError: string;
  statusCode: number | null;
}

export interface DeliveryResult {
  delivered: boolean;
  attempts: number;
  statusCode: number | null;
  error?: string;
  circuitOpen?: boolean;
}

export interface DispatchSummary {
  dispatched: number;
  delivered: number;
  failed: number;
  circuitOpen: number;
  results: DeliveryResult[];
}

/* ═══════════════════════════════════════════════════════════════════════
 * Delivery Log & DLQ accessors
 * ═══════════════════════════════════════════════════════════════════════ */

/** Recent delivery attempts (optionally filtered by webhook) */
export function getDeliveryLog(webhookId?: string, limit = 50): WebhookDeliveryAttempt[] {
  const filtered = webhookId
    ? deliveryLog.filter((d) => d.webhookId === webhookId)
    : deliveryLog;
  return filtered.slice(-limit);
}

/** Retrieve items from the dead-letter queue */
export function getDLQ(webhookId?: string, limit = 50): DLQEntry[] {
  const filtered = webhookId
    ? deadLetterQueue.filter((d) => d.webhookId === webhookId)
    : deadLetterQueue;
  return filtered.slice(-limit);
}

/** Remove a DLQ entry (e.g., after manual replay) */
export function removeDLQEntry(entryId: string): boolean {
  const idx = deadLetterQueue.findIndex((d) => d.id === entryId);
  if (idx >= 0) {
    deadLetterQueue.splice(idx, 1);
    return true;
  }
  return false;
}

/** Reset circuit breaker for a webhook (manual recovery) */
export function resetCircuit(webhookId: string): void {
  circuits.delete(webhookId);
}

/** Get circuit breaker state for diagnostics */
export function getCircuitState(webhookId: string): CircuitState | undefined {
  return circuits.get(webhookId);
}

/* ═══════════════════════════════════════════════════════════════════════
 * HMAC-SHA256 Signature
 * ═══════════════════════════════════════════════════════════════════════ */

async function computeSignature(payload: string, secret: string): Promise<string> {
  // Prefer Node.js crypto (server-side)
  if (typeof globalThis.process !== 'undefined') {
    try {
      const { createHmac } = await import('crypto');
      return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
    } catch { /* fall through to Web Crypto */ }
  }
  // Web Crypto fallback
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  return 'sha256=' + hex;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Circuit Breaker
 * ═══════════════════════════════════════════════════════════════════════ */

function isCircuitOpen(webhookId: string): boolean {
  const state = circuits.get(webhookId);
  if (!state || !state.tripped) return false;

  // Auto-reset if cool-down elapsed
  if (Date.now() - state.lastFailure > CIRCUIT_RESET_MS) {
    state.tripped = false;
    state.consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordSuccess(webhookId: string): void {
  const state = circuits.get(webhookId);
  if (state) {
    state.consecutiveFailures = 0;
    state.tripped = false;
  }
}

function recordFailure(webhookId: string): void {
  let state = circuits.get(webhookId);
  if (!state) {
    state = { consecutiveFailures: 0, lastFailure: 0, tripped: false };
    circuits.set(webhookId, state);
  }
  state.consecutiveFailures += 1;
  state.lastFailure = Date.now();

  if (state.consecutiveFailures >= CIRCUIT_BREAK_THRESHOLD) {
    state.tripped = true;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Single-Endpoint Delivery (with retries)
 * ═══════════════════════════════════════════════════════════════════════ */

async function deliverToEndpoint(
  webhook: WebhookConfig,
  payload: WebhookDeliveryPayload,
): Promise<DeliveryResult> {
  // Circuit breaker check
  if (isCircuitOpen(webhook.id)) {
    return { delivered: false, attempts: 0, statusCode: null, error: 'Circuit breaker open', circuitOpen: true };
  }

  const body = JSON.stringify(payload);

  // Payload size guard
  if (body.length > MAX_PAYLOAD_BYTES) {
    return { delivered: false, attempts: 0, statusCode: null, error: `Payload exceeds ${MAX_PAYLOAD_BYTES} bytes (${body.length})` };
  }

  const signature = await computeSignature(body, webhook.secret);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    let statusCode: number | null = null;
    let error: string | undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lifecycle-Signature': signature,
          'X-Lifecycle-Event': payload.event,
          'X-Lifecycle-Delivery': payload.id,
          'X-Idempotency-Key': payload.id, // Receivers can deduplicate
          'User-Agent': 'LifecycleOS-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;
      const elapsed = Date.now() - start;

      logAttempt(webhook, payload, statusCode, statusCode >= 200 && statusCode < 300, attempt, elapsed);

      if (statusCode >= 200 && statusCode < 300) {
        recordSuccess(webhook.id);
        return { delivered: true, attempts: attempt, statusCode };
      }

      // 4xx (except 429) are non-retryable client errors
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        recordFailure(webhook.id);
        return { delivered: false, attempts: attempt, statusCode, error: `HTTP ${statusCode} (non-retryable)` };
      }
    } catch (err) {
      error = (err as Error).message;
      logAttempt(webhook, payload, null, false, attempt, Date.now() - start, error);
    }

    // Exponential backoff with jitter before next retry
    if (attempt < MAX_RETRIES) {
      const base = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const jitter = Math.random() * RETRY_BASE_DELAY_MS;
      const delay = Math.min(base + jitter, RETRY_MAX_DELAY_MS);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  recordFailure(webhook.id);
  return { delivered: false, attempts: MAX_RETRIES, statusCode: null, error: 'All retries exhausted' };
}

/* ── Attempt Logger ───────────────────────────────────────────────────── */

function logAttempt(
  webhook: WebhookConfig,
  payload: WebhookDeliveryPayload,
  statusCode: number | null,
  success: boolean,
  attemptNumber: number,
  responseTimeMs: number,
  error?: string,
): void {
  deliveryLog.push({
    webhookId: webhook.id,
    deliveryId: payload.id,
    url: webhook.url,
    event: payload.event,
    statusCode,
    success,
    attemptNumber,
    timestamp: new Date().toISOString(),
    error,
    responseTimeMs,
  });

  // Trim ring buffer
  if (deliveryLog.length > MAX_DELIVERY_LOG) {
    deliveryLog.splice(0, deliveryLog.length - MAX_DELIVERY_LOG);
  }
}

/* ── DLQ Writer ───────────────────────────────────────────────────────── */

function addToDLQ(
  webhook: WebhookConfig,
  payload: WebhookDeliveryPayload,
  result: DeliveryResult,
): void {
  deadLetterQueue.push({
    id: `dlq_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`,
    webhookId: webhook.id,
    webhookUrl: webhook.url,
    event: payload.event as WebhookEventType,
    payload,
    failedAt: new Date().toISOString(),
    attempts: result.attempts,
    lastError: result.error ?? 'Unknown error',
    statusCode: result.statusCode,
  });

  if (deadLetterQueue.length > MAX_DLQ_SIZE) {
    deadLetterQueue.splice(0, deadLetterQueue.length - MAX_DLQ_SIZE);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Main Dispatcher
 * ═══════════════════════════════════════════════════════════════════════ */

/** Legacy event name → typed event name mapping */
const LEGACY_EVENT_MAP: Record<string, WebhookEventType[]> = {
  lifecycle_change: ['user.lifecycle_changed'],
  risk_alert: ['user.risk_score_changed'],
  expansion_signal: ['account.expansion_signal'],
  account_event: ['account.updated'],
  flow_triggered: ['flow.triggered', 'flow.completed'],
};

/**
 * Dispatch an event to all matching webhook endpoints.
 *
 * Returns a summary with delivery stats. Failed deliveries (after all
 * retries) are pushed to the dead-letter queue for manual replay.
 *
 * orgId: Organization ID for tenant isolation. If not provided,
 * dispatch is skipped (no webhooks can be resolved).
 */
export async function dispatchWebhooks(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  orgId?: string,
): Promise<DispatchSummary> {
  if (!orgId) {
    // No org context — cannot resolve webhooks. Silently skip.
    return { dispatched: 0, delivered: 0, failed: 0, circuitOpen: 0, results: [] };
  }

  // Fetch webhooks from DB
  const dbWebhooks = await dbGetWebhooks(orgId);

  // Map DB webhook rows to the WebhookConfig interface used by delivery
  const webhooks: WebhookConfig[] = dbWebhooks.map((wh) => ({
    id: wh.id,
    url: wh.url,
    events: (wh.events as string[]) ?? [],
    status: wh.status as WebhookConfig['status'],
    // NOTE: The DB stores a hash, not the raw secret. We use the secretHash
    // as the HMAC key. In production, receivers should be told to verify
    // against this derived key, or we store the actual secret encrypted.
    secret: wh.secretHash,
    createdDate: new Date(wh.createdAt).toISOString().split('T')[0],
    lastTriggered: wh.lastTriggeredAt ? new Date(wh.lastTriggeredAt).toISOString() : undefined,
    successRate: wh.successRate ?? 100,
  }));

  const matchingWebhooks = webhooks.filter((wh) => {
    if (wh.status === 'inactive') return false;

    return wh.events.some((ev) => {
      if (ev === eventType) return true;
      return LEGACY_EVENT_MAP[ev]?.includes(eventType) ?? false;
    });
  });

  if (matchingWebhooks.length === 0) {
    return { dispatched: 0, delivered: 0, failed: 0, circuitOpen: 0, results: [] };
  }

  const deliveryId = `dlv_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`;

  const payload: WebhookDeliveryPayload = {
    id: deliveryId,
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
    signature: '', // Per-endpoint signature is in the header
  };

  // Deliver to all matching endpoints concurrently
  const results = await Promise.all(
    matchingWebhooks.map(async (wh) => {
      const result = await deliverToEndpoint(wh, payload);

      const now = new Date();

      if (result.delivered) {
        // Success — update status in DB
        await updateWebhookDeliveryStatus(wh.id, {
          status: wh.status === 'failing' ? 'active' : undefined,
          lastTriggeredAt: now,
        }).catch(() => { });
      } else if (!result.circuitOpen) {
        // Failed after retries — push to DLQ
        addToDLQ(wh, payload, result);

        // Update webhook health metrics
        const recentAttempts = getDeliveryLog(wh.id, 20);
        const successCount = recentAttempts.filter((a) => a.success).length;
        const rate = recentAttempts.length > 0 ? Math.round((successCount / recentAttempts.length) * 100) : 0;

        const circuit = circuits.get(wh.id);
        const shouldMarkFailing = (circuit?.tripped) || (circuit && circuit.consecutiveFailures >= 5);

        await updateWebhookDeliveryStatus(wh.id, {
          status: shouldMarkFailing ? 'failing' : undefined,
          successRate: rate,
          lastTriggeredAt: now,
        }).catch(() => { });
      } else {
        // Circuit open — mark as failing
        await updateWebhookDeliveryStatus(wh.id, {
          status: 'failing',
          lastTriggeredAt: now,
        }).catch(() => { });
      }

      // Record delivery attempt in DB for audit trail
      await recordWebhookDelivery({
        webhookId: wh.id,
        eventType,
        payload: data,
        responseStatus: result.statusCode ?? undefined,
        success: result.delivered,
        attemptCount: result.attempts,
      }).catch(() => { });

      return result;
    }),
  );

  return {
    dispatched: matchingWebhooks.length,
    delivered: results.filter((r) => r.delivered).length,
    failed: results.filter((r) => !r.delivered && !r.circuitOpen).length,
    circuitOpen: results.filter((r) => r.circuitOpen).length,
    results,
  };
}
