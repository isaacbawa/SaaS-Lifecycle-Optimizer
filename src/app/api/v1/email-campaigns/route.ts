/* ==========================================================================
 * GET/POST /api/v1/email-campaigns — Campaign CRUD + Send
 *
 * The send action now routes every email through the built-in email
 * system (queue → suppression → tracking → SMTP), instead of just
 * creating DB records. Domain verification warnings are checked before
 * sending, but don't block the send (just reported in the response).
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEmailCampaigns, upsertEmailCampaign, getEmailTemplate, getSegmentMembers, getAllTrackedUsers, createEmailSend, updateCampaignMetrics, getTrackedAccount, getSendingDomains } from '@/lib/db/operations';
import { prepareCampaignEmails } from '@/lib/engine/email-campaigns';
import { sendEmail } from '@/lib/engine/email';
import type { CampaignRecipient } from '@/lib/engine/email-campaigns';
import type { VariableMapping } from '@/lib/db/schema';

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
        const status = searchParams.get('status') ?? undefined;
        const campaigns = await getAllEmailCampaigns(orgId, status);
        return NextResponse.json({ success: true, data: campaigns });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const orgId = await resolveOrgId();
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization found' }, { status: 400 });

        const body = await request.json();
        const { action, ...data } = body;

        // Send campaign action
        if (action === 'send' && data.id) {
            const campaign = await (await import('@/lib/db/operations')).getEmailCampaign(orgId, data.id);
            if (!campaign) return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
            if (!campaign.templateId) return NextResponse.json({ success: false, error: 'No template assigned' }, { status: 400 });

            const template = await getEmailTemplate(orgId, campaign.templateId);
            if (!template) return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });

            // Get recipients from segment or all users
            let recipients: CampaignRecipient[] = [];
            if (campaign.segmentId) {
                const members = await getSegmentMembers(campaign.segmentId, 10000);
                for (const m of members) {
                    let account: Record<string, unknown> | null = null;
                    if (m.user.accountId) {
                        const a = await getTrackedAccount(orgId, m.user.accountId);
                        account = a as unknown as Record<string, unknown>;
                    }
                    recipients.push({
                        trackedUserId: m.user.id,
                        email: m.user.email ?? '',
                        user: m.user as unknown as Record<string, unknown>,
                        account,
                    });
                }
            } else {
                const allUsers = await getAllTrackedUsers(orgId, { limit: 10000 });
                for (const u of allUsers) {
                    let account: Record<string, unknown> | null = null;
                    if (u.accountId) {
                        const a = await getTrackedAccount(orgId, u.accountId);
                        account = a as unknown as Record<string, unknown>;
                    }
                    recipients.push({
                        trackedUserId: u.id,
                        email: u.email ?? '',
                        user: u as unknown as Record<string, unknown>,
                        account,
                    });
                }
            }

            // Prepare personalized emails
            const result = prepareCampaignEmails(
                campaign.id,
                {
                    subject: template.subject,
                    bodyHtml: template.bodyHtml,
                    bodyText: template.bodyText ?? undefined,
                    variables: (template.variables ?? []) as Array<{ key: string; label: string; source: string; fallback: string }>,
                },
                [] as VariableMapping[],
                recipients,
                campaign.subjectOverride,
            );

            // Create send records AND actually deliver through email pipeline
            let successCount = 0;
            let failCount = 0;
            const warnings: string[] = [];

            // Check domain authentication before sending
            const fromEmail = campaign.fromEmail ?? template.fromEmail ?? process.env.EMAIL_FROM ?? '';
            const fromDomain = fromEmail.split('@')[1] ?? '';
            if (fromDomain) {
                const domains = await getSendingDomains(orgId);
                const domainRecord = domains.find(d => d.domain === fromDomain);
                if (!domainRecord) {
                    warnings.push(`Domain "${fromDomain}" is not registered. Emails may land in spam.`);
                } else if (domainRecord.status !== 'verified') {
                    warnings.push(`Domain "${fromDomain}" is not fully verified (status: ${domainRecord.status}). Emails may have deliverability issues.`);
                } else {
                    if (!domainRecord.dkimVerified) warnings.push(`DKIM not verified for ${fromDomain}.`);
                    if (!domainRecord.spfVerified) warnings.push(`SPF not verified for ${fromDomain}.`);
                    if (!domainRecord.dmarcVerified) warnings.push(`DMARC not verified for ${fromDomain}.`);
                }
            }

            for (const email of result.prepared) {
                // Skip recipients without valid email addresses
                if (!email.email || !email.email.includes('@')) {
                    failCount++;
                    continue;
                }

                // Create DB send record first
                const sendRecord = await createEmailSend(orgId, {
                    campaignId: campaign.id,
                    templateId: campaign.templateId,
                    trackedUserId: email.trackedUserId,
                    resolvedSubject: email.subject,
                    resolvedBodyHtml: email.bodyHtml,
                    resolvedVariables: email.resolvedVariables,
                    status: 'queued',
                });

                // Send through email pipeline (queue → suppression check → tracking → SMTP)
                try {
                    const sendResult = await sendEmail({
                        to: email.email,
                        subject: email.subject,
                        html: email.bodyHtml,
                        text: email.bodyText,
                        fromName: campaign.fromName ?? template.fromName ?? undefined,
                        fromEmail: campaign.fromEmail ?? template.fromEmail ?? undefined,
                        replyTo: campaign.replyTo ?? template.replyTo ?? undefined,
                        campaignId: campaign.id,
                        userId: email.trackedUserId,
                        priority: 'normal',
                        trackOpens: true,
                        trackClicks: true,
                    });

                    if (sendResult.success) {
                        successCount++;
                        if (sendRecord?.id) {
                            await (await import('@/lib/db/operations')).updateEmailSendStatus(
                                sendRecord.id,
                                'sent',
                                { providerMessageId: sendResult.messageId },
                            );
                        }
                    } else {
                        failCount++;
                        if (sendRecord?.id) {
                            await (await import('@/lib/db/operations')).updateEmailSendStatus(
                                sendRecord.id,
                                sendResult.suppressed ? 'suppressed' : 'failed',
                                { failureReason: sendResult.error },
                            );
                        }
                    }
                } catch {
                    failCount++;
                }
            }

            // Update campaign status and metrics
            await upsertEmailCampaign(orgId, {
                id: campaign.id,
                status: 'sent',
                sentAt: new Date(),
                completedAt: new Date(),
                totalSent: successCount,
            });

            return NextResponse.json({
                success: true,
                data: {
                    sent: successCount,
                    failed: failCount,
                    skipped: result.skipped,
                    errors: result.errors.length,
                    warnings,
                },
            });
        }

        // Create/update campaign
        const campaign = await upsertEmailCampaign(orgId, data);
        return NextResponse.json({ success: true, data: campaign }, { status: data.id ? 200 : 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
