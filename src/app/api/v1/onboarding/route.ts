/* ==========================================================================
 * GET /api/v1/onboarding — Onboarding Completion Status
 *
 * Returns precise, real-time completion state for each setup step.
 * Every check queries live data — nothing is approximated.
 *
 * Accuracy rules:
 *  - API Key:     At least 1 non-revoked key exists
 *  - SDK Data:    At least 1 tracked user OR 1 tracked event in DB
 *  - Domain:      At least 1 domain with SPF or DKIM verified = true
 *  - Template:    At least 1 email template (any status)
 *  - Segment:     At least 1 segment with 1+ filter rules defined
 *  - Flow:        At least 1 flow definition (draft or active)
 * ========================================================================== */

import { NextResponse } from 'next/server';
import {
    getSendingDomains,
    getAllEmailTemplates,
    getAllSegments,
    getAllFlowDefinitions,
    getTrackedUserCount,
    getEventCount,
    getApiKeysByOrg,
} from '@/lib/db/operations';

async function resolveOrgId() {
    const orgId = process.env.DEMO_ORG_ID;
    if (orgId) return orgId;
    const { db } = await import('@/lib/db');
    const { organizations } = await import('@/lib/db/schema');
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
    return org?.id ?? '';
}

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    href: string;
    cta: string;
    detail?: string;
}

export interface OnboardingStatus {
    steps: OnboardingStep[];
    completedCount: number;
    totalCount: number;
    allDone: boolean;
}

export async function GET() {
    try {
        const orgId = await resolveOrgId();

        // Fetch all data sources in parallel — fail-safe each
        const [apiKeys, eventCount, domains, templates, segments, flows, trackedUsers] =
            await Promise.all([
                orgId ? getApiKeysByOrg(orgId).catch(() => []) : Promise.resolve([]),
                orgId ? getEventCount(orgId).catch(() => 0) : Promise.resolve(0),
                orgId ? getSendingDomains(orgId).catch(() => []) : Promise.resolve([]),
                orgId ? getAllEmailTemplates(orgId).catch(() => []) : Promise.resolve([]),
                orgId ? getAllSegments(orgId).catch(() => []) : Promise.resolve([]),
                orgId ? getAllFlowDefinitions(orgId).catch(() => []) : Promise.resolve([]),
                orgId ? getTrackedUserCount(orgId).catch(() => 0) : Promise.resolve(0),
            ]);

        /* ── Step 1: API Key ─────────────────────────────────────── */
        const activeKeys = (apiKeys as { revokedAt?: string | null }[]).filter(k => !k.revokedAt);
        const hasApiKey = activeKeys.length > 0;

        /* ── Step 2: SDK Integration ─────────────────────────────── */
        const totalTracked = (trackedUsers as number) + (eventCount as number);
        const hasSDKData = totalTracked > 0;

        /* ── Step 3: Domain Verification ─────────────────────────── */
        type DomainRow = { spfVerified: boolean; dkimVerified: boolean; domain: string };
        const domainList = domains as DomainRow[];
        const verifiedDomains = domainList.filter(d => d.spfVerified || d.dkimVerified);
        const hasDomainVerified = verifiedDomains.length > 0;

        /* ── Step 4: Email Template ──────────────────────────────── */
        const templateCount = (templates as unknown[]).length;
        const hasTemplate = templateCount > 0;

        /* ── Step 5: Segment ─────────────────────────────────────── */
        type SegmentRow = { filters?: unknown; id: string };
        const segmentList = segments as SegmentRow[];
        const definedSegments = segmentList.filter(s => {
            if (!s.filters) return false;
            if (Array.isArray(s.filters)) return s.filters.length > 0;
            return true;
        });
        const hasSegment = definedSegments.length > 0;

        /* ── Step 6: Flow ────────────────────────────────────────── */
        const flowCount = (flows as unknown[]).length;
        const hasFlow = flowCount > 0;

        const steps: OnboardingStep[] = [
            {
                id: 'api_key',
                title: 'Generate an API key',
                description: 'Create a key so your application can authenticate and send tracking data to the platform.',
                completed: hasApiKey,
                href: '/sdk',
                cta: 'Open SDK Settings',
                detail: hasApiKey ? `${activeKeys.length} active` : undefined,
            },
            {
                id: 'install_sdk',
                title: 'Install SDK & send first event',
                description: 'Integrate the JavaScript or server-side SDK into your app and emit your first tracking event.',
                completed: hasSDKData,
                href: '/sdk',
                cta: 'View Integration Guide',
                detail: hasSDKData ? `${totalTracked.toLocaleString()} tracked` : undefined,
            },
            {
                id: 'verify_domain',
                title: 'Authenticate a sending domain',
                description: 'Add SPF and DKIM records so your emails reach inboxes instead of spam folders.',
                completed: hasDomainVerified,
                href: '/deliverability',
                cta: 'Set Up Domain',
                detail: hasDomainVerified
                    ? `${verifiedDomains[0].domain} verified`
                    : domainList.length > 0
                        ? `${domainList.length} pending`
                        : undefined,
            },
            {
                id: 'create_template',
                title: 'Design an email template',
                description: 'Use the visual email builder to create a professional template for your lifecycle flows.',
                completed: hasTemplate,
                href: '/email',
                cta: 'Open Email Builder',
                detail: hasTemplate ? `${templateCount} created` : undefined,
            },
            {
                id: 'create_segment',
                title: 'Define an audience segment',
                description: 'Create a dynamic segment with filter rules to target the right users in your flows.',
                completed: hasSegment,
                href: '/retention',
                cta: 'Create Segment',
                detail: hasSegment ? `${definedSegments.length} defined` : undefined,
            },
            {
                id: 'build_flow',
                title: 'Build your first automation flow',
                description: 'Design a lifecycle flow with triggers, delays, and actions to engage users automatically.',
                completed: hasFlow,
                href: '/flows',
                cta: 'Flow Builder',
                detail: hasFlow ? `${flowCount} built` : undefined,
            },
        ];

        const completedCount = steps.filter(s => s.completed).length;

        return NextResponse.json({
            success: true,
            data: {
                steps,
                completedCount,
                totalCount: steps.length,
                allDone: completedCount === steps.length,
            } satisfies OnboardingStatus,
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
