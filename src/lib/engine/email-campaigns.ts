/* ═══════════════════════════════════════════════════════════════════════
 * Email Campaign Engine — Send, Track, and Manage Email Campaigns
 *
 * Orchestrates email campaign execution:
 *  1. Resolves target segment → list of recipients
 *  2. Personalizes each email using the personalization engine
 *  3. Creates email send records for tracking
 *  4. Aggregates campaign metrics
 *
 * This engine works with the segmentation engine for targeting and
 * the personalization engine for content resolution.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { SegmentFilter, VariableMapping } from '@/lib/db/schema';
import { personalizeEmail } from './personalization';
import { evaluateSegmentFilters } from './segmentation';

/* ── Campaign Execution Types ────────────────────────────────────────── */

export interface CampaignRecipient {
    trackedUserId: string;
    email: string;
    user: Record<string, unknown>;
    account?: Record<string, unknown> | null;
}

export interface PreparedEmail {
    trackedUserId: string;
    email: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    resolvedVariables: Record<string, string>;
}

export interface CampaignExecutionResult {
    campaignId: string;
    totalRecipients: number;
    prepared: PreparedEmail[];
    skipped: number;
    errors: Array<{ userId: string; error: string }>;
}

/* ── Campaign Metrics Aggregation ────────────────────────────────────── */

export interface CampaignMetrics {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
}

export function computeCampaignMetrics(stats: Record<string, number>): CampaignMetrics {
    const sent = (stats.sent ?? 0) + (stats.delivered ?? 0) + (stats.opened ?? 0) + (stats.clicked ?? 0);
    const delivered = (stats.delivered ?? 0) + (stats.opened ?? 0) + (stats.clicked ?? 0);
    const opened = (stats.opened ?? 0) + (stats.clicked ?? 0);
    const clicked = stats.clicked ?? 0;
    const bounced = stats.bounced ?? 0;
    const unsubscribed = stats.unsubscribed ?? 0;

    return {
        totalSent: sent,
        totalDelivered: delivered,
        totalOpened: opened,
        totalClicked: clicked,
        totalBounced: bounced,
        totalUnsubscribed: unsubscribed,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
        unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
    };
}

/* ── Recipient Filtering ─────────────────────────────────────────────── */

/**
 * Filter a list of recipients by additional campaign-level filters.
 * This is used on top of segment membership for fine-grained targeting.
 */
export function filterRecipients(
    recipients: CampaignRecipient[],
    filters: SegmentFilter[],
    filterLogic: string,
): CampaignRecipient[] {
    if (filters.length === 0) return recipients;

    return recipients.filter((r) =>
        evaluateSegmentFilters(filters, filterLogic, r.user, r.account),
    );
}

/* ── Email Preparation ───────────────────────────────────────────────── */

/**
 * Prepare personalized emails for all recipients in a campaign.
 * Each email is fully resolved with the user's real-time properties.
 */
