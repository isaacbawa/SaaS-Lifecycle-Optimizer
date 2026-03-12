/* ═══════════════════════════════════════════════════════════════════════
 * SES Identity Management — Transparent Domain Registration for Multi-Tenant ESP
 *
 * This module manages customer domain identities in Amazon SES behind
 * the scenes. SaaS owners (our users) authenticate their sending domain
 * through our platform UI. Under the hood, we register and verify
 * each domain in SES so that emails sent from that domain are accepted
 * by the SES SMTP relay with proper DKIM signing.
 *
 * Architecture:
 *   • Platform registers its own domain in SES (one-time setup)
 *   • When a SaaS owner adds their domain, we call SES CreateEmailIdentity
 *   • SES returns DKIM CNAME tokens — we present these as DNS records
 *   • SaaS owner adds DNS records to their domain registrar
 *   • We verify via SES GetEmailIdentity — SES auto-verifies when DNS propagates
 *   • SES handles DKIM signing transparently on all outbound email
 *   • Optional: Custom MAIL FROM subdomain for SPF Return-Path alignment
 *
 * When SES is not configured (no AWS credentials), the module is a
 * graceful no-op and the system falls back to local DKIM signing via
 * Nodemailer. This allows development without AWS access.
 *
 * Environment Variables (all optional — module degrades gracefully):
 *   AWS_ACCESS_KEY_ID      — IAM credentials for SES API
 *   AWS_SECRET_ACCESS_KEY  — IAM credentials for SES API
 *   AWS_SES_REGION         — SES region (default: us-east-1)
 *   SES_CONFIGURATION_SET  — Optional SES configuration set name
 * ═══════════════════════════════════════════════════════════════════════ */

import {
    SESv2Client,
    CreateEmailIdentityCommand,
    GetEmailIdentityCommand,
    DeleteEmailIdentityCommand,
    PutEmailIdentityMailFromAttributesCommand,
    PutEmailIdentityDkimSigningAttributesCommand,
    type DkimAttributes,
    type DkimSigningAttributesOrigin,
} from '@aws-sdk/client-sesv2';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface SesConfig {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    configurationSet?: string;
}

export interface SesDkimToken {
    /** CNAME host: e.g. "abcdef._domainkey.customerdomain.com" */
    host: string;
    /** CNAME value: e.g. "abcdef.dkim.amazonses.com" */
    value: string;
}

export interface SesIdentityResult {
    success: boolean;
    domain: string;
    /** SES-generated DKIM CNAME records the user must add */
    dkimTokens: SesDkimToken[];
    /** Whether DKIM is already verified in SES */
    dkimVerified: boolean;
    /** Whether the overall identity is verified */
    identityVerified: boolean;
    /** SES identity type */
    identityType?: string;
    /** Error message if the operation failed */
    error?: string;
    /** Mail-from configuration status */
    mailFromStatus?: string;
    /** The DKIM signing status */
    dkimStatus?: string;
}

export interface SesIdentityStatus {
    exists: boolean;
    verified: boolean;
    dkimVerified: boolean;
    dkimStatus: string;
    dkimTokens: SesDkimToken[];
    mailFromDomain?: string;
    mailFromStatus?: string;
    configurationSet?: string;
    error?: string;
}

/* ── SES Client Singleton ───────────────────────────────────────────── */

let _client: SESv2Client | null = null;
let _config: SesConfig | null = null;

/**
 * Check if SES API is configured (AWS credentials present).
 * When false, the module operates as a no-op and the system
 * falls back to local DKIM via Nodemailer.
 */
export function isSesConfigured(): boolean {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
    );
}

/**
 * Get or create the SES v2 client. Returns null if not configured.
 */
function getClient(): SESv2Client | null {
    if (!isSesConfigured()) return null;

    const region = process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;

    // Reuse if config unchanged
    if (_client && _config?.region === region && _config?.accessKeyId === accessKeyId) {
        return _client;
    }

    _config = {
        region,
        accessKeyId,
        secretAccessKey,
        configurationSet: process.env.SES_CONFIGURATION_SET,
    };

    _client = new SESv2Client({
        region: _config.region,
        credentials: {
            accessKeyId: _config.accessKeyId,
            secretAccessKey: _config.secretAccessKey,
        },
    });

    console.log(`[ses-identity] SES client initialized (region: ${_config.region})`);
    return _client;
}

