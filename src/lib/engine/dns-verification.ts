/* ═══════════════════════════════════════════════════════════════════════
 * DNS Verification Engine — SPF, DKIM & DMARC Authentication
 *
 * Performs real DNS lookups to verify that a sending domain has the
 * correct email authentication records configured. This is critical
 * for email deliverability — messages sent without proper SPF, DKIM,
 * and DMARC alignment are far more likely to land in spam.
 *
 * How it works:
 *  1. SPF — Checks for TXT record at domain root containing "v=spf1"
 *  2. DKIM — Checks for TXT record at {selector}._domainkey.{domain}
 *  3. DMARC — Checks for TXT record at _dmarc.{domain} containing "v=DMARC1"
 *
 * For our platform, we generate the expected DNS records and the user
 * adds them to their domain. This engine then verifies they exist.
 *
 * Best Practices Enforced:
 *  - SPF must include our sending server IP/domain
 *  - DKIM must have a valid public key
 *  - DMARC must be at least p=none (preferably p=quarantine or p=reject)
 *  - Return Mail-From alignment for full DMARC pass
 * ═══════════════════════════════════════════════════════════════════════ */

import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);
const resolveCname = promisify(dns.resolveCname);

/* ── Types ──────────────────────────────────────────────────────────── */

export interface DnsRecord {
    type: 'TXT' | 'CNAME' | 'MX';
    host: string;
    value: string;
    /** For display — what we expect */
    purpose: 'SPF' | 'DKIM' | 'DMARC' | 'Return-Path' | 'MX';
}

export interface DnsCheckResult {
    verified: boolean;
    found: boolean;
    record: string | null;
    expectedHost: string;
    expectedValue: string;
    error?: string;
    details?: string;
}

export interface DomainVerificationResult {
    domain: string;
    spf: DnsCheckResult;
    dkim: DnsCheckResult;
    dmarc: DnsCheckResult;
    mx: DnsCheckResult;
    overallStatus: 'verified' | 'partial' | 'pending' | 'failed';
    score: number; // 0-100
    recommendations: string[];
    checkedAt: string;
}

export interface DomainDnsRecords {
    domain: string;
    /** The DKIM selector to use (e.g. "lifecycleos" or "default") */
    dkimSelector: string;
    records: DnsRecord[];
}

/* ── Constants ──────────────────────────────────────────────────────── */

/** Default DKIM selector used by the platform */
const DKIM_SELECTOR = process.env.DKIM_SELECTOR ?? 'lifecycleos';

/** Our sending domain for SPF include */
const PLATFORM_SENDING_DOMAIN = process.env.PLATFORM_SENDING_DOMAIN ?? 'mail.lifecycleos.app';

/** Return-path subdomain */
const RETURN_PATH_SUBDOMAIN = 'bounce';

/* ═══════════════════════════════════════════════════════════════════════
 * Generate Required DNS Records
 *
 * Produces the exact DNS records a user needs to add to their domain
 * for full email authentication.
 * ═══════════════════════════════════════════════════════════════════════ */

