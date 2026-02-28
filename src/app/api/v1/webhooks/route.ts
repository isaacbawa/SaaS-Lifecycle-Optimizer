/* ==========================================================================
 * GET    /api/v1/webhooks     — List all configured webhooks
 * POST   /api/v1/webhooks     — Create a new webhook
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateWebhookCreate } from '@/lib/api/validation';
import { getWebhooks, upsertWebhook } from '@/lib/db/operations';
import { mapWebhookToUI } from '@/lib/db/mappers';
import { getDeliveryLog } from '@/lib/engine/webhooks';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'webhooks');
  if (!auth.success) return auth.response;

  const dbWebhooks = await getWebhooks(auth.orgId);
  const webhooks = dbWebhooks.map(mapWebhookToUI);

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

  // Generate a crypto-secure secret and hash it for storage
  const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawSecret));
  const secretHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const dbWebhook = await upsertWebhook(auth.orgId, {
    url,
    events,
    status: 'active',
    secretHash,
    secretPrefix: rawSecret.substring(0, 10),
    successRate: 100,
  });

  const webhook = mapWebhookToUI(dbWebhook);
  // Return the raw secret once — it cannot be retrieved after this
  return apiSuccess(
    { webhook: { ...webhook, secret: rawSecret } },
    201,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
