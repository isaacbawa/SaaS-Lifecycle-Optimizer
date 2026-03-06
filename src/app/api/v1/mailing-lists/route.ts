/* ==========================================================================
 * GET/POST /api/v1/mailing-lists — Mailing List CRUD
 *
 * Manages external contact lists for campaigns. These lists contain
 * contacts who are NOT tracked SaaS users — newsletter subscribers,
 * event leads, imported contacts, etc.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllMailingLists, upsertMailingList } from '@/lib/db/operations';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

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
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
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

        const list = await upsertMailingList(orgId, {
            id: id ?? undefined,
            name: name.trim(),
            description: description ?? '',
            status: status ?? 'active',
            tags: tags ?? [],
        });

        return NextResponse.json({ success: true, data: list }, { status: id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
