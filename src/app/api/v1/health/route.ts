/* ==========================================================================
 * GET /api/v1/health — System Health Check
 *
 * Public endpoint (no auth required) that returns system status,
 * uptime, and basic store statistics.  Used by monitoring and
 * load balancers.
 * ========================================================================== */

import { NextResponse } from 'next/server';
import { resolveOrgId } from '@/lib/auth/resolve-org';
import {
    getTrackedUserCount, getTrackedAccountCount, getEventCount,
    getAllFlowDefinitions, getWebhooks, getApiKeysByOrg,
} from '@/lib/db/operations';

const startedAt = Date.now();

export async function GET() {
    let orgId: string;
    try {
        orgId = await resolveOrgId();
    } catch {
        orgId = '';
    }

    const [userCount, accountCount, eventCount, flows, webhooks, keys] = await Promise.all([
        orgId ? getTrackedUserCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getTrackedAccountCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getEventCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getAllFlowDefinitions(orgId).catch(() => []) : Promise.resolve([]),
        orgId ? getWebhooks(orgId).catch(() => []) : Promise.resolve([]),
        orgId ? getApiKeysByOrg(orgId).catch(() => []) : Promise.resolve([]),
    ]);

    const uptimeMs = Date.now() - startedAt;

    return NextResponse.json(
        {
            status: 'healthy',
            version: '1.0.0',
            uptime: {
                ms: uptimeMs,
                human: formatUptime(uptimeMs),
            },
            data: {
                usersTracked: userCount,
                accountsTracked: accountCount,
                eventsStored: eventCount,
                flowsCount: flows.length,
                webhooksCount: webhooks.length,
                apiKeysCount: keys.length,
            },
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        },
    );
}

function formatUptime(ms: number): string {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${mins % 60}m`;
    if (hours > 0) return `${hours}h ${mins % 60}m ${secs % 60}s`;
    if (mins > 0) return `${mins}m ${secs % 60}s`;
    return `${secs}s`;
}
