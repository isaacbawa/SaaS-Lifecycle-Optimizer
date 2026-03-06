/* ==========================================================================
 * GET/PUT/DELETE /api/v1/mailing-lists/[id] — Single Mailing List
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getMailingList, upsertMailingList, deleteMailingList, getMailingListContacts } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const list = await getMailingList(orgId, id);
        if (!list) return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });

        const { searchParams } = request.nextUrl;
        const includeContacts = searchParams.get('includeContacts') === 'true';

        if (includeContacts) {
            const contactResult = await getMailingListContacts(id, { limit: 100 });
            return NextResponse.json({ success: true, data: { ...list, contacts: contactResult.items, contactsPagination: { total: contactResult.total, limit: contactResult.limit, offset: contactResult.offset, hasMore: contactResult.hasMore } } });
        }

        return NextResponse.json({ success: true, data: list });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const body = await request.json();
        const list = await upsertMailingList(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: list });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;
        const { id } = await params;

        const ok = await deleteMailingList(orgId, id);
        if (!ok) return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
