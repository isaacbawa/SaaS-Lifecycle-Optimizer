/* ==========================================================================
 * GET /api/v1/flows — List all flow definitions with filtering & pagination
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { getAllFlowDefinitions } from '@/lib/db/operations';
import { mapFlowDefToUI } from '@/lib/db/mappers';
import { parsePagination, paginate } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const dbFlows = await getAllFlowDefinitions(auth.orgId);
  const flows = dbFlows.map(mapFlowDefToUI);

  // Parse query params for filtering
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let filtered = flows;

  if (status) {
    filtered = filtered.filter((f) => f.status.toLowerCase() === status.toLowerCase());
  }

  // Paginate
  const pagination = parsePagination(url.searchParams);
  const page = paginate(filtered, pagination);

  return apiSuccess(
    {
      flows: page.data,
      total: page.total,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}
