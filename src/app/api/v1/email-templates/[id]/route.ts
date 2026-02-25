/* ==========================================================================
 * GET/PUT/DELETE /api/v1/email-templates/[id] — Single Template Ops
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplate, upsertEmailTemplate, deleteEmailTemplate } from '@/lib/db/operations';
import { personalizeEmail } from '@/lib/engine/personalization';
import { getAllTrackedUsers } from '@/lib/db/operations';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        // Check if this is a preview request
        const { searchParams } = request.nextUrl;
        const preview = searchParams.get('preview') === 'true';

        const template = await getEmailTemplate(orgId, id);
        if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });

        if (preview) {
            // Preview with first user's data
            const users = await getAllTrackedUsers(orgId, { limit: 1 });
            if (users.length > 0) {
                const user = users[0] as unknown as Record<string, unknown>;
                const result = personalizeEmail(
                    {
                        subject: template.subject,
                        bodyHtml: template.bodyHtml,
                        bodyText: template.bodyText ?? undefined,
                        variables: (template.variables ?? []) as Array<{ key: string; label: string; source: string; fallback: string }>,
                        conditionalBlocks: template.conditionalBlocks as Array<{ id: string; name: string; htmlContent: string; rules: import('@/lib/db/schema').SegmentFilter[]; ruleLogic: 'AND' | 'OR' }> | undefined,
                    },
                    [],
                    user,
                    null,
                );
                return NextResponse.json({ success: true, data: { ...template, preview: result } });
            }
        }

        return NextResponse.json({ success: true, data: template });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const template = await upsertEmailTemplate(orgId, { ...body, id });
        return NextResponse.json({ success: true, data: template });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const ok = await deleteEmailTemplate(orgId, id);
        if (!ok) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
