/* ==========================================================================
 * GET/POST /api/v1/mailing-lists - Mailing List CRUD
 *
 * Manages external contact lists for campaigns. These lists contain
 * contacts who are NOT tracked SaaS users - newsletter subscribers,
 * event leads, imported contacts, etc.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllMailingLists, upsertMailingList } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

/** Sanitize DB errors - never leak SQL queries or internal details to the client. */
function safeError(err: unknown): { message: string; status: number } {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('mailing_lists_org_name_idx') || msg.includes('unique constraint')) {
        return { message: 'A mailing list with this name already exists', status: 409 };
    }
    console.error('[mailing-lists] API error:', err);
    return { message: 'An unexpected error occurred. Please try again.', status: 500 };
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status') ?? undefined;
        const limitParam = searchParams.get('limit');
        const offsetParam = searchParams.get('offset');
        const pagination = (limitParam || offsetParam) ? {
            limit: limitParam ? parseInt(limitParam, 10) : undefined,
            offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
        } : undefined;

        const result = await getAllMailingLists(orgId, status, pagination);
        return NextResponse.json({
            success: true,
            data: result.items,
            pagination: { total: result.total, limit: result.limit, offset: result.offset, hasMore: result.hasMore },
        });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const body = await request.json();
        const { name, description, status, tags, id } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ success: false, error: 'List name is required' }, { status: 400 });
        }

        if (name.trim().length > 500) {
            return NextResponse.json({ success: false, error: 'List name must be 500 characters or fewer' }, { status: 400 });
        }

        // Validate status if provided
        if (status && !['active', 'archived'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Status must be "active" or "archived"' }, { status: 400 });
        }

        // Validate tags if provided
        if (tags !== undefined && (!Array.isArray(tags) || !tags.every((t: unknown) => typeof t === 'string'))) {
            return NextResponse.json({ success: false, error: 'Tags must be an array of strings' }, { status: 400 });
        }

        const list = await upsertMailingList(orgId, {
            id: id ?? undefined,
            name: name.trim(),
            description: typeof description === 'string' ? description.slice(0, 5000) : '',
            status: status ?? 'active',
            tags: tags ?? [],
        });

        if (!list) {
            return NextResponse.json({ success: false, error: 'Mailing list not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: list }, { status: id ? 200 : 201 });
    } catch (err) {
        const { message, status } = safeError(err);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
