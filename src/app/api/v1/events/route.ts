/* ==========================================================================
 * POST /api/v1/events — Event Ingestion Endpoint
 *
 * Accepts batched events from the SDK, persists them to PostgreSQL,
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
import {
  ingestEvents as dbIngestEvents,
  getTrackedUserByExternalId,
  getTrackedAccountByExternalId,
} from '@/lib/db/operations';
import { processEventBatch, type PipelineResult } from '@/lib/engine/event-pipeline';
import type { StoredEvent } from '@/lib/sdk/types';

export async function POST(request: NextRequest) {
  // ── Auth (track scope, events rate tier) ──────────────────────
  const auth = await authenticate(request, ['track'], 'events');
  if (!auth.success) return auth.response;

  const orgId = auth.orgId;
  if (!orgId) {
    return apiError('ORG_NOT_FOUND', 'No organization associated with this API key.', 400);
  }

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
  const now = new Date();
  const nowIso = now.toISOString();

  // ── Resolve tracked user/account UUIDs for DB foreign keys ───
  // Build a cache of external → internal IDs for this batch
  const userIdCache = new Map<string, string | null>();
  const accountIdCache = new Map<string, string | null>();

  for (const item of batch) {
    const extUserId = (item.properties.userId as string) || undefined;
    const extAccountId = (item.properties.accountId as string) || undefined;

    if (extUserId && !userIdCache.has(extUserId)) {
      const dbUser = await getTrackedUserByExternalId(orgId, extUserId);
      userIdCache.set(extUserId, dbUser?.id ?? null);
    }
    if (extAccountId && !accountIdCache.has(extAccountId)) {
      const dbAccount = await getTrackedAccountByExternalId(orgId, extAccountId);
      accountIdCache.set(extAccountId, dbAccount?.id ?? null);
    }
  }

  // ── Build DB event records ──────────────────────────────────
  const dbEventRecords = batch.map((item) => {
    const extUserId = (item.properties.userId as string) || undefined;
    const extAccountId = (item.properties.accountId as string) || undefined;

    return {
      name: item.event,
      trackedUserId: extUserId ? (userIdCache.get(extUserId) ?? undefined) : undefined,
      accountId: extAccountId ? (accountIdCache.get(extAccountId) ?? undefined) : undefined,
      externalUserId: extUserId,
      properties: item.properties as Record<string, unknown>,
      messageId: item.messageId,
      clientTimestamp: item.timestamp ? new Date(item.timestamp) : undefined,
    };
  });

  // ── Ingest to DB (deduplication by messageId) ────────────────
  const { ingested, duplicates } = await dbIngestEvents(orgId, dbEventRecords);

  // ── Also build StoredEvent objects for the pipeline ──────────
  // The pipeline currently expects StoredEvent interface
  const storedEvents: StoredEvent[] = batch.map((item, i) => ({
    id: `evt_${Date.now().toString(36)}_${i}_${crypto.randomUUID().substring(0, 8)}`,
    event: item.event,
    userId: (item.properties.userId as string) || undefined,
    accountId: (item.properties.accountId as string) || undefined,
    properties: item.properties as StoredEvent['properties'],
    timestamp: item.timestamp || sentAt || nowIso,
    receivedAt: nowIso,
    messageId: item.messageId,
    context: {} as StoredEvent['context'],
    processed: false,
  }));

  // ── Process events through the full pipeline ──────────────────
  let pipelineResults: PipelineResult[] = [];
  try {
    pipelineResults = await processEventBatch(storedEvents, orgId);
  } catch (e) {
    console.error('[events] Pipeline error:', (e as Error).message);
    // Pipeline errors don't fail the ingestion — events are already stored
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
