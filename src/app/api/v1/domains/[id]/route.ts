/* ==========================================================================
 * GET/DELETE /api/v1/domains/[id] — Single Domain Operations
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSendingDomainById, deleteSendingDomain } from '@/lib/db/operations';
import { verifyDomain } from '@/lib/engine/dns-verification';
import { deleteDomainIdentity } from '@/lib/engine/ses-identity';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

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
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const { id } = await params;

        // Fetch the domain name before deletion so we can also remove it from SES
        const domainRecord = await getSendingDomainById(orgId, id);
        if (domainRecord) {
            // Remove from SES transparently (best-effort, non-blocking)
            await deleteDomainIdentity(domainRecord.domain).catch((err) => {
                console.warn(`[domains] Could not remove "${domainRecord.domain}" from SES:`, err);
            });
        }

        await deleteSendingDomain(orgId, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
