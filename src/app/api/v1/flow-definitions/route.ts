/* ==========================================================================
 * /api/v1/flow-definitions
 *
 * GET  — List all flow definitions (filterable by status)
 * POST — Create a new blank flow definition
 *
 * These are internal management endpoints used by the dashboard UI.
 * They bypass Bearer-token auth since they're same-origin only.
 * The CORS middleware blocks cross-origin access.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';
import { getAllFlowDefinitions, upsertFlowDefinition } from '@/lib/db/operations';
import { mapFlowDefToUI } from '@/lib/db/mappers';
import type { FlowBuilderStatus, FlowNodeDef, FlowEdgeDef } from '@/lib/definitions';

function jsonSuccess<T>(data: T, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

function jsonError(code: string, message: string, status = 400) {
    return NextResponse.json(
        { success: false, error: { code, message } },
        { status },
    );
}

/* ── GET ─────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as FlowBuilderStatus | null;
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    const authResult = await requireDashboardAuth();
    if (!authResult.success) return authResult.response;
    const orgId = authResult.orgId;

    const pagination = (limitParam || offsetParam) ? {
        limit: limitParam ? parseInt(limitParam, 10) : undefined,
        offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
    } : undefined;

    const result = await getAllFlowDefinitions(orgId, status ?? undefined, pagination);
    const flows = result.items.map(mapFlowDefToUI);

    // Sort by updatedAt desc
    flows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({
        success: true,
        data: flows,
        pagination: { total: result.total, limit: result.limit, offset: result.offset, hasMore: result.hasMore },
    });
}

/* ── POST ────────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!name) {
        return jsonError('VALIDATION_ERROR', 'Flow name is required.', 422);
    }

    const authResult = await requireDashboardAuth();
    if (!authResult.success) return authResult.response;
    const orgId = authResult.orgId;

    /* ── Template-based or blank creation ─────────────────── */
    const hasTemplateData = Array.isArray(body.nodes) && (body.nodes as FlowNodeDef[]).length > 0;

    let nodes: FlowNodeDef[];
    let edges: FlowEdgeDef[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let variables: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let settings: any;

    if (hasTemplateData) {
        // Use template data provided by the client
        nodes = body.nodes as FlowNodeDef[];
        edges = Array.isArray(body.edges) ? (body.edges as FlowEdgeDef[]) : [];
        variables = Array.isArray(body.variables) ? body.variables : [];
        settings = body.settings && typeof body.settings === 'object' ? body.settings : {
            enrollmentCap: 0,
            maxConcurrentEnrollments: 5000,
            autoExitDays: 30,
            respectQuietHours: true,
            priority: 5,
        };
    } else {
        // Create a starter trigger + exit node
        const triggerNode: FlowNodeDef = {
            id: `node_${crypto.randomUUID().substring(0, 8)}`,
            type: 'trigger',
            position: { x: 400, y: 80 },
            data: {
                label: 'Trigger',
                description: '',
                nodeType: 'trigger',
                triggerConfig: {
                    kind: 'lifecycle_change',
                    allowReEntry: false,
                    reEntryCooldownMinutes: 1440,
                },
            },
        };

        const exitNode: FlowNodeDef = {
            id: `node_${crypto.randomUUID().substring(0, 8)}`,
            type: 'exit',
            position: { x: 400, y: 350 },
            data: {
                label: 'Exit',
                description: '',
                nodeType: 'exit',
                exitConfig: { reason: '' },
            },
        };

        const edge: FlowEdgeDef = {
            id: `edge_${crypto.randomUUID().substring(0, 8)}`,
            source: triggerNode.id,
            target: exitNode.id,
        };

        nodes = [triggerNode, exitNode];
        edges = [edge];
        variables = [];
        settings = {
            enrollmentCap: 0,
            maxConcurrentEnrollments: 0,
            autoExitDays: 30,
            respectQuietHours: false,
            priority: 5,
            enrollmentTags: [],
        };
    }

    const dbFlow = await upsertFlowDefinition(orgId, {
        name,
        description,
        status: 'draft',
        version: 1,
        nodes,
        edges,
        variables,
        settings,
        metrics: {
            totalEnrolled: 0,
            currentlyActive: 0,
            completed: 0,
            goalReached: 0,
            exitedEarly: 0,
            errorCount: 0,
            revenueGenerated: 0,
            openRate: 0,
            clickRate: 0,
        },
    });

    const saved = mapFlowDefToUI(dbFlow);
    return jsonSuccess(saved, 201);
}
