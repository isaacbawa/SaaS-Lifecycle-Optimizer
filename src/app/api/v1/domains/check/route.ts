/* ==========================================================================
 * GET /api/v1/domains/check?email=user@example.com
 *
 * Quick check whether a from-address domain is authenticated.
 * Used by the campaign builder and flow editor to warn users before sending.
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getSendingDomains } from '@/lib/db/operations';
import { extractDomain } from '@/lib/engine/dns-verification';

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
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization' }, { status: 400 });

        const email = request.nextUrl.searchParams.get('email') ?? '';
        const domain = extractDomain(email);

        if (!domain) {
            return NextResponse.json({
                success: true,
                data: {
                    authenticated: false,
                    domain: '',
                    registered: false,
                    warnings: ['No valid email address provided.'],
                },
            });
        }

        const domains = await getSendingDomains(orgId);
        const domainRecord = domains.find(d => d.domain === domain);

        const warnings: string[] = [];

        if (!domainRecord) {
            warnings.push(`Domain "${domain}" is not registered. Add it in Deliverability → Domain Authentication to improve deliverability.`);
            return NextResponse.json({
                success: true,
                data: {
                    authenticated: false,
                    domain,
                    registered: false,
                    status: 'unregistered',
                    spf: false,
                    dkim: false,
                    dmarc: false,
                    score: 0,
                    warnings,
                },
            });
        }

        if (domainRecord.status !== 'verified') {
            if (!domainRecord.spfVerified) warnings.push('SPF is not verified. Emails may be marked as spam.');
            if (!domainRecord.dkimVerified) warnings.push('DKIM is not verified. Email authenticity cannot be confirmed.');
            if (!domainRecord.dmarcVerified) warnings.push('DMARC is not configured. Domain spoofing protection is inactive.');
        }

        return NextResponse.json({
            success: true,
            data: {
                authenticated: domainRecord.status === 'verified',
                domain,
                registered: true,
                status: domainRecord.status,
                spf: domainRecord.spfVerified,
                dkim: domainRecord.dkimVerified,
                dmarc: domainRecord.dmarcVerified,
                score: domainRecord.authScore,
                warnings,
            },
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
