/* ==========================================================================
 * GET    /api/v1/webhooks/[id]    — Get webhook details + delivery log
 * PUT    /api/v1/webhooks/[id]    — Update a webhook
 * DELETE /api/v1/webhooks/[id]    — Delete a webhook
 *
 * Supports BOTH Bearer token and Clerk session auth.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import { validateWebhookUpdate } from '@/lib/api/validation';
import { getWebhook, upsertWebhook, deleteWebhook } from '@/lib/db/operations';
import { mapWebhookToUI } from '@/lib/db/mappers';
import { getDeliveryLog } from '@/lib/engine/webhooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function dualAuth(request: NextRequest, scopes: Parameters<typeof authenticate>[1]) {
  if (request.headers.get('authorization')) {
    const auth = await authenticate(request, scopes, 'webhooks');
    if (auth.success) return { orgId: auth.orgId, isApi: true as const, auth };
    return { error: auth.response };
  }
  const dash = await requireDashboardAuth();
  if (dash.success) return { orgId: dash.orgId, isApi: false as const };
  return { error: dash.response };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const result = await dualAuth(request, ['read']);
  if ('error' in result) return result.error;

  const { id } = await context.params;
  const dbWebhook = await getWebhook(result.orgId, id);

  if (!dbWebhook) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

  const webhook = mapWebhookToUI(dbWebhook);
  const deliveries = getDeliveryLog(id, 20);
  const payload = { webhook, deliveries };

  if (result.isApi && result.auth) {
    return apiSuccess(payload, 200, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  return NextResponse.json({ success: true, data: payload });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const result = await dualAuth(request, ['write']);
  if ('error' in result) return result.error;

  const { id } = await context.params;
  const dbWebhook = await getWebhook(result.orgId, id);

  if (!dbWebhook) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

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
  const updated = await upsertWebhook(result.orgId, {
    ...dbWebhook,
    ...(updates.url ? { url: updates.url } : {}),
    ...(updates.events ? { events: updates.events } : {}),
    ...(updates.status ? { status: updates.status as 'active' | 'inactive' | 'failing' } : {}),
    id,
  });

  const webhook = mapWebhookToUI(updated);
  const payload = { webhook };

  if (result.isApi && result.auth) {
    return apiSuccess(payload, 200, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  return NextResponse.json({ success: true, data: payload });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const result = await dualAuth(request, ['write']);
  if ('error' in result) return result.error;

  const { id } = await context.params;
  const deleted = await deleteWebhook(result.orgId, id);

  if (!deleted) {
    return apiError('NOT_FOUND', `Webhook "${id}" not found.`, 404);
  }

  if (result.isApi && result.auth) {
    return apiSuccess({ deleted: true }, 200, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  return NextResponse.json({ success: true, data: { deleted: true } });
}
