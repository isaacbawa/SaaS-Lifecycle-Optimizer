/* ==========================================================================
 * GET/PUT/DELETE /api/v1/email-campaigns/[id]
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailCampaign, upsertEmailCampaign, deleteEmailCampaign, getCampaignSendStats } from '@/lib/db/operations';
import { computeCampaignMetrics } from '@/lib/engine/email-campaigns';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

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
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const { id } = await params;
        const body = await request.json();
        const campaign = await upsertEmailCampaign(orgId, { ...body, id });
        if (!campaign) return NextResponse.json({ success: false, error: 'Referenced segment or mailing list not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: campaign });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const { id } = await params;
        const deleted = await deleteEmailCampaign(orgId, id);
        if (!deleted) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
