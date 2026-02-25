/* ==========================================================================
 * GET/POST /api/v1/domains — Sending Domain Management
 *
 * Handles domain registration, DNS verification, and listing.
 * POST actions:
 *   - add: Register a new sending domain
 *   - verify: Run DNS verification checks (SPF, DKIM, DMARC, MX)
 *   - verify-all: Re-verify all domains for the organization
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSendingDomains, upsertSendingDomain } from '@/lib/db/operations';
import { verifyDomain, generateRequiredRecords } from '@/lib/engine/dns-verification';

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
        const domain = searchParams.get('domain');

        const domains = await getSendingDomains(orgId);

        // If a specific domain is requested, filter
        if (domain) {
            const found = domains.find(d => d.domain === domain);
            return NextResponse.json({ success: true, data: found ?? null });
        }

        return NextResponse.json({ success: true, data: domains });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const { action } = body;

        /* ── Add new domain ──────────────────────────────────── */
        if (action === 'add') {
            let { domain } = body;
            if (!domain || typeof domain !== 'string') {
                return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
            }

            // Normalize domain
            domain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

            if (!domain.includes('.') || domain.length < 3) {
                return NextResponse.json({ success: false, error: 'Invalid domain format' }, { status: 400 });
            }

            // Generate the DNS records the user needs to add
            const requiredRecords = generateRequiredRecords(domain);

            // Save to DB
            const saved = await upsertSendingDomain(orgId, {
                domain,
                status: 'pending',
                dkimVerified: false,
                spfVerified: false,
                dmarcVerified: false,
                mxVerified: false,
                authScore: 0,
                dkimSelector: requiredRecords.dkimSelector,
                requiredRecords: requiredRecords.records.map(r => ({
                    type: r.type,
                    host: r.host,
                    value: r.value,
                    purpose: r.purpose,
                })),
            });

            return NextResponse.json({
                success: true,
                data: {
                    domain: saved,
                    requiredRecords: requiredRecords.records,
                },
            }, { status: 201 });
        }

        /* ── Verify a domain ─────────────────────────────────── */
        if (action === 'verify') {
            let { domain } = body;
            if (!domain || typeof domain !== 'string') {
                return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
            }
            domain = domain.toLowerCase().trim();

            // Run full DNS verification
            const result = await verifyDomain(domain);

            // Update DB with verification results
            const saved = await upsertSendingDomain(orgId, {
                domain,
                status: result.overallStatus,
                dkimVerified: result.dkim.verified,
                spfVerified: result.spf.verified,
                dmarcVerified: result.dmarc.verified,
                mxVerified: result.mx.verified,
                authScore: result.score,
                verificationDetails: result as unknown as Record<string, unknown>,
                lastCheckedAt: new Date(),
            });

            return NextResponse.json({
                success: true,
                data: {
                    domain: saved,
                    verification: result,
                },
            });
        }

        /* ── Verify all domains ──────────────────────────────── */
        if (action === 'verify-all') {
            const domains = await getSendingDomains(orgId);
            const verifications = [];

            for (const d of domains) {
                const result = await verifyDomain(d.domain);
                await upsertSendingDomain(orgId, {
                    domain: d.domain,
                    status: result.overallStatus,
                    dkimVerified: result.dkim.verified,
                    spfVerified: result.spf.verified,
                    dmarcVerified: result.dmarc.verified,
                    mxVerified: result.mx.verified,
                    authScore: result.score,
                    verificationDetails: result as unknown as Record<string, unknown>,
                    lastCheckedAt: new Date(),
                });
                verifications.push({ domain: d.domain, result });
            }

            return NextResponse.json({ success: true, data: verifications });
        }

        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
