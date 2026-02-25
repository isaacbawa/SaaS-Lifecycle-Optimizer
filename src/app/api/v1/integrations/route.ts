/* ==========================================================================
 * GET/POST /api/v1/integrations — Integration CRUD + health check
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import {
    getAllIntegrations,
    upsertIntegration,
    getIntegrationCapabilities,
    updateIntegrationStatus,
    getIntegrationByProvider,
} from '@/lib/db/operations';

async function resolveOrgId() {
    if (process.env.DEMO_ORG_ID) return process.env.DEMO_ORG_ID;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No org' }, { status: 400 });

        const url = new URL(req.url);
        const status = url.searchParams.get('status') ?? undefined;
        const action = url.searchParams.get('action');

        // Return capabilities summary
        if (action === 'capabilities') {
            const caps = await getIntegrationCapabilities(orgId);
            return NextResponse.json({ success: true, data: caps });
        }

        const list = await getAllIntegrations(orgId, status);
        return NextResponse.json({ success: true, data: list });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No org' }, { status: 400 });

        const data = await req.json();
        const { action } = data;

        // Health check action
        if (action === 'health_check') {
            const { integrationId } = data;
            if (!integrationId) {
                return NextResponse.json({ success: false, error: 'integrationId required' }, { status: 400 });
            }
            // Simulate a health check (in production, this would ping the actual service)
            const isHealthy = true; // Placeholder — would do actual connection test
            await updateIntegrationStatus(orgId, integrationId, isHealthy ? 'connected' : 'error', isHealthy ? undefined : 'Health check failed');
            return NextResponse.json({ success: true, data: { healthy: isHealthy } });
        }

        // Connect action — sets up a new integration
        if (action === 'connect') {
            const { provider, name, category, config, capabilities } = data;
            if (!provider || !name || !category) {
                return NextResponse.json({ success: false, error: 'provider, name, category required' }, { status: 400 });
            }

            // Check if already exists
            const existing = await getIntegrationByProvider(orgId, provider);
            if (existing) {
                const updated = await upsertIntegration(orgId, {
                    id: existing.id,
                    status: 'connected',
                    config: config ?? existing.config,
                    capabilities: capabilities ?? existing.capabilities,
                    lastHealthCheckAt: new Date(),
                    lastError: null,
                });
                return NextResponse.json({ success: true, data: updated });
            }

            const integration = await upsertIntegration(orgId, {
                name,
                provider,
                category,
                status: 'connected',
                config: config ?? {},
                capabilities: capabilities ?? [],
                lastHealthCheckAt: new Date(),
                isPrimary: category === 'sdk',
            });
            return NextResponse.json({ success: true, data: integration }, { status: 201 });
        }

        // Disconnect action
        if (action === 'disconnect') {
            const { integrationId } = data;
            if (!integrationId) {
                return NextResponse.json({ success: false, error: 'integrationId required' }, { status: 400 });
            }
            await updateIntegrationStatus(orgId, integrationId, 'disconnected');
            return NextResponse.json({ success: true });
        }

        // Default: create/update integration
        const integration = await upsertIntegration(orgId, data);
        return NextResponse.json({ success: true, data: integration }, { status: data.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