/**
 * Get the SES configuration set name (optional, for tracking).
 */
export function getSesConfigurationSet(): string | undefined {
    return process.env.SES_CONFIGURATION_SET;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Domain Identity Lifecycle
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Register a domain identity in SES. This is called when a SaaS owner
 * adds their sending domain in our platform.
 *
 * SES will generate DKIM tokens (3 CNAME records) that the domain owner
 * must add to their DNS. Once propagated, SES automatically verifies
 * the domain and enables DKIM signing on all outbound email.
 *
 * If SES is not configured, returns a graceful result with empty tokens
 * so the system can fall back to local DKIM.
 */
export async function registerDomainIdentity(domain: string): Promise<SesIdentityResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    const client = getClient();
    if (!client) {
        console.warn(`[ses-identity] SES not configured — domain "${normalizedDomain}" registered locally only.`);
        return {
            success: true,
            domain: normalizedDomain,
            dkimTokens: [],
            dkimVerified: false,
            identityVerified: false,
            error: 'SES not configured — using local DKIM fallback.',
        };
    }

    try {
        const response = await client.send(
            new CreateEmailIdentityCommand({
                EmailIdentity: normalizedDomain,
                DkimSigningAttributes: {
                    DomainSigningAttributesOrigin: 'AWS_SES' as DkimSigningAttributesOrigin,
                },
                Tags: [
                    { Key: 'ManagedBy', Value: 'LifecycleOS' },
                    { Key: 'Type', Value: 'CustomerDomain' },
                ],
            }),
        );

        const dkimAttrs = response.DkimAttributes;
        const tokens: SesDkimToken[] = (dkimAttrs?.Tokens ?? []).map((token) => ({
            host: `${token}._domainkey.${normalizedDomain}`,
            value: `${token}.dkim.amazonses.com`,
        }));

        console.log(
            `[ses-identity] Domain "${normalizedDomain}" registered in SES ` +
            `(DKIM tokens: ${tokens.length}, status: ${dkimAttrs?.SigningEnabled ? 'signing-enabled' : 'pending'})`,
        );

        return {
            success: true,
            domain: normalizedDomain,
            dkimTokens: tokens,
            dkimVerified: dkimAttrs?.Status === 'SUCCESS',
            identityVerified: response.VerifiedForSendingStatus ?? false,
            dkimStatus: dkimAttrs?.Status,
        };
    } catch (err: unknown) {
        const error = err as Error & { name?: string; $metadata?: { httpStatusCode?: number } };

        // If the identity already exists, fetch its current status instead
        if (error.name === 'AlreadyExistsException') {
            console.log(`[ses-identity] Domain "${normalizedDomain}" already exists in SES — fetching status.`);
            const status = await getDomainIdentityStatus(normalizedDomain);
            return {
                success: true,
                domain: normalizedDomain,
                dkimTokens: status.dkimTokens,
                dkimVerified: status.dkimVerified,
                identityVerified: status.verified,
                dkimStatus: status.dkimStatus,
            };
        }

        console.error(`[ses-identity] Failed to register domain "${normalizedDomain}":`, error.message);
        return {
            success: false,
            domain: normalizedDomain,
            dkimTokens: [],
            dkimVerified: false,
            identityVerified: false,
            error: error.message,
        };
    }
}

/**
 * Get the current verification status of a domain identity in SES.
 * Used during the "Verify" action to check if DNS records have propagated.
 */