export function prepareCampaignEmails(
    campaignId: string,
    template: {
        subject: string;
        bodyHtml: string;
        bodyText?: string;
        variables: Array<{ key: string; label: string; source: string; fallback: string }>;
        conditionalBlocks?: Array<{
            id: string;
            name: string;
            htmlContent: string;
            rules: SegmentFilter[];
            ruleLogic: 'AND' | 'OR';
        }>;
    },
    variableMappings: VariableMapping[],
    recipients: CampaignRecipient[],
    subjectOverride?: string | null,
    customVars?: Record<string, string>,
): CampaignExecutionResult {
    const prepared: PreparedEmail[] = [];
    const errors: Array<{ userId: string; error: string }> = [];
    let skipped = 0;

    for (const recipient of recipients) {
        try {
            // Skip users without email
            if (!recipient.email) {
                skipped++;
                continue;
            }

            const result = personalizeEmail(
                {
                    ...template,
                    subject: subjectOverride ?? template.subject,
                },
                variableMappings,
                recipient.user,
                recipient.account,
                customVars,
            );

            prepared.push({
                trackedUserId: recipient.trackedUserId,
                email: recipient.email,
                subject: result.subject,
                bodyHtml: result.bodyHtml,
                bodyText: result.bodyText,
                resolvedVariables: result.resolvedVariables,
            });
        } catch (err) {
            errors.push({
                userId: recipient.trackedUserId,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    return {
        campaignId,
        totalRecipients: recipients.length,
        prepared,
        skipped,
        errors,
    };
}

/* ── Email Template Presets ──────────────────────────────────────────── */

export const EMAIL_TEMPLATE_PRESETS = {
    welcome: {
        name: 'Welcome Email',
        subject: 'Welcome to {{account.name}}, {{user.name}}!',
        bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #10b981;">Welcome aboard, {{user.name}}! 🎉</h1>
  <p>We're thrilled to have you on the <strong>{{user.plan}}</strong> plan.</p>
  <p>Here are some things you can do to get started:</p>
  <ul>
    <li>Complete your profile setup</li>
    <li>Invite your team members</li>
    <li>Connect your first integration</li>
  </ul>
  <a href="{{app_url}}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Go to Dashboard</a>
  <p style="margin-top: 24px; color: #6b7280;">Need help? Reply to this email or visit our support center.</p>
</div>`,
        category: 'onboarding',
    },
    activation_reminder: {
        name: 'Activation Reminder',
        subject: '{{user.name}}, complete your setup to unlock full access',
        bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>You're almost there, {{user.name}}!</h2>
  <p>You signed up {{user.daysUntilRenewal}} days ago but haven't completed activation yet.</p>
  <p>Here's what you're missing out on:</p>
  <ul>
    <li>Real-time lifecycle tracking</li>
    <li>Automated churn prevention flows</li>
    <li>Revenue expansion insights</li>
  </ul>
  <a href="{{app_url}}/activation" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Complete Activation</a>
</div>`,
        category: 'activation',
    },
    churn_prevention: {
        name: 'At-Risk Re-engagement',
        subject: 'We miss you, {{user.name}} — here\'s what\'s new',
        bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>It's been a while, {{user.name}}</h2>
  <p>We noticed you haven't logged in recently. Your <strong>{{user.plan}}</strong> plan includes powerful features that are waiting for you.</p>
  <p><strong>Your account health:</strong> {{account.health}}</p>
  <p>We'd love to help you get more value. Would a quick call with our success team help?</p>
  <a href="{{app_url}}/dashboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Return to Dashboard</a>
</div>`,
        category: 'retention',
    },
    expansion_offer: {
        name: 'Expansion Offer',
        subject: '{{user.name}}, you\'re ready for the next level',
        bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>You're outgrowing your current plan, {{user.name}}</h2>
  <p>Great news — your usage patterns show you're getting excellent value from the platform. Here's what we noticed:</p>
  <ul>
    <li>Using <strong>{{user.seatCount}}</strong> of <strong>{{user.seatLimit}}</strong> seats</li>
    <li>Making <strong>{{user.apiCalls30d}}</strong> API calls this month</li>
    <li>Expansion score: <strong>{{user.expansionScore}}</strong></li>
  </ul>
  <p>Upgrading unlocks higher limits, premium features, and priority support.</p>
  <a href="{{app_url}}/expansion" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View Upgrade Options</a>
</div>`,
        category: 'expansion',
    },
    nps_survey: {
        name: 'NPS Survey',
        subject: 'Quick question, {{user.name}} — how are we doing?',
        bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>How likely are you to recommend us?</h2>
  <p>Hi {{user.name}}, we'd love your honest feedback. On a scale of 0-10, how likely are you to recommend {{account.name}} to a colleague?</p>
  <p style="text-align: center; margin: 24px 0;">
    {{#each [0,1,2,3,4,5,6,7,8,9,10]}}
    <a href="{{app_url}}/nps?score={{this}}&user={{user.id}}" style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; border: 1px solid #d1d5db; border-radius: 4px; margin: 2px; text-decoration: none; color: #374151;">{{this}}</a>
    {{/each}}
  </p>
  <p style="color: #6b7280; font-size: 14px;">Your feedback shapes our product roadmap. Thank you!</p>
</div>`,
        category: 'feedback',
    },
} as const;
