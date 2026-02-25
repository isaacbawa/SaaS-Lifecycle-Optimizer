/* ==========================================================================
 * GET/POST /api/v1/segments — Segment CRUD + Evaluation
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSegments, upsertSegment, getAllTrackedUsers, getAllTrackedAccounts, getSegmentMembers, clearSegmentMemberships, upsertSegmentMembership, updateSegmentCount } from '@/lib/db/operations';
import { evaluateSegmentBatch } from '@/lib/engine/segmentation';

/** Demo org ID — replace with Clerk org resolution in production */
const DEMO_ORG_ID = process.env.DEMO_ORG_ID ?? '';

async function resolveOrgId() {
    if (DEMO_ORG_ID) return DEMO_ORG_ID;
    // Fallback: get first org from DB
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
        const segments = await getAllSegments(orgId, status);

        return NextResponse.json({ success: true, data: segments });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const { action, ...data } = body;

        // Evaluate segment action
        if (action === 'evaluate' && data.id) {
            const users = await getAllTrackedUsers(orgId, { limit: 10000 });
            const accounts = await getAllTrackedAccounts(orgId, { limit: 10000 });
            const accountMap = new Map<string, Record<string, unknown>>();
            for (const a of accounts) accountMap.set(a.id, a as unknown as Record<string, unknown>);

            const existingMembers = await getSegmentMembers(data.id, 10000);
            const existingIds = new Set(existingMembers.map((m) => m.user.id));

            const result = evaluateSegmentBatch(
                data.filters ?? [],
                data.filterLogic ?? 'AND',
                users as unknown as Record<string, unknown>[],
                accountMap,
                existingIds,
            );

            // Update memberships
            await clearSegmentMemberships(data.id);
            for (const uid of result.matched) {
                await upsertSegmentMembership(data.id, uid);
            }
            await updateSegmentCount(data.id, result.matched.length);

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
        return NextResponse.json({ success: true, data: segment }, { status: data.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