export async function getDomainIdentityStatus(domain: string): Promise<SesIdentityStatus> {
    const normalizedDomain = domain.toLowerCase().trim();

    const client = getClient();
    if (!client) {
        return {
            exists: false,
            verified: false,
            dkimVerified: false,
            dkimStatus: 'NOT_CONFIGURED',
            dkimTokens: [],
            error: 'SES not configured.',
        };
    }

    try {
        const response = await client.send(
            new GetEmailIdentityCommand({ EmailIdentity: normalizedDomain }),
        );

        const dkimAttrs = response.DkimAttributes;
        const tokens: SesDkimToken[] = (dkimAttrs?.Tokens ?? []).map((token) => ({
            host: `${token}._domainkey.${normalizedDomain}`,
            value: `${token}.dkim.amazonses.com`,
        }));

        return {
            exists: true,
            verified: response.VerifiedForSendingStatus ?? false,
            dkimVerified: dkimAttrs?.Status === 'SUCCESS',
            dkimStatus: dkimAttrs?.Status ?? 'UNKNOWN',
            dkimTokens: tokens,
            mailFromDomain: response.MailFromAttributes?.MailFromDomain,
            mailFromStatus: response.MailFromAttributes?.MailFromDomainStatus,
            configurationSet: response.ConfigurationSetName,
        };
    } catch (err: unknown) {
        const error = err as Error & { name?: string };

        if (error.name === 'NotFoundException') {
            return {
                exists: false,
                verified: false,
                dkimVerified: false,
                dkimStatus: 'NOT_FOUND',
                dkimTokens: [],
            };
        }

        return {
            exists: false,
            verified: false,
            dkimVerified: false,
            dkimStatus: 'ERROR',
            dkimTokens: [],
            error: error.message,
        };
    }
}

/**
 * Configure a custom MAIL FROM subdomain for a verified domain.
 * This enables Return-Path alignment for SPF under DMARC.
 *
 * Example: For domain "theirsaas.com", sets MAIL FROM to "bounce.theirsaas.com"
 * The user needs an MX record: bounce.theirsaas.com → feedback-smtp.{region}.amazonses.com
 * And SPF: bounce.theirsaas.com → v=spf1 include:amazonses.com ~all
 */
export async function configureMailFromDomain(
    domain: string,
    mailFromSubdomain = 'bounce',
): Promise<{ success: boolean; mailFromDomain: string; error?: string }> {
    const normalizedDomain = domain.toLowerCase().trim();
    const mailFromDomain = `${mailFromSubdomain}.${normalizedDomain}`;

    const client = getClient();
    if (!client) {
        return { success: false, mailFromDomain, error: 'SES not configured.' };
    }

    try {
        await client.send(
            new PutEmailIdentityMailFromAttributesCommand({
                EmailIdentity: normalizedDomain,
                MailFromDomain: mailFromDomain,
                BehaviorOnMxFailure: 'USE_DEFAULT_VALUE', // Falls back to SES default if MX not configured
            }),
        );

        console.log(`[ses-identity] Custom MAIL FROM set: ${mailFromDomain}`);
        return { success: true, mailFromDomain };
    } catch (err) {
        const error = (err as Error).message;
        console.error(`[ses-identity] Failed to set MAIL FROM for "${normalizedDomain}":`, error);
        return { success: false, mailFromDomain, error };
    }
}

/**
 * Delete a domain identity from SES. Called when a SaaS owner
 * removes their domain from our platform.
 */
export async function deleteDomainIdentity(domain: string): Promise<{ success: boolean; error?: string }> {
    const normalizedDomain = domain.toLowerCase().trim();

    const client = getClient();
    if (!client) {
        return { success: true }; // Nothing to delete if SES not configured
    }

    try {
        await client.send(
            new DeleteEmailIdentityCommand({ EmailIdentity: normalizedDomain }),
        );
        console.log(`[ses-identity] Domain "${normalizedDomain}" deleted from SES.`);
        return { success: true };
    } catch (err) {
        const error = (err as Error).message;
        console.error(`[ses-identity] Failed to delete domain "${normalizedDomain}" from SES:`, error);
        return { success: false, error };
    }
}

/**
 * Check if a specific From-domain is verified and ready for sending.
 * Used by the email pipeline before dispatching an email.
 *
 * Returns true if:
 *   • SES is not configured (fallback mode, local DKIM will be used)
 *   • SES identity exists and is verified for sending
 */
export async function isDomainVerifiedInSes(domain: string): Promise<boolean> {
    if (!isSesConfigured()) return true; // Fallback mode — allow sending

    const status = await getDomainIdentityStatus(domain);
    return status.verified;
}

