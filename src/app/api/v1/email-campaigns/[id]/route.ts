/* ==========================================================================
 * GET/PUT/DELETE /api/v1/email-campaigns/[id]
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailCampaign, upsertEmailCampaign, deleteEmailCampaign, getCampaignSendStats } from '@/lib/db/operations';
import { computeCampaignMetrics } from '@/lib/engine/email-campaigns';

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
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { id } = await params;
        const campaign = await getEmailCampaign(orgId, id);
        if (!campaign) return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });

        // Get send stats
        const stats = await getCampaignSendStats(id);
        const metrics = computeCampaignMetrics(stats);

        return NextResponse.json({ success: true, data: { ...campaign, stats, metrics } });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { id } = await params;
        const body = await request.json();
        const campaign = await upsertEmailCampaign(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: campaign });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { id } = await params;
        await deleteEmailCampaign(orgId, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
