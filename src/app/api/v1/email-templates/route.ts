/* ==========================================================================
 * GET/POST /api/v1/email-templates — Email Template CRUD
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEmailTemplates, upsertEmailTemplate } from '@/lib/db/operations';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export async function GET(request: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status') ?? undefined;
        const templates = await getAllEmailTemplates(orgId, status);
        return NextResponse.json({ success: true, data: templates });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const template = await upsertEmailTemplate(orgId, body);
        return NextResponse.json({ success: true, data: template }, { status: body.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
