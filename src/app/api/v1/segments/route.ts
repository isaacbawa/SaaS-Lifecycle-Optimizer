/* ==========================================================================
 * GET/POST /api/v1/segments - Segment CRUD + Evaluation
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSegments, getSegment, upsertSegment, getAllTrackedUsers, getAllTrackedAccounts, getSegmentMembers, clearSegmentMemberships, upsertSegmentMembership, updateSegmentCount } from '@/lib/db/operations';
import { evaluateSegmentBatch } from '@/lib/engine/segmentation';
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
        const result = await getAllSegments(orgId, status, pagination);

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
        const { action, ...data } = body;

        // Evaluate segment action
        if (action === 'evaluate' && data.id) {
            const segment = await getSegment(orgId, data.id);
            if (!segment) {
                return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 });
            }

            const users = await getAllTrackedUsers(orgId, { limit: 10000 });
            const accounts = await getAllTrackedAccounts(orgId, { limit: 10000 });
            const accountMap = new Map<string, Record<string, unknown>>();
            for (const a of accounts) accountMap.set(a.id, a as unknown as Record<string, unknown>);

            const existingMembers = await getSegmentMembers(orgId, segment.id, 10000);
            const existingIds = new Set(existingMembers.map((m) => m.user.id));

            const result = evaluateSegmentBatch(
                data.filters ?? segment.filters,
                data.filterLogic ?? segment.filterLogic,
                users as unknown as Record<string, unknown>[],
                accountMap,
                existingIds,
            );

            // Update memberships
            await clearSegmentMemberships(orgId, segment.id);
            for (const uid of result.matched) {
                await upsertSegmentMembership(orgId, segment.id, uid);
            }
            await updateSegmentCount(orgId, segment.id, result.matched.length);

            return NextResponse.json({
                success: true,
                data: {
                    matched: result.matched.length,
                    entered: result.entered.length,
                    exited: result.exited.length,
                    total: result.total,
                },
            });
        }

        // Preview segment (evaluate without saving memberships)
        if (action === 'preview') {
            const users = await getAllTrackedUsers(orgId, { limit: 10000 });
            const accounts = await getAllTrackedAccounts(orgId, { limit: 10000 });
            const accountMap = new Map<string, Record<string, unknown>>();
            for (const a of accounts) accountMap.set(a.id, a as unknown as Record<string, unknown>);

            const result = evaluateSegmentBatch(
                data.filters ?? [],
                data.filterLogic ?? 'AND',
                users as unknown as Record<string, unknown>[],
                accountMap,
                new Set(),
            );

            // Return matched user details
            const matchedUsers = users.filter((u) => result.matched.includes(u.id));

            return NextResponse.json({
                success: true,
                data: {
                    matchedCount: result.matched.length,
                    totalEvaluated: result.total,
                    users: matchedUsers.slice(0, 50).map((u) => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        lifecycleState: u.lifecycleState,
                        plan: u.plan,
                        mrr: u.mrr,
                    })),
                },
            });
        }

        // Create/update segment
        const segment = await upsertSegment(orgId, data);
        if (!segment) {
            if (data.id) {
                return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 });
            }

            return NextResponse.json({ success: false, error: 'Failed to create segment' }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: segment }, { status: data.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
