/* ==========================================================================
 * GET /api/v1/analytics/retention — Retention cohort analytics
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const cohorts = await store.getRetentionCohorts();

  // Compute aggregate metrics (safe division)
  const totalUsers = cohorts.reduce((acc, c) => acc + c.size, 0);
  const cohortsWithMonth1 = cohorts.filter((c) => c.retention.length > 1);
  const avgMonth1Retention =
    cohortsWithMonth1.length > 0
      ? Math.round(
        (cohortsWithMonth1.reduce((acc, c) => acc + c.retention[1], 0) /
          cohortsWithMonth1.length) *
        10,
      ) / 10
      : 0;

  return apiSuccess(
    {
      cohorts,
      totalCohorts: cohorts.length,
      totalUsers,
      avgMonth1Retention,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
