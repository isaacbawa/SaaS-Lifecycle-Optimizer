/* ==========================================================================
 * /api/v1/flow-definitions/[id]
 *
 * GET    — Retrieve a single flow definition
 * PUT    — Update a flow definition (full or partial)
 * DELETE — Delete a flow definition and its enrollments
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { FlowDefinition, FlowBuilderStatus } from '@/lib/definitions';

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

/* ── GET ─────────────────────────────────────────────────────────────── */

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const flow = await store.getFlowDefinition(id);
  if (!flow) return jsonError('NOT_FOUND', `Flow definition '${id}' not found.`, 404);
  return jsonSuccess(flow);
}

/* ── PUT ─────────────────────────────────────────────────────────────── */

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const existing = await store.getFlowDefinition(id);
  if (!existing) return jsonError('NOT_FOUND', `Flow definition '${id}' not found.`, 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Merge provided fields onto existing flow
  const updated: FlowDefinition = {
    ...existing,
    ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
    ...(typeof body.description === 'string' ? { description: body.description.trim() } : {}),
    ...(body.status && isValidStatus(body.status as string) ? { status: body.status as FlowBuilderStatus } : {}),
    ...(Array.isArray(body.nodes) ? { nodes: body.nodes } : {}),
    ...(Array.isArray(body.edges) ? { edges: body.edges } : {}),
    ...(Array.isArray(body.variables) ? { variables: body.variables } : {}),
    ...(body.settings && typeof body.settings === 'object' ? { settings: body.settings as FlowDefinition['settings'] } : {}),
    ...(typeof body.version === 'number' ? { version: body.version } : {}),
    ...(typeof body.trigger === 'string' ? { trigger: body.trigger.trim() } : {}),
    updatedAt: new Date().toISOString(),
  };

  // Track status transitions
  if (body.status === 'active' && existing.status !== 'active') {
    updated.publishedAt = new Date().toISOString();
  }
  if (body.status === 'archived' && existing.status !== 'archived') {
    updated.archivedAt = new Date().toISOString();
  }

  const saved = await store.upsertFlowDefinition(updated);
  return jsonSuccess(saved);
}

/* ── DELETE ───────────────────────────────────────────────────────────── */

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const existing = await store.getFlowDefinition(id);
  if (!existing) return jsonError('NOT_FOUND', `Flow definition '${id}' not found.`, 404);

  await store.deleteFlowDefinition(id);
  return jsonSuccess({ deleted: true, id });
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function isValidStatus(s: string): s is FlowBuilderStatus {
  return ['draft', 'active', 'paused', 'archived', 'error'].includes(s);
}
