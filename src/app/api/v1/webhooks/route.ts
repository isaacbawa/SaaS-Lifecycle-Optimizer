/* ==========================================================================
 * GET    /api/v1/webhooks     - List all configured webhooks
 * POST   /api/v1/webhooks     - Create a new webhook
 *
 * Supports BOTH:
 *  - Bearer token (API key) auth for external SDK/API access
 *  - Clerk session auth for dashboard (same-origin) access
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import { validateWebhookCreate } from '@/lib/api/validation';
import { getWebhooks, upsertWebhook } from '@/lib/db/operations';
import { mapWebhookToUI } from '@/lib/db/mappers';
import { getDeliveryLog } from '@/lib/engine/webhooks';

async function dualAuth(request: NextRequest, scopes: Parameters<typeof authenticate>[1], tier?: Parameters<typeof authenticate>[2]) {
  if (request.headers.get('authorization')) {
    const auth = await authenticate(request, scopes, tier);
    if (auth.success) return { orgId: auth.orgId, isApi: true as const, auth };
    return { error: auth.response };
  }
  const dash = await requireDashboardAuth();
  if (dash.success) return { orgId: dash.orgId, isApi: false as const };
  return { error: dash.response };
}

export async function GET(request: NextRequest) {
  const result = await dualAuth(request, ['read'], 'webhooks');
  if ('error' in result) return result.error;

  const dbWebhooks = await getWebhooks(result.orgId);
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

  if (result.isApi && result.auth) {
    return apiSuccess(
      { webhooks: enriched, total: webhooks.length },
      200,
      result.auth.startTime,
      result.auth.requestId,
      result.auth.rateLimit,
    );
  }
  return NextResponse.json({ success: true, data: { webhooks: enriched, total: webhooks.length } });
}

export async function POST(request: NextRequest) {
  const result = await dualAuth(request, ['write'], 'webhooks');
  if ('error' in result) return result.error;

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

  // Generate a crypto-secure secret - stored as-is for HMAC signing
  const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;

  const dbWebhook = await upsertWebhook(result.orgId, {
    url,
    events,
    status: 'active',
    secretHash: rawSecret,
    secretPrefix: rawSecret.substring(0, 10),
    successRate: 100,
  });

  const webhook = mapWebhookToUI(dbWebhook);
  const payload = { webhook: { ...webhook, secret: rawSecret } };

  if (result.isApi && result.auth) {
    return apiSuccess(payload, 201, result.auth.startTime, result.auth.requestId, result.auth.rateLimit);
  }
  return NextResponse.json({ success: true, data: payload }, { status: 201 });
}
