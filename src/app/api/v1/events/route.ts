/* ==========================================================================
 * POST /api/v1/events — Event Ingestion Endpoint
 *
 * Accepts batched events from the SDK, persists them to the store,
 * and triggers the full event processing pipeline:
 *   • Lifecycle reclassification
 *   • Churn risk re-scoring
 *   • Expansion signal detection
 *   • Segment re-evaluation
 *   • Flow enrollment & advancement
 *   • Webhook dispatch
 *   • Activity logging
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateEventsBatch } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { processEventBatch, type PipelineResult } from '@/lib/engine/event-pipeline';
import type { StoredEvent } from '@/lib/sdk/types';

export async function POST(request: NextRequest) {
  // ── Auth (track scope, events rate tier) ──────────────────────
  const auth = await authenticate(request, ['track'], 'events');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateEventsBatch(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { batch, sentAt } = validation.data;
  const now = new Date().toISOString();

  // ── Build StoredEvent objects ─────────────────────────────────
  const storedEvents: StoredEvent[] = batch.map((item, i) => ({
    id: `evt_${Date.now().toString(36)}_${i}_${crypto.randomUUID().substring(0, 8)}`,
    event: item.event,
    userId: (item.properties.userId as string) || undefined,
    accountId: (item.properties.accountId as string) || undefined,
    properties: item.properties as StoredEvent['properties'],
    timestamp: item.timestamp || sentAt || now,
    receivedAt: now,
    messageId: item.messageId,
    context: {} as StoredEvent['context'],
    processed: false,
  }));

  // ── Ingest (deduplication handled by store) ───────────────────
  const { ingested, duplicates } = await store.ingestEvents(storedEvents);

  // ── Process events through the full pipeline ──────────────────
  // Only process newly ingested events (not duplicates)
  const eventsToProcess = storedEvents.filter((e) => {
    // If the event was a duplicate, skip processing
    return !e.messageId || !duplicates;
  });

  let pipelineResults: PipelineResult[] = [];
  try {
    pipelineResults = await processEventBatch(eventsToProcess);
  } catch (e) {
    console.error('[events] Pipeline error:', (e as Error).message);
    // Pipeline errors don't fail the ingestion — events are still stored
  }

  // ── Aggregate pipeline stats ─────────────────────────────────
  const processed = pipelineResults.length;
  const lifecycleTransitions = pipelineResults.filter((r) => r.lifecycle?.transitioned).length;
  const flowEnrollments = pipelineResults.reduce((sum, r) => sum + (r.flows?.enrollmentsCreated ?? 0), 0);
  const webhooksDispatched = pipelineResults.reduce((sum, r) => sum + r.webhooks.eventsDispatched, 0);
  const pipelineErrors = pipelineResults.reduce((sum, r) => sum + r.errors.length, 0);

  const hasPartialResults = duplicates > 0;
  return apiSuccess(
    {
      ingested,
      duplicates,
      processed,
      pipeline: {
        lifecycleTransitions,
        flowEnrollments,
        webhooksDispatched,
        errors: pipelineErrors,
      },
    },
    hasPartialResults ? 207 : 200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
