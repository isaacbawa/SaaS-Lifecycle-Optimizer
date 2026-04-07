/* ==========================================================================
 * GET/PUT/DELETE /api/v1/mailing-lists/[id] - Single Mailing List
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getMailingList, upsertMailingList, deleteMailingList, getMailingListContacts } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

/** Sanitize DB errors - never leak SQL queries or internal details to the client. */
function safeError(err: unknown): { message: string; status: number } {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('mailing_lists_org_name_idx') || msg.includes('unique constraint')) {
        return { message: 'A mailing list with this name already exists', status: 409 };
    }
    console.error('[mailing-lists/[id]] API error:', err);
    return { message: 'An unexpected error occurred. Please try again.', status: 500 };
}

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
            const contactResult = await getMailingListContacts(orgId, id, { limit: 100 });
            return NextResponse.json({ success: true, data: { ...list, contacts: contactResult.items, contactsPagination: { total: contactResult.total, limit: contactResult.limit, offset: contactResult.offset, hasMore: contactResult.hasMore } } });
        }

        return NextResponse.json({ success: true, data: list });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
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

        // Only allow safe fields to be updated
        const updates: Record<string, unknown> = { id };
        if (typeof body.name === 'string' && body.name.trim()) {
            if (body.name.trim().length > 500) {
                return NextResponse.json({ success: false, error: 'List name must be 500 characters or fewer' }, { status: 400 });
            }
            updates.name = body.name.trim();
        }
        if (typeof body.description === 'string') updates.description = body.description.slice(0, 5000);
        if (body.status && ['active', 'archived'].includes(body.status)) updates.status = body.status;
        if (Array.isArray(body.tags) && body.tags.every((t: unknown) => typeof t === 'string')) updates.tags = body.tags;

        const list = await upsertMailingList(orgId, updates as Parameters<typeof upsertMailingList>[1]);
        if (!list) return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: list });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
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
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
