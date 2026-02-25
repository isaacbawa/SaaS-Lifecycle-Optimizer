/* ==========================================================================
 * GET /api/v1/flows — List all email flows with filtering & pagination
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess } from '@/lib/api/auth';
import { store } from '@/lib/store';
import { parsePagination, paginate } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request, ['read'], 'standard');
  if (!auth.success) return auth.response;

  const flows = await store.getAllFlows();

  // Parse query params for filtering
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const triggerType = url.searchParams.get('triggerType');

  let filtered = flows;

  if (status) {
    filtered = filtered.filter((f) => f.status.toLowerCase() === status.toLowerCase());
  }
  if (triggerType) {
    filtered = filtered.filter((f) => f.triggerType === triggerType);
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
