/* ==========================================================================
 * GET/POST /api/v1/domains — Sending Domain Management
 *
 * Handles domain registration, DNS verification, and listing.
 * When AWS SES is configured, domains are registered as SES email
 * identities behind the scenes so SES can sign DKIM automatically.
 * ==========================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSendingDomains, upsertSendingDomain } from '@/lib/db/operations';
import { generateRequiredRecords, verifyDomain } from '@/lib/engine/dns-verification';
import {
    configureMailFromDomain,
    getDomainIdentityStatus,
    isSesConfigured,
    registerDomainIdentity,
} from '@/lib/engine/ses-identity';
import { requireDashboardAuth } from '@/lib/api/dashboard-auth';

function normalizeDomain(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '');
}

function computeStatus(params: {
    sesEnabled: boolean;
    sesVerified: boolean;
    dkimVerified: boolean;
    spfVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
}): 'verified' | 'partial' | 'pending' | 'failed' {
    const { sesEnabled, sesVerified, dkimVerified, spfVerified, dmarcVerified, mxVerified } = params;

    const hasAny = dkimVerified || spfVerified || dmarcVerified || mxVerified;

    if (sesEnabled) {
        if (sesVerified && dkimVerified && spfVerified && dmarcVerified) return 'verified';
        if (hasAny) return 'partial';
        return 'pending';
    }

    if (dkimVerified && spfVerified && dmarcVerified) return 'verified';
    if (hasAny) return 'partial';
    return 'pending';
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const { searchParams } = request.nextUrl;
        const domain = searchParams.get('domain');

        const domains = await getSendingDomains(orgId);

        if (domain) {
            const normalized = normalizeDomain(domain);
            const found = domains.find((d) => d.domain === normalized);
            return NextResponse.json({ success: true, data: found ?? null });
        }

        return NextResponse.json({ success: true, data: domains });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireDashboardAuth();
        if (!authResult.success) return authResult.response;
        const { orgId } = authResult;

        const body = await request.json();
        const action = body?.action;
        const sesEnabled = isSesConfigured();

        if (action === 'add') {
            if (!body?.domain || typeof body.domain !== 'string') {
                return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
            }

            const domain = normalizeDomain(body.domain);
            if (!domain.includes('.') || domain.length < 3) {
                return NextResponse.json({ success: false, error: 'Invalid domain format' }, { status: 400 });
            }

            const sesResult = await registerDomainIdentity(domain);
            if (sesEnabled && !sesResult.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Failed to register domain in SES: ${sesResult.error ?? 'Unknown SES error'}`,
                    },
                    { status: 502 },
                );
            }

            const requiredRecords = generateRequiredRecords(
                domain,
                sesResult.dkimTokens.length > 0 ? sesResult.dkimTokens : undefined,
                process.env.AWS_SES_REGION ?? process.env.AWS_REGION,
            );

            if (sesEnabled && sesResult.success) {
                await configureMailFromDomain(domain, 'bounce');
            }

            const saved = await upsertSendingDomain(orgId, {
                domain,
                status: 'pending',
                dkimVerified: sesResult.dkimVerified,
                spfVerified: false,
                dmarcVerified: false,
                mxVerified: false,
                authScore: 0,
                dkimSelector: requiredRecords.dkimSelector,
                requiredRecords: requiredRecords.records,
                verificationDetails: {
                    sesManaged: sesEnabled,
                    sesDkimTokens: sesResult.dkimTokens,
                    sesIdentityVerified: sesResult.identityVerified,
                    sesDkimVerified: sesResult.dkimVerified,
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    data: {
                        domain: saved,
                        requiredRecords: requiredRecords.records,
                        sesManaged: sesEnabled,
                    },
                },
                { status: 201 },
            );
        }

        if (action === 'verify') {
            if (!body?.domain || typeof body.domain !== 'string') {
                return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
            }

            const domain = normalizeDomain(body.domain);
            const [dnsResult, sesStatus] = await Promise.all([
                verifyDomain(domain),
                getDomainIdentityStatus(domain),
            ]);

            if (sesEnabled && !sesStatus.exists) {
                await registerDomainIdentity(domain);
            }

            const dkimVerified = sesEnabled ? sesStatus.dkimVerified : dnsResult.dkim.verified;
            const spfVerified = dnsResult.spf.verified;
            const dmarcVerified = dnsResult.dmarc.verified;
            const mxVerified = dnsResult.mx.verified;
            const sesVerified = !sesEnabled || sesStatus.verified;

            const score =
                (dkimVerified ? 35 : 0) +
                (spfVerified ? 30 : 0) +
                (dmarcVerified ? 25 : 0) +
                (mxVerified ? 10 : 0);

            const status = computeStatus({
                sesEnabled,
                sesVerified,
                dkimVerified,
                spfVerified,
                dmarcVerified,
                mxVerified,
            });

            const saved = await upsertSendingDomain(orgId, {
                domain,
                status,
                dkimVerified,
                spfVerified,
                dmarcVerified,
                mxVerified,
                authScore: score,
                verificationDetails: {
                    dns: dnsResult as unknown as Record<string, unknown>,
                    ses: sesStatus as unknown as Record<string, unknown>,
                },
                lastCheckedAt: new Date(),
            });

            const recommendations = [...dnsResult.recommendations];
            if (sesEnabled && !sesStatus.exists) {
                recommendations.unshift('Domain was not yet registered with SES. Re-run verification in a few minutes.');
            } else if (sesEnabled && !sesStatus.verified) {
                recommendations.unshift('SES identity is not verified yet. Wait for DNS propagation, then verify again.');
            }

            return NextResponse.json({
                success: true,
                data: {
                    domain: saved,
                    verification: {
                        ...dnsResult,
                        dkim: { ...dnsResult.dkim, verified: dkimVerified },
                        overallStatus: status,
                        score,
                        sesManaged: sesEnabled,
                        sesVerified,
                        sesDkimStatus: sesStatus.dkimStatus,
                        recommendations,
                    },
                },
            });
        }

        if (action === 'verify-all') {
            const domains = await getSendingDomains(orgId);
            const verifications: Array<Record<string, unknown>> = [];

            for (const d of domains) {
                const [dnsResult, sesStatus] = await Promise.all([
                    verifyDomain(d.domain),
                    getDomainIdentityStatus(d.domain),
                ]);

                const dkimVerified = sesEnabled ? sesStatus.dkimVerified : dnsResult.dkim.verified;
                const spfVerified = dnsResult.spf.verified;
                const dmarcVerified = dnsResult.dmarc.verified;
                const mxVerified = dnsResult.mx.verified;
                const sesVerified = !sesEnabled || sesStatus.verified;

                const score =
                    (dkimVerified ? 35 : 0) +
                    (spfVerified ? 30 : 0) +
                    (dmarcVerified ? 25 : 0) +
                    (mxVerified ? 10 : 0);

                const status = computeStatus({
                    sesEnabled,
                    sesVerified,
                    dkimVerified,
                    spfVerified,
                    dmarcVerified,
                    mxVerified,
                });

                await upsertSendingDomain(orgId, {
                    domain: d.domain,
                    status,
                    dkimVerified,
                    spfVerified,
                    dmarcVerified,
                    mxVerified,
                    authScore: score,
                    verificationDetails: {
                        dns: dnsResult as unknown as Record<string, unknown>,
                        ses: sesStatus as unknown as Record<string, unknown>,
                    },
                    lastCheckedAt: new Date(),
                });

                verifications.push({
                    domain: d.domain,
                    result: {
                        ...dnsResult,
                        dkim: { ...dnsResult.dkim, verified: dkimVerified },
                        overallStatus: status,
                        score,
                        sesManaged: sesEnabled,
                        sesVerified,
                        sesDkimStatus: sesStatus.dkimStatus,
                    },
                });
            }

            return NextResponse.json({ success: true, data: verifications });
        }

        return NextResponse.json({ success: false, error: `Unknown action: ${String(action)}` }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
