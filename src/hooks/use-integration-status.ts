/* ==========================================================================
 * useIntegrationStatus — Auto-detects connection state from real signals
 *
 * Instead of checking a separate "integrations" table, this hook queries
 * the actual API infrastructure (keys, health endpoint, webhooks) to
 * determine whether the SDK is installed, events are flowing, etc.
 *
 * This mirrors how Clerk detects whether your app is connected — no
 * manual "Connect" button needed.
 * ========================================================================== */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Types ───────────────────────────────────────────────────────────── */

export interface Integration {
    id: string;
    name: string;
    category: string;
    provider: string;
    status: 'connected' | 'pending' | 'disconnected' | 'error';
    capabilities: string[];
    lastHealthCheckAt?: string;
    lastDataReceivedAt?: string;
    lastError?: string;
    eventsLast24h: number;
    isPrimary: boolean;
}

export interface IntegrationStatus {
    loading: boolean;
    integrations: Integration[];
    capabilities: Set<string>;
    connectedCategories: Set<string>;
    /** Check if a specific capability is available */
    hasCapability: (cap: string) => boolean;
    /** Check if a category has at least one connected integration */
    hasCategoryConnected: (cat: string) => boolean;
    /** SDK specifically connected (API key exists + events flowing)? */
    sdkConnected: boolean;
    /** Email provider connected? */
    emailConnected: boolean;
    /** Refresh from server */
    refresh: () => Promise<void>;
    /** Get missing requirements for a flow node key (e.g. "trigger:lifecycle_change") */
    getMissingRequirements: (nodeKey: string) => { missing: boolean; category: string; description: string } | null;
}

/* ── Capability requirements map ─────────────────────────────────────── */

const CAPABILITY_MAP: Record<string, { capability: string; category: string; description: string }> = {
    /* Trigger requirements */
    'trigger:lifecycle_change': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to track lifecycle state changes' },
    'trigger:event_received': { capability: 'event_tracking', category: 'sdk', description: 'SDK must be installed to receive product events' },
    'trigger:segment_entry': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to evaluate segment membership' },
    'trigger:webhook_received': { capability: 'inbound_webhook', category: 'webhook', description: 'An inbound webhook endpoint must be configured' },

    /* Action requirements */
    'action:send_email': { capability: 'email_send', category: 'email', description: 'Email provider must be configured to send emails' },
    'action:send_webhook': { capability: 'outbound_webhook', category: 'webhook', description: 'Webhook URL must be configured' },
    'action:update_user': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to update user properties' },
    'action:add_tag': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to manage user tags' },
    'action:remove_tag': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to manage user tags' },
    'action:api_call': { capability: 'outbound_api', category: 'webhook', description: 'External API endpoint must be configured' },
    'action:send_notification': { capability: 'push_notification', category: 'sdk', description: 'SDK with push notification support must be configured' },

    /* Condition requirements */
    'condition:user_property': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to read user properties' },
    'condition:event_count': { capability: 'event_tracking', category: 'sdk', description: 'SDK must be installed to count user events' },
    'condition:account_property': { capability: 'account_tracking', category: 'sdk', description: 'SDK must be installed with account (group) tracking' },
};

/* ── Hook ────────────────────────────────────────────────────────────── */

export function useIntegrationStatus(): IntegrationStatus {
    const [loading, setLoading] = useState(true);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const capsRef = useRef(new Set<string>());
    const catsRef = useRef(new Set<string>());

    const fetchStatus = useCallback(async () => {
        try {
            // Use a single hardcoded key for the status check (same as SDK page)
            const authHeader = 'Bearer lcos_live_a1b2c3d4e5f6g7h8i9j0';

            // Fetch health endpoint to check if events are flowing
            const [healthRes, keysRes, webhooksRes] = await Promise.all([
                fetch('/api/v1/health', { headers: { Authorization: authHeader } }).catch(() => null),
                fetch('/api/v1/keys', { headers: { Authorization: authHeader } }).catch(() => null),
                fetch('/api/v1/webhooks', { headers: { Authorization: authHeader } }).catch(() => null),
            ]);

            const healthData = healthRes?.ok ? await healthRes.json().catch(() => ({})) : {};
            const keysData = keysRes?.ok ? await keysRes.json().catch(() => ({})) : {};
            const webhooksData = webhooksRes?.ok ? await webhooksRes.json().catch(() => ({})) : {};

            const apiKeyCount = keysData.data?.keys?.length ?? 0;
            const usersTracked = healthData.data?.usersTracked ?? 0;
            const eventsStored = healthData.data?.eventsStored ?? 0;
            const webhookCount = webhooksData.data?.webhooks?.length ?? 0;

            const hasApiKeys = apiKeyCount > 0;
            const hasEvents = usersTracked > 0 || eventsStored > 0;
            const hasWebhooks = webhookCount > 0;

            // Build capabilities from real signals
            const caps = new Set<string>();
            const cats = new Set<string>();
            const syntheticIntegrations: Integration[] = [];

            // SDK is "connected" when API keys exist AND events are flowing
            if (hasApiKeys && hasEvents) {
                caps.add('user_tracking');
                caps.add('event_tracking');
                caps.add('account_tracking');
                caps.add('push_notification');
                cats.add('sdk');
                syntheticIntegrations.push({
                    id: 'sdk-auto', name: 'LifecycleOS SDK', category: 'sdk',
                    provider: 'lifecycleos_sdk', status: 'connected',
                    capabilities: ['user_tracking', 'event_tracking', 'account_tracking', 'push_notification'],
                    eventsLast24h: eventsStored, isPrimary: true,
                });
            } else if (hasApiKeys) {
                // API key exists but no events yet — SDK installed but not sending
                syntheticIntegrations.push({
                    id: 'sdk-auto', name: 'LifecycleOS SDK', category: 'sdk',
                    provider: 'lifecycleos_sdk', status: 'pending',
                    capabilities: [], eventsLast24h: 0, isPrimary: true,
                });
            }

            // Webhooks
            if (hasWebhooks) {
                caps.add('outbound_webhook');
                caps.add('inbound_webhook');
                caps.add('outbound_api');
                cats.add('webhook');
                syntheticIntegrations.push({
                    id: 'webhook-auto', name: 'Webhooks', category: 'webhook',
                    provider: 'webhooks', status: 'connected',
                    capabilities: ['outbound_webhook', 'inbound_webhook', 'outbound_api'],
                    eventsLast24h: 0, isPrimary: false,
                });
            }

            // Email is built-in to the platform (flow actions handle it)
            caps.add('email_send');
            cats.add('email');

            capsRef.current = caps;
            catsRef.current = cats;
            setIntegrations(syntheticIntegrations);
        } catch {
            // Silently fail — assume nothing connected
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const hasCapability = useCallback((cap: string) => capsRef.current.has(cap), []);
    const hasCategoryConnected = useCallback((cat: string) => catsRef.current.has(cat), []);

    const getMissingRequirements = useCallback((nodeKey: string) => {
        const req = CAPABILITY_MAP[nodeKey];
        if (!req) return null; // no requirement for this node type
        if (capsRef.current.has(req.capability)) return null; // satisfied
        return { missing: true, category: req.category, description: req.description };
    }, []);

    return {
        loading,
        integrations,
        capabilities: capsRef.current,
        connectedCategories: catsRef.current,
        hasCapability,
        hasCategoryConnected,
        sdkConnected: catsRef.current.has('sdk'),
        emailConnected: catsRef.current.has('email'),
        refresh: fetchStatus,
        getMissingRequirements,
    };
}
