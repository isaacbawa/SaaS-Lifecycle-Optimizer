/* ==========================================================================
 * GET/DELETE /api/v1/domains/[id] — Single Domain Operations
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSendingDomainById, deleteSendingDomain } from '@/lib/db/operations';
import { verifyDomain } from '@/lib/engine/dns-verification';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization' }, { status: 400 });

        const { id } = await params;
        const domain = await getSendingDomainById(orgId, id);
        if (!domain) return NextResponse.json({ success: false, error: 'Domain not found' }, { status: 404 });

        // Run fresh verification if requested
        const url = new URL(_request.url);
        if (url.searchParams.get('verify') === 'true') {
            const result = await verifyDomain(domain.domain);
            return NextResponse.json({
                success: true,
                data: { domain, verification: result },
            });
        }

        return NextResponse.json({ success: true, data: domain });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization' }, { status: 400 });

        const { id } = await params;
        await deleteSendingDomain(orgId, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
