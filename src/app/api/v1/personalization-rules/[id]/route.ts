/* ==========================================================================
 * GET/PUT/DELETE /api/v1/personalization-rules/[id]
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizationRule, upsertPersonalizationRule, deletePersonalizationRule, incrementPersonalizationImpression, incrementPersonalizationConversion } from '@/lib/db/operations';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { id } = await params;
        const rule = await getPersonalizationRule(orgId, id);
        if (!rule) return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });

        // Calculate conversion rate
        const impressions = rule.impressionCount ?? 0;
        const conversions = rule.conversionCount ?? 0;
        const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

        return NextResponse.json({ success: true, data: { ...rule, conversionRate } });
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

        // Track impressions/conversions
        if (body.action === 'impression') {
            await incrementPersonalizationImpression(id);
            return NextResponse.json({ success: true });
        }
        if (body.action === 'conversion') {
            await incrementPersonalizationConversion(id);
            return NextResponse.json({ success: true });
        }

        const rule = await upsertPersonalizationRule(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: rule });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { id } = await params;
        await deletePersonalizationRule(orgId, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
