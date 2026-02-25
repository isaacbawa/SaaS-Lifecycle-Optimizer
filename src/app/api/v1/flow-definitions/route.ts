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
import { store } from '@/lib/store';
import type { FlowDefinition, FlowBuilderStatus, FlowNodeDef, FlowEdgeDef } from '@/lib/definitions';

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

    const flows = status
        ? await store.getFlowDefinitionsByStatus(status)
        : await store.getAllFlowDefinitions();

    // Sort by updatedAt desc
    flows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return jsonSuccess(flows);
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

    const now = new Date().toISOString();
    const id = `fdef_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 8)}`;

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

    const flow: FlowDefinition = {
        id,
        name,
        description,
        trigger: '',
        status: 'draft',
        version: 1,
        nodes: [triggerNode, exitNode],
        edges: [edge],
        variables: [],
        settings: {
            enrollmentCap: 0,
            maxConcurrentEnrollments: 0,
            autoExitDays: 30,
            respectQuietHours: false,
            priority: 5,
            enrollmentTags: [],
        },
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
        createdAt: now,
        updatedAt: now,
    };

    const saved = await store.upsertFlowDefinition(flow);
    return jsonSuccess(saved, 201);
}
