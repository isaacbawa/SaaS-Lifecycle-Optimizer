/* ==========================================================================
 * GET /api/v1/health — System Health Check
 *
 * Public endpoint (no auth required) that returns system status,
 * uptime, and basic store statistics.  Used by monitoring and
 * load balancers.
 * ========================================================================== */

import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

const startedAt = Date.now();

export async function GET() {
    const [users, accounts, flows, webhooks, events, keys] = await Promise.all([
        store.getAllUsers(),
        store.getAllAccounts(),
        store.getAllFlows(),
        store.getWebhooks(),
        store.getEvents({ limit: 1 }),     // just to check store is alive
        store.getApiKeys(),
    ]);

    const totalEvents = await store.getEvents({});
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
                usersTracked: users.length,
                accountsTracked: accounts.length,
                eventsStored: totalEvents.length,
                flowsCount: flows.length,
                webhooksCount: webhooks.length,
                apiKeysCount: keys.length,
                lastEventAt: totalEvents.length > 0 ? totalEvents[0].timestamp : null,
            },
            store: {
                users: users.length,
                accounts: accounts.length,
                flows: flows.length,
                webhooks: webhooks.length,
                apiKeys: keys.length,
            },
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-store',
            },
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
