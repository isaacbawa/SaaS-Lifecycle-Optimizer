/* ==========================================================================
 * GET/PUT/DELETE /api/v1/segments/[id] — Single Segment Operations
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSegment, upsertSegment, deleteSegment, getSegmentMembers } from '@/lib/db/operations';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

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
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const segment = await upsertSegment(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: segment });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const ok = await deleteSegment(orgId, id);
        if (!ok) return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
