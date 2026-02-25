/* ==========================================================================
 * GET    /api/v1/webhooks     — List all configured webhooks
 * POST   /api/v1/webhooks     — Create a new webhook
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateWebhookCreate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { getDeliveryLog } from '@/lib/engine/webhooks';
import type { WebhookConfig } from '@/lib/definitions';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'webhooks');
  if (!auth.success) return auth.response;

  const webhooks = await store.getWebhooks();

  // Enrich with recent delivery stats
  const enriched = webhooks.map((wh) => {
    const recentDeliveries = getDeliveryLog(wh.id, 10);
    return {
      ...wh,
      recentDeliveries: recentDeliveries.length,
      recentSuccesses: recentDeliveries.filter((d) => d.success).length,
      recentFailures: recentDeliveries.filter((d) => !d.success).length,
    };
  });

  return apiSuccess(
    { webhooks: enriched, total: webhooks.length },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request, ['write'], 'webhooks');
  if (!auth.success) return auth.response;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateWebhookCreate(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { url, events } = validation.data;

  // Generate crypto-secure secret via store helper
  const secret = store.generateWebhookSecret();

  const webhook: WebhookConfig = {
    id: `wh_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
    url,
    events,
    status: 'active',
    secret,
    createdDate: new Date().toISOString().split('T')[0],
    successRate: 100,
  };

  await store.upsertWebhook(webhook);

  return apiSuccess(
    { webhook },
    201,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
