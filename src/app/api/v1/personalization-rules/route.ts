/* ==========================================================================
 * GET/POST /api/v1/personalization-rules — Rules CRUD + resolve
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPersonalizationRules, upsertPersonalizationRule, getAllTrackedUsers, getTrackedAccount } from '@/lib/db/operations';
import { resolveAllPersonalizations } from '@/lib/engine/personalization';
import type { SegmentFilter, PersonalizationVariant, VariableMapping } from '@/lib/db/schema';

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
        const channel = searchParams.get('channel') ?? undefined;
        let rules = await getAllPersonalizationRules(orgId, status);
        if (channel) {
            rules = rules.filter(r => r.channel === channel);
        }
        return NextResponse.json({ success: true, data: rules });
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

        // Resolve personalization for a given user
        if (action === 'resolve') {
            const { trackedUserId, channel, eventData } = data;
            if (!trackedUserId) return NextResponse.json({ success: false, error: 'trackedUserId required' }, { status: 400 });

            const users = await getAllTrackedUsers(orgId, { limit: 10000 });
            const user = users.find(u => u.id === trackedUserId || u.externalId === trackedUserId);
            if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

            let account: Record<string, unknown> | null = null;
            if (user.accountId) {
                const a = await getTrackedAccount(orgId, user.accountId);
                account = a as unknown as Record<string, unknown>;
            }

            let rules = await getAllPersonalizationRules(orgId, 'active');
            if (channel) {
                rules = rules.filter(r => r.channel === channel);
            }

            // Map rules to the engine format
            const engineRules = rules.map(r => ({
                id: r.id,
                name: r.name,
                priority: r.priority ?? 0,
                filters: (r.filters ?? []) as SegmentFilter[],
                filterLogic: (r.filterLogic ?? 'and') as string,
                variableMappings: (r.variableMappings ?? []) as VariableMapping[],
                variants: (r.variants ?? []) as PersonalizationVariant[],
            }));

            const result = resolveAllPersonalizations(
                engineRules,
                user as unknown as Record<string, unknown>,
                account,
                eventData,
            );

            return NextResponse.json({ success: true, data: result });
        }

        // Create/update rule
        const rule = await upsertPersonalizationRule(orgId, data);
        return NextResponse.json({ success: true, data: rule }, { status: data.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
