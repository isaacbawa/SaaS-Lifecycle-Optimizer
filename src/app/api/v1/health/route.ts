/* ==========================================================================
 * GET /api/v1/health - System Health Check
 *
 * Returns system status and uptime. Detailed data (user counts, etc.)
 * is only included for authenticated requests.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/api/auth';
import {
    getTrackedUserCount, getTrackedAccountCount, getEventCount,
    getAllFlowDefinitions, getWebhooks, getApiKeysByOrg,
} from '@/lib/db/operations';

const startedAt = Date.now();

export async function GET(request: NextRequest) {
    const uptimeMs = Date.now() - startedAt;

    // Try to authenticate - if it fails, return minimal health info
    const authResult = await authenticate(request, ['read']);
    if (!authResult.success) {
        return NextResponse.json(
            {
                status: 'healthy',
                version: '1.0.0',
                uptime: {
                    ms: uptimeMs,
                    human: formatUptime(uptimeMs),
                },
                timestamp: new Date().toISOString(),
            },
            {
                status: 200,
                headers: { 'Cache-Control': 'no-store' },
            },
        );
    }

    const orgId = authResult.orgId;

    const [userCount, accountCount, eventCount, flows, webhooks, keys] = await Promise.all([
        orgId ? getTrackedUserCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getTrackedAccountCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getEventCount(orgId).catch(() => 0) : Promise.resolve(0),
        orgId ? getAllFlowDefinitions(orgId).then(r => r.items).catch(() => []) : Promise.resolve([]),
        orgId ? getWebhooks(orgId).catch(() => []) : Promise.resolve([]),
        orgId ? getApiKeysByOrg(orgId).catch(() => []) : Promise.resolve([]),
    ]);

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