export function generateRequiredRecords(domain: string): DomainDnsRecords {
    const dkimSelector = DKIM_SELECTOR;

    const records: DnsRecord[] = [
        {
            type: 'TXT',
            host: domain,
            value: `v=spf1 include:${PLATFORM_SENDING_DOMAIN} ~all`,
            purpose: 'SPF',
        },
        {
            type: 'CNAME',
            host: `${dkimSelector}._domainkey.${domain}`,
            value: `${dkimSelector}._domainkey.${PLATFORM_SENDING_DOMAIN}`,
            purpose: 'DKIM',
        },
        {
            type: 'TXT',
            host: `_dmarc.${domain}`,
            value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@' + domain + '; pct=100; adkim=r; aspf=r',
            purpose: 'DMARC',
        },
        {
            type: 'CNAME',
            host: `${RETURN_PATH_SUBDOMAIN}.${domain}`,
            value: `${RETURN_PATH_SUBDOMAIN}.${PLATFORM_SENDING_DOMAIN}`,
            purpose: 'Return-Path',
        },
    ];

    return { domain, dkimSelector, records };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Verify SPF Record
 * ═══════════════════════════════════════════════════════════════════════ */

async function verifySPF(domain: string): Promise<DnsCheckResult> {
    const expectedHost = domain;
    const platformInclude = `include:${PLATFORM_SENDING_DOMAIN}`;

    try {
        const txtRecords = await resolveTxt(domain);
        const spfRecords = txtRecords
            .map(r => r.join(''))
            .filter(r => r.trim().startsWith('v=spf1'));

        if (spfRecords.length === 0) {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost,
                expectedValue: `v=spf1 ${platformInclude} ~all`,
                details: 'No SPF record found. Add a TXT record with your SPF policy.',
            };
        }

        // Check if our platform is included
        const spfRecord = spfRecords[0];
        const includesUs = spfRecord.includes(PLATFORM_SENDING_DOMAIN);

        if (!includesUs) {
            return {
                verified: false,
                found: true,
                record: spfRecord,
                expectedHost,
                expectedValue: `v=spf1 ${platformInclude} ~all`,
                details: `SPF record found but does not include "${PLATFORM_SENDING_DOMAIN}". Add "${platformInclude}" to your existing SPF record.`,
            };
        }

        // Check for too many DNS lookups (SPF has a 10-lookup limit)
        const includeCount = (spfRecord.match(/include:/g) ?? []).length;
        const redirectCount = (spfRecord.match(/redirect=/g) ?? []).length;
        const lookupCount = includeCount + redirectCount;

        return {
            verified: true,
            found: true,
            record: spfRecord,
            expectedHost,
            expectedValue: `v=spf1 ${platformInclude} ~all`,
            details: lookupCount > 8
                ? `SPF verified but you have ${lookupCount} DNS lookups. SPF has a limit of 10. Consider consolidating.`
                : 'SPF record verified and includes our sending domain.',
        };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOTFOUND' || code === 'ENODATA') {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost,
                expectedValue: `v=spf1 ${platformInclude} ~all`,
                details: 'No DNS records found for this domain. Please verify the domain name is correct.',
            };
        }
        return {
            verified: false,
            found: false,
            record: null,
            expectedHost,
            expectedValue: `v=spf1 ${platformInclude} ~all`,
            error: (err as Error).message,
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Verify DKIM Record
 * ═══════════════════════════════════════════════════════════════════════ */

async function verifyDKIM(domain: string): Promise<DnsCheckResult> {
    const selector = DKIM_SELECTOR;
    const dkimHost = `${selector}._domainkey.${domain}`;
    const expectedCname = `${selector}._domainkey.${PLATFORM_SENDING_DOMAIN}`;

    try {
        // First try CNAME (our preferred setup)
        try {
            const cnames = await resolveCname(dkimHost);
            if (cnames.length > 0) {
                const cnameValue = cnames[0].replace(/\.$/, '');
                const matches = cnameValue.toLowerCase() === expectedCname.toLowerCase()
                    || cnameValue.toLowerCase().includes(PLATFORM_SENDING_DOMAIN.toLowerCase());

                return {
                    verified: matches,
                    found: true,
                    record: `CNAME → ${cnameValue}`,
                    expectedHost: dkimHost,
                    expectedValue: expectedCname,
                    details: matches
                        ? 'DKIM CNAME record verified and pointing to our signing domain.'
                        : `DKIM CNAME found but pointing to "${cnameValue}" instead of "${expectedCname}".`,
                };
            }
        } catch {
            // CNAME not found, try TXT
        }

        // Fall back to TXT record (direct key publishing)
        const txtRecords = await resolveTxt(dkimHost);
        const dkimRecords = txtRecords
            .map(r => r.join(''))
            .filter(r => r.includes('v=DKIM1') || r.includes('p='));

        if (dkimRecords.length === 0) {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: dkimHost,
                expectedValue: expectedCname,
                details: `No DKIM record found at "${dkimHost}". Add a CNAME record pointing to "${expectedCname}".`,
            };
        }

        // Check that the TXT record has a valid public key
        const dkimRecord = dkimRecords[0];
        const hasPublicKey = dkimRecord.includes('p=') && !dkimRecord.includes('p=;');

        return {
            verified: hasPublicKey,
            found: true,
            record: dkimRecord.substring(0, 120) + (dkimRecord.length > 120 ? '...' : ''),
            expectedHost: dkimHost,
            expectedValue: expectedCname,
            details: hasPublicKey
                ? 'DKIM TXT record found with a valid public key.'
                : 'DKIM record found but the public key appears empty or revoked.',
        };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOTFOUND' || code === 'ENODATA') {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: dkimHost,
                expectedValue: expectedCname,
                details: `No DKIM record found at "${dkimHost}". Add a CNAME pointing to "${expectedCname}".`,
            };
        }
        return {
            verified: false,
            found: false,
            record: null,
            expectedHost: dkimHost,
            expectedValue: expectedCname,
            error: (err as Error).message,
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Verify DMARC Record
 * ═══════════════════════════════════════════════════════════════════════ */

async function verifyDMARC(domain: string): Promise<DnsCheckResult> {
    const dmarcHost = `_dmarc.${domain}`;
    const expectedValue = 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@' + domain;

    try {
        const txtRecords = await resolveTxt(dmarcHost);
        const dmarcRecords = txtRecords
            .map(r => r.join(''))
            .filter(r => r.trim().startsWith('v=DMARC1'));

        if (dmarcRecords.length === 0) {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: dmarcHost,
                expectedValue,
                details: `No DMARC record found at "${dmarcHost}". Add a TXT record with your DMARC policy.`,
            };
        }

        const dmarcRecord = dmarcRecords[0];

        // Parse the policy
        const policyMatch = dmarcRecord.match(/;\s*p=(\w+)/i);
        const policy = policyMatch?.[1]?.toLowerCase() ?? 'none';

        // DMARC is verified if it exists with at least p=none
        // But we recommend p=quarantine or p=reject
        const hasValidPolicy = ['none', 'quarantine', 'reject'].includes(policy);

        let details = '';
        if (!hasValidPolicy) {
            details = 'DMARC record found but has an invalid policy value.';
        } else if (policy === 'none') {
            details = 'DMARC record verified with p=none (monitoring only). Consider upgrading to p=quarantine for better protection.';
        } else if (policy === 'quarantine') {
            details = 'DMARC record verified with p=quarantine. Unauthenticated messages will be flagged as suspicious.';
        } else {
            details = 'DMARC record verified with p=reject. Maximum protection — unauthenticated messages will be rejected.';
        }

        return {
            verified: hasValidPolicy,
            found: true,
            record: dmarcRecord,
            expectedHost: dmarcHost,
            expectedValue,
            details,
        };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOTFOUND' || code === 'ENODATA') {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: dmarcHost,
                expectedValue,
                details: `No DMARC record found at "${dmarcHost}".`,
            };
        }
        return {
            verified: false,
            found: false,
            record: null,
            expectedHost: dmarcHost,
            expectedValue,
            error: (err as Error).message,
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Verify MX Records (optional but recommended)
 * ═══════════════════════════════════════════════════════════════════════ */

async function verifyMX(domain: string): Promise<DnsCheckResult> {
    try {
        const mxRecords = await resolveMx(domain);

        if (!mxRecords || mxRecords.length === 0) {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: domain,
                expectedValue: 'MX record for receiving domain',
                details: 'No MX records found. This domain cannot receive email, which may affect reply handling.',
            };
        }

        const mxList = mxRecords
            .sort((a, b) => a.priority - b.priority)
            .map(r => `${r.priority} ${r.exchange}`)
            .join(', ');

        return {
            verified: true,
            found: true,
            record: mxList,
            expectedHost: domain,
            expectedValue: 'Valid MX records',
            details: `MX records found: ${mxRecords.length} mail server(s) configured.`,
        };
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOTFOUND' || code === 'ENODATA') {
            return {
                verified: false,
                found: false,
                record: null,
                expectedHost: domain,
                expectedValue: 'MX record',
                details: 'No MX records found for this domain.',
            };
        }
        return {
            verified: false,
            found: false,
            record: null,
            expectedHost: domain,
            expectedValue: 'MX record',
            error: (err as Error).message,
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Full Domain Verification (all checks)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function verifyDomain(domain: string): Promise<DomainVerificationResult> {
    // Run all checks in parallel
    const [spf, dkim, dmarc, mx] = await Promise.all([
        verifySPF(domain),
        verifyDKIM(domain),
        verifyDMARC(domain),
        verifyMX(domain),
    ]);

    // Calculate score (SPF=30, DKIM=35, DMARC=25, MX=10)
    let score = 0;
    if (spf.verified) score += 30;
    if (dkim.verified) score += 35;
    if (dmarc.verified) score += 25;
    if (mx.verified) score += 10;

    // Determine overall status
    let overallStatus: 'verified' | 'partial' | 'pending' | 'failed';
    if (spf.verified && dkim.verified && dmarc.verified) {
        overallStatus = 'verified';
    } else if (spf.verified || dkim.verified || dmarc.verified) {
        overallStatus = 'partial';
    } else if (spf.found || dkim.found || dmarc.found) {
        overallStatus = 'failed';
    } else {
        overallStatus = 'pending';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (!spf.verified) {
        if (!spf.found) {
            recommendations.push(`Add an SPF record: Create a TXT record at "${domain}" with value "v=spf1 include:${PLATFORM_SENDING_DOMAIN} ~all"`);
        } else {
            recommendations.push(`Update your SPF record to include "${PLATFORM_SENDING_DOMAIN}" — add "include:${PLATFORM_SENDING_DOMAIN}" before the "~all" or "-all" mechanism.`);
        }
    }

    if (!dkim.verified) {
        recommendations.push(`Add a DKIM record: Create a CNAME record at "${DKIM_SELECTOR}._domainkey.${domain}" pointing to "${DKIM_SELECTOR}._domainkey.${PLATFORM_SENDING_DOMAIN}"`);
    }

    if (!dmarc.verified) {
        if (!dmarc.found) {
            recommendations.push(`Add a DMARC record: Create a TXT record at "_dmarc.${domain}" with value "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}; pct=100; adkim=r; aspf=r"`);
        } else {
            recommendations.push('Your DMARC record exists but may need policy adjustment. Consider using p=quarantine or p=reject.');
        }
    }

    if (!mx.verified) {
        recommendations.push('Configure MX records for your domain to enable reply handling. This is recommended but not required for sending.');
    }

    if (score === 100) {
        recommendations.push('All records verified. Your domain is fully authenticated for email delivery.');
    }

    return {
        domain,
        spf,
        dkim,
        dmarc,
        mx,
        overallStatus,
        score,
        recommendations,
        checkedAt: new Date().toISOString(),
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Quick Domain Check (lightweight — just booleans)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function quickDomainCheck(domain: string): Promise<{
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    authenticated: boolean;
}> {
    const [spf, dkim, dmarc] = await Promise.all([
        verifySPF(domain),
        verifyDKIM(domain),
        verifyDMARC(domain),
    ]);

    return {
        spf: spf.verified,
        dkim: dkim.verified,
        dmarc: dmarc.verified,
        authenticated: spf.verified && dkim.verified && dmarc.verified,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Check if a from-address domain is authenticated
 * ═══════════════════════════════════════════════════════════════════════ */

export function extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase().trim() ?? '';
}
