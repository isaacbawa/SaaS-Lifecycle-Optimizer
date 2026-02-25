/* ==========================================================================
 * GET  /api/v1/users/[id]         — Retrieve user profile & lifecycle state
 * POST /api/v1/users/[id]         — Update user properties
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateUserUpdate } from '@/lib/api/validation';
import { store } from '@/lib/store';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const user = await store.getUser(id);

  if (!user) {
    return apiError('NOT_FOUND', `User "${id}" not found.`, 404);
  }

  // Return user with fresh lifecycle classification
  const classification = classifyLifecycleState(user);
  const churn = scoreChurnRisk(user);

  return apiSuccess(
    {
      user,
      lifecycle: {
        state: classification.state,
        confidence: classification.confidence,
        signals: classification.signals,
      },
      churnRisk: {
        score: churn.riskScore,
        tier: churn.riskTier,
        estimatedMrrAtRisk: churn.estimatedMrrAtRisk,
      },
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticate(request, ['write'], 'standard');
  if (!auth.success) return auth.response;

  const { id } = await context.params;

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateUserUpdate(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const user = await store.updateUser(id, validation.data);
  if (!user) {
    return apiError('NOT_FOUND', `User "${id}" not found.`, 404);
  }

  return apiSuccess(
    { user },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
