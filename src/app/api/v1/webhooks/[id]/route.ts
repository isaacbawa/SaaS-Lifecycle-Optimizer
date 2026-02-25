/* ==========================================================================
 * GET    /api/v1/webhooks/[id]    — Get webhook details + delivery log
 * PUT    /api/v1/webhooks/[id]    — Update a webhook
 * DELETE /api/v1/webhooks/[id]    — Delete a webhook
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateWebhookUpdate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { getDeliveryLog } from '@/lib/engine/webhooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const webhook = await store.getWebhook(id);

  if (!webhook) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

  const deliveries = getDeliveryLog(id, 20);

  return apiSuccess(
    { webhook, deliveries },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const webhook = await store.getWebhook(id);

  if (!webhook) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateWebhookUpdate(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const updates = validation.data;
  if (updates.url) webhook.url = updates.url;
  if (updates.events) webhook.events = updates.events;
  if (updates.status) webhook.status = updates.status;

  await store.upsertWebhook(webhook);

  return apiSuccess(
    { webhook },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const deleted = await store.deleteWebhook(id);

  if (!deleted) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

  return apiSuccess(
    { deleted: true },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