/* ═══════════════════════════════════════════════════════════════════════
 * DNS Record Generation — SES-Aware
 *
 * Generates the DNS records a customer needs to add, incorporating
 * SES DKIM tokens when available.
 * ═══════════════════════════════════════════════════════════════════════ */

export interface DomainDnsRecordSet {
    domain: string;
    records: Array<{
        type: 'CNAME' | 'TXT' | 'MX';
        host: string;
        value: string;
        purpose: string;
        priority?: number;
    }>;
    /** Whether these records come from SES (true) or are generic fallback (false) */
    sesManaged: boolean;
}

/**
 * Build the complete set of DNS records a customer must add.
 * When SES tokens are available, uses SES-specific DKIM CNAMEs.
 * Also includes SPF, DMARC, and optional MAIL FROM / Return-Path records.
 */
export function buildDnsRecords(
    domain: string,
    sesDkimTokens: SesDkimToken[],
    sesRegion?: string,
): DomainDnsRecordSet {
    const normalizedDomain = domain.toLowerCase().trim();
    const region = sesRegion ?? process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    const hasSesTokens = sesDkimTokens.length > 0;

    const records: DomainDnsRecordSet['records'] = [];

    // 1. DKIM: SES CNAME records (3 records) or fallback single CNAME
    if (hasSesTokens) {
        for (const token of sesDkimTokens) {
            records.push({
                type: 'CNAME',
                host: token.host,
                value: token.value,
                purpose: 'DKIM (SES-managed signing)',
            });
        }
    } else {
        // Fallback: CNAME to platform DKIM key (for non-SES SMTP)
        const selector = process.env.DKIM_SELECTOR ?? 'lifecycleos';
        const platformDomain = process.env.PLATFORM_SENDING_DOMAIN ?? 'mail.lifecycleos.app';
        records.push({
            type: 'CNAME',
            host: `${selector}._domainkey.${normalizedDomain}`,
            value: `${selector}._domainkey.${platformDomain}`,
            purpose: 'DKIM (platform-managed signing)',
        });
    }

    // 2. SPF: Include amazonses.com for SES, or platform domain for fallback
    if (hasSesTokens) {
        records.push({
            type: 'TXT',
            host: normalizedDomain,
            value: 'v=spf1 include:amazonses.com ~all',
            purpose: 'SPF — Authorizes email sending through our platform',
        });
    } else {
        const platformDomain = process.env.PLATFORM_SENDING_DOMAIN ?? 'mail.lifecycleos.app';
        records.push({
            type: 'TXT',
            host: normalizedDomain,
            value: `v=spf1 include:${platformDomain} ~all`,
            purpose: 'SPF — Authorizes email sending through our platform',
        });
    }

    // 3. DMARC: Standard record at _dmarc.domain
    records.push({
        type: 'TXT',
        host: `_dmarc.${normalizedDomain}`,
        value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${normalizedDomain}; pct=100; adkim=r; aspf=r`,
        purpose: 'DMARC — Email authentication policy',
    });

    // 4. Custom MAIL FROM (Return-Path alignment) — only for SES mode
    if (hasSesTokens) {
        const bounceSubdomain = `bounce.${normalizedDomain}`;

        records.push({
            type: 'MX',
            host: bounceSubdomain,
            value: `feedback-smtp.${region}.amazonses.com`,
            purpose: 'Custom MAIL FROM — Return-Path alignment for SPF',
            priority: 10,
        });

        records.push({
            type: 'TXT',
            host: bounceSubdomain,
            value: 'v=spf1 include:amazonses.com ~all',
            purpose: 'Custom MAIL FROM — SPF for bounce subdomain',
        });
    } else {
        // Non-SES: Return-Path CNAME
        const platformDomain = process.env.PLATFORM_SENDING_DOMAIN ?? 'mail.lifecycleos.app';
        records.push({
            type: 'CNAME',
            host: `bounce.${normalizedDomain}`,
            value: `bounce.${platformDomain}`,
            purpose: 'Return-Path — Bounce handling alignment',
        });
    }

    return { domain: normalizedDomain, records, sesManaged: hasSesTokens };
}
