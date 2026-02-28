/* ==========================================================================
 * POST /api/v1/flow-definitions/[id]/duplicate
 *
 * Deep-clone a flow definition with a new ID, reset metrics, set to draft.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { resolveOrgId } from '@/lib/auth/resolve-org';
import { duplicateFlowDefinition } from '@/lib/db/operations';
import { mapFlowDefToUI } from '@/lib/db/mappers';

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, ctx: RouteContext) {
  const orgId = await resolveOrgId();
  const { id } = await ctx.params;
  const copy = await duplicateFlowDefinition(orgId, id);
  if (!copy) return jsonError('NOT_FOUND', `Flow definition '${id}' not found.`, 404);
  return jsonSuccess(mapFlowDefToUI(copy), 201);
}
