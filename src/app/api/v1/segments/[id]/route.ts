/* ==========================================================================
 * GET/PUT/DELETE /api/v1/segments/[id] - Single Segment Operations
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSegment, upsertSegment, deleteSegment, getSegmentMembers } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const segment = await getSegment(orgId, id);
        if (!segment) return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 });

        // Include members
        const members = await getSegmentMembers(id, 100);
        return NextResponse.json({
            success: true,
            data: {
                ...segment,
                members: members.map((m) => ({
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email,
                    lifecycleState: m.user.lifecycleState,
                    plan: m.user.plan,
                    mrr: m.user.mrr,
                    enteredAt: m.membership.enteredAt,
                })),
            },
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const body = await request.json();
        const segment = await upsertSegment(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: segment });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const ok = await deleteSegment(orgId, id);
        if (!ok) return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
