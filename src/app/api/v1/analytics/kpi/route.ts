/* ==========================================================================
 * GET /api/v1/analytics/kpi — KPI Summary (lifecycle distribution, MRR, etc.)
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { getKPISummary } from '@/lib/db/operations';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const kpi = await getKPISummary(auth.orgId);

  return apiSuccess(
    kpi,
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
