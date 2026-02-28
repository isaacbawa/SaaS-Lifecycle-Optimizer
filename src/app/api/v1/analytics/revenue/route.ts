/* ==========================================================================
 * GET /api/v1/analytics/revenue — Revenue analytics endpoint
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { getRevenueRecords, getKPISummary } from '@/lib/db/operations';
import { aggregateRevenueRecords, computeRevenueWaterfall } from '@/lib/db/mappers';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'analysis');
  if (!auth.success) return auth.response;

  const [dbRevenue, kpi] = await Promise.all([
    getRevenueRecords(auth.orgId),
    getKPISummary(auth.orgId),
  ]);

  const revenue = aggregateRevenueRecords(dbRevenue);
  const waterfall = computeRevenueWaterfall(dbRevenue);

  const latestMonth = revenue.length > 0 ? revenue[revenue.length - 1] : null;
  const prevMonth = revenue.length > 1 ? revenue[revenue.length - 2] : null;

  // Compute month-over-month growth (safe division)
  const mrrGrowth =
    latestMonth && prevMonth && prevMonth.netTotal > 0
      ? ((latestMonth.netTotal - prevMonth.netTotal) / prevMonth.netTotal) * 100
      : 0;

  return apiSuccess(
    {
      currentMrr: kpi.totalMrr,
      currentArr: kpi.totalArr,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      mrrByMovement: kpi.mrrByMovement,
      monthlyData: revenue,
      waterfall,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
