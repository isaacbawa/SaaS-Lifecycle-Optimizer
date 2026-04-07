/* ==========================================================================
 * Email Builder - Professional SaaS Lifecycle Templates (Extended)
 *
 * 16 advanced, revenue-focused email templates purpose-built for SaaS
 * lifecycle management. Each template targets a specific stage of the
 * customer journey and follows industry best practices:
 *
 *  - Single primary CTA above the fold
 *  - Preheader text optimized for inbox preview (40-90 chars)
 *  - Mobile-responsive single-column (600px max)
 *  - CAN-SPAM compliant footer with unsubscribe
 *  - Deep personalization via {{variable}} merge tags from SDK data
 *  - Scannable copy with clear hierarchy
 *  - Data-driven urgency and social proof
 *
 * Categories (2 templates each):
 *  1. Onboarding - Team Invitation, Quick Win Guide
 *  2. Activation - First Milestone, Setup Checklist
 *  3. Engagement - Weekly Digest, Power User Tips
 *  4. Retention - Win-Back, Health Alert
 *  5. Expansion - Usage Limit, Annual Savings
 *  6. Revenue - Dunning, Invoice Receipt
 *  7. Feedback - CSAT Survey, Feature Request Update
 *  8. Growth - Case Study Invite, Success Milestone
 * ========================================================================== */

import type { EmailTemplate, EmailBlock } from './types';
import { DEFAULT_GLOBAL_STYLES } from './types';

/* ── Helpers ─────────────────────────────────────────────────────────── */

let _proSeq = 10000;
function pid() { return `pro_${++_proSeq}_${Math.random().toString(36).slice(2, 6)}`; }

const FONT = 'Arial, Helvetica, sans-serif';
const p = (t: number, r: number, b: number, l: number) => ({ top: t, right: r, bottom: b, left: l });

/* ── Reusable Footer Block ───────────────────────────────────────────── */

function standardFooter(): EmailBlock {
    return {
        id: pid(), type: 'footer',
        content: {
            html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
            textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
            showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
            variant: 'centered' as const,
            padding: p(16, 32, 24, 32), backgroundColor: '#f9fafb',
        },
    };
}

function standardSocial(): EmailBlock {
    return {
        id: pid(), type: 'social',
        content: {
            links: [
                { platform: 'twitter', url: 'https://twitter.com/', label: 'Twitter' },
                { platform: 'linkedin', url: 'https://linkedin.com/', label: 'LinkedIn' },
            ],
            iconSize: 20, align: 'center' as const, color: '#9ca3af',
            variant: 'icons-only' as const,
            padding: p(16, 32, 4, 32), backgroundColor: '#f9fafb',
        },
    };
}

function logoBlock(): EmailBlock {
    return {
        id: pid(), type: 'image',
        content: {
            src: '{{company.website}}/logo.png', alt: '{{company.name}}',
            href: '{{company.website}}', width: 40, align: 'left',
            padding: p(24, 32, 12, 32), backgroundColor: 'transparent', borderRadius: 0,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 *  ONBOARDING 1 - Team Member Invitation Welcome
 *  Sent when an admin invites a colleague to join the account.
 * ═══════════════════════════════════════════════════════════════════════ */

const teamInvitationBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you\u2019ve been invited to join {{account.name}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>{{account.primaryContact}}</b> has invited you to collaborate on <b>{{company.name}}</b> \u2014 the platform {{account.name}} uses to manage their entire customer lifecycle, from onboarding to expansion.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Your team is on the <b>{{account.plan}}</b> plan with <b>{{account.userCount}}</b> members already onboard. Accepting takes less than 60 seconds.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Accept Invitation & Join', href: '{{company.website}}/invite/accept',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'divider',
        content: {
            color: '#e5e7eb', thickness: 1, width: 100, style: 'solid' as const,
            padding: p(0, 32, 0, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'What you\u2019ll have access to',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(20, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Lifecycle Dashboard', text: 'See real-time user segmentation, churn risk scores, and expansion signals across your customer base.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Email Flows', text: 'Build automated, event-driven email sequences that respond to user behavior and lifecycle changes.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Revenue Analytics', text: 'Track MRR, ARR, expansion revenue, and churn attribution tied directly to your lifecycle actions.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
            ],
            layout: '1-1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'If you didn\u2019t expect this invitation or believe it was sent in error, you can safely ignore this email. The invitation link expires in 7 days.',
            textAlign: 'left', fontSize: 13, lineHeight: 1.6, color: '#9ca3af', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ONBOARDING 2 - Day 1 Quick Win Guide
 *  Sent 2 hours after signup to drive first meaningful action.
 * ═══════════════════════════════════════════════════════════════════════ */

const quickWinGuideBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Your first quick win with {{company.name}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, teams that achieve their first result within 24 hours are <b>6x more likely</b> to convert to a paid plan. Here\u2019s the fastest path to value:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Quick Win: Send your first lifecycle email in under 5 minutes',
            level: 2, textAlign: 'left', color: '#2563eb', fontFamily: FONT,
            padding: p(0, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>Step 1:</b> Open the Email Builder and pick a template (we recommend "Trial Welcome")' },
                { text: '<b>Step 2:</b> Customize the subject line and body copy with your brand voice' },
                { text: '<b>Step 3:</b> Select a segment (e.g., "New Trial Users") as the audience' },
                { text: '<b>Step 4:</b> Hit Send or Schedule \u2014 done. Your first lifecycle email is live.' },
            ],
            style: 'numbered' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#eff6ff',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Open the Email Builder', href: '{{company.website}}/email-builder',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'quote',
        content: {
            text: 'We sent our first retention email within an hour of signing up. That single email reduced our 30-day churn by 12%.',
            attribution: 'Marcus Chen', attributionTitle: 'Head of Growth, DataSync',
            textAlign: 'left', fontSize: 15, color: '#374151', fontFamily: FONT,
            accentColor: '#2563eb', style: 'border-left' as const,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Need help? Reply to this email or <a href="{{company.website}}/docs/quickstart" style="color:#2563eb;text-decoration:underline;">read the 3-minute quickstart guide</a>.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ACTIVATION 1 - First Milestone Celebration
 *  Triggered when user completes a key activation milestone.
 * ═══════════════════════════════════════════════════════════════════════ */

const firstMilestoneBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u2705 Milestone achieved</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#166534', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'You just sent your first lifecycle email, {{user.firstName}}!',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'This is a big deal. Research shows that SaaS teams who send their first automated email within the trial period are <b>3.2x more likely to see measurable revenue impact</b> within 90 days.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '\u2705 Completed', text: 'Account created\nSDK installed\nFirst email sent', buttonLabel: '', buttonUrl: '', buttonColor: '#16a34a' },
                { imageUrl: '', imageAlt: '', heading: '\u27a1\ufe0f Up Next', text: 'Create a user segment\nSet up an automated flow\nConnect revenue tracking', buttonLabel: 'Start next step', buttonUrl: '{{company.website}}/segments/new', buttonColor: '#2563eb' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(4, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Create Your First Segment', href: '{{company.website}}/segments/new',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 16, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'The more lifecycle stages you cover, the more revenue you\u2019ll recover and generate. Most teams see meaningful results after setting up 3 automated flows.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ACTIVATION 2 - Personalized Setup Checklist
 *  Sent Day 2 with a role/industry-aware checklist.
 * ═══════════════════════════════════════════════════════════════════════ */

const setupChecklistBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Your personalized setup plan, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Based on what we know about <b>{{account.name}}</b> in the <b>{{account.industry}}</b> space, here\u2019s a tailored setup path designed to get your team to full value on the <b>{{account.plan}}</b> plan as quickly as possible.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Priority setup tasks for {{account.industry}} teams',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(0, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>Install the tracking SDK</b> \u2014 Capture real user events and lifecycle transitions from your product (\u223c10 min)' },
                { text: '<b>Import existing users</b> \u2014 Sync your current customer data via CSV or API to populate lifecycle stages immediately' },
                { text: '<b>Define 3 core segments</b> \u2014 We recommend: New Trial Users, At-Risk Accounts, Expansion-Ready Accounts' },
                { text: '<b>Build your first automated flow</b> \u2014 Start with a trial welcome sequence \u2014 it\u2019s the highest-ROI automation for {{account.industry}} teams' },
                { text: '<b>Connect revenue data</b> \u2014 Link your billing provider to track MRR impact from every lifecycle action' },
            ],
            style: 'check' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 14,
            padding: p(4, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Continue Setup', href: '{{company.website}}/onboarding',
            backgroundColor: '#7c3aed', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 12, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Teams in {{account.industry}} that complete all 5 steps within the first week generate <b>4.1x more lifecycle-driven revenue</b> in their first quarter.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Want a walkthrough customized to your team? <a href="{{company.website}}/demo" style="color:#7c3aed;text-decoration:underline;">Book a 15-minute strategy session</a> \u2014 no sales pitch, just setup help.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ENGAGEMENT 1 - Weekly Usage Digest
 *  Automated weekly summary of account activity and metrics.
 * ═══════════════════════════════════════════════════════════════════════ */

const weeklyDigestBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Weekly Digest</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#1d4ed8', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Your week at {{company.name}}, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Here\u2019s how <b>{{account.name}}</b> performed this week across your lifecycle metrics.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '{{account.mrr}}', text: 'Current MRR', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
                { imageUrl: '', imageAlt: '', heading: '{{account.userCount}}', text: 'Total Users', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: '{{account.health}}', text: 'Health Score', buttonLabel: '', buttonUrl: '', buttonColor: '#d97706' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 4, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'divider',
        content: {
            color: '#e5e7eb', thickness: 1, width: 100, style: 'solid' as const,
            padding: p(12, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Key activity this week',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(0, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>{{user.loginFrequencyLast7Days}} team logins</b> this week ({{user.loginFrequencyLast30Days}} in the last 30 days)' },
                { text: '<b>Churn risk score:</b> {{user.churnRiskScore}} \u2014 monitor accounts above 50 for proactive outreach' },
                { text: '<b>Expansion score:</b> {{user.expansionScore}} \u2014 accounts above 70 are prime for upsell conversations' },
                { text: '<b>Active seats:</b> {{user.seatCount}} of {{user.seatLimit}} used on the {{user.plan}} plan' },
            ],
            style: 'arrow' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Recommended actions',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Review at-risk users', text: 'Check users with churn risk above 50 and trigger a re-engagement flow.', buttonLabel: 'View segments', buttonUrl: '{{company.website}}/segments', buttonColor: '#dc2626' },
                { imageUrl: '', imageAlt: '', heading: 'Pursue expansion', text: 'Accounts with expansion score above 70 are ready for upgrade conversations.', buttonLabel: 'View pipeline', buttonUrl: '{{company.website}}/expansion', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Open Full Dashboard', href: '{{company.website}}/dashboard',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ENGAGEMENT 2 - Power User Tips
 *  Sent to highly active users with advanced feature guidance.
 * ═══════════════════════════════════════════════════════════════════════ */

const powerUserTipsBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#f5f3ff;color:#7c3aed;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u26a1 Pro Tips</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#7c3aed', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Advanced strategies for power users like you, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'You\u2019ve logged in <b>{{user.loginFrequencyLast30Days}} times</b> in the last 30 days \u2014 you\u2019re clearly getting value from {{company.name}}. Here are 3 advanced techniques the top 5% of users leverage to maximize their lifecycle-driven revenue.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '1. Multi-stage flow branching',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Instead of single-path flows, use <b>conditional branching</b> based on user behavior (opened email, clicked CTA, visited pricing page). Teams using branching flows see <b>67% higher conversion rates</b> than linear sequences.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '2. Churn prediction + preemptive outreach',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Create a segment where <code>churnRiskScore > 60</code> and trigger a personalized check-in flow automatically. Teams running preemptive churn outreach reduce involuntary churn by <b>up to 34%</b>.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '3. Revenue-attributed A/B testing',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Don\u2019t just test open rates \u2014 test revenue outcomes. Use our A/B test feature inside flows to measure which email variant generates more expansion revenue, not just more clicks.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Explore Advanced Features', href: '{{company.website}}/flows',
            backgroundColor: '#7c3aed', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Want to go deeper? Check our <a href="{{company.website}}/docs/advanced" style="color:#7c3aed;text-decoration:underline;">advanced playbook</a> for detailed implementation guides.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  RETENTION 1 - Win-Back Campaign
 *  Sent to accounts that cancelled or let their subscription lapse.
 * ═══════════════════════════════════════════════════════════════════════ */

const winBackBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, a lot has changed since you left',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'It\u2019s been a while since <b>{{account.name}}</b> used {{company.name}}. We understand \u2014 timing matters, and maybe we weren\u2019t the right fit back then. But we\u2019ve invested heavily in the areas our customers asked for, and the product today is meaningfully different.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'What\u2019s new since your last visit',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Visual Flow Builder', text: 'Drag-and-drop automation with conditional branching, A/B testing, and revenue attribution.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Segments', text: 'Auto-updating segments that use churn prediction and expansion scoring in real time.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 8, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Revenue Dashboard', text: 'Track MRR, ARR, and expansion revenue tied directly to every lifecycle action you take.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Email Builder', text: 'Professional drag-and-drop email builder with 25+ templates and mobile previews.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>Welcome-back offer:</b> Reactivate your account this week and get <span style="color:#059669;font-weight:700;">30% off your first 3 months</span> on any plan. Your previous data and configurations are still intact.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: '#fef3c7',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Reactivate My Account', href: '{{company.website}}/reactivate?promo=WELCOMEBACK30',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Not ready to commit? <a href="{{company.website}}/demo" style="color:#2563eb;text-decoration:underline;">Book a quick 10-minute walkthrough</a> to see what\u2019s changed. No pressure.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  RETENTION 2 - Account Health Alert
 *  Proactive notification to admins when account health declines.
 * ═══════════════════════════════════════════════════════════════════════ */

const healthAlertBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef2f2;color:#b91c1c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u26a0\ufe0f Health Alert</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#b91c1c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, your account health needs attention',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'We\u2019ve detected a decline in engagement for <b>{{account.name}}</b>. Your current health score is <b>{{account.health}}</b>, and your churn risk score has risen to <b>{{user.churnRiskScore}}</b>. Here\u2019s what we\u2019re seeing:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '{{user.lastLoginDaysAgo}} days', text: 'Since your last login', buttonLabel: '', buttonUrl: '', buttonColor: '#dc2626' },
                { imageUrl: '', imageAlt: '', heading: '{{user.loginFrequencyLast7Days}}', text: 'Logins this week (down)', buttonLabel: '', buttonUrl: '', buttonColor: '#d97706' },
                { imageUrl: '', imageAlt: '', heading: '{{user.churnRiskScore}}', text: 'Churn risk score', buttonLabel: '', buttonUrl: '', buttonColor: '#b91c1c' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#fef2f2', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'What we recommend',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>Re-engage inactive team members</b> \u2014 Send a targeted internal reminder to users who haven\u2019t logged in this week' },
                { text: '<b>Review your automated flows</b> \u2014 Ensure your churn prevention flows are active and targeting the right segments' },
                { text: '<b>Schedule a health check</b> \u2014 Our customer success team can audit your setup and recommend improvements' },
            ],
            style: 'arrow' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#dc2626', spacing: 12,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'View Account Health Dashboard', href: '{{company.website}}/dashboard',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Need hands-on help? <a href="{{company.website}}/support/health-check" style="color:#dc2626;text-decoration:underline;">Request a free account health review</a> with our customer success team.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  EXPANSION 1 - Usage Limit Approaching
 *  Triggered when API calls, users, or features near plan limits.
 * ═══════════════════════════════════════════════════════════════════════ */

const usageLimitBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fff7ed;color:#c2410c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Usage Notice</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#c2410c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you\u2019re approaching your plan limits',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>{{account.name}}</b> is approaching the limits of the <b>{{user.plan}}</b> plan. This is a positive signal \u2014 it means your team is getting real value from the platform. Here\u2019s where you stand:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Seats Used', text: '{{user.seatCount}} of {{user.seatLimit}}\n(' + 'Approaching limit' + ')', buttonLabel: '', buttonUrl: '', buttonColor: '#c2410c' },
                { imageUrl: '', imageAlt: '', heading: 'Team Members', text: '{{account.userCount}} active members\nacross {{account.name}}', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Current MRR', text: '{{account.mrr}}/month\n{{account.arr}}/year', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#fff7ed', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Once you reach your plan limit, new users won\u2019t be able to join until seats are freed up or your plan is upgraded. We recommend upgrading proactively to avoid disruption.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Recommended upgrade',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(0, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Your Plan', text: '{{user.plan}}\n{{user.seatLimit}} seat limit\n{{account.mrr}}/month', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
                { imageUrl: '', imageAlt: '', heading: 'Next Tier', text: 'Expanded seat limit\nPriority support\nAdvanced automation\nCustom integrations', buttonLabel: 'Compare plans', buttonUrl: '{{company.website}}/pricing', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Upgrade My Plan', href: '{{company.website}}/billing/upgrade',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  EXPANSION 2 - Annual Plan Savings
 *  Convert monthly subscribers to annual billing.
 * ═══════════════════════════════════════════════════════════════════════ */

const annualSavingsBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, save {{account.mrr}} per year by switching to annual',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'You\u2019ve been on the <b>{{user.plan}}</b> plan at <b>{{account.mrr}}/month</b> for a while now, and it\u2019s clearly working \u2014 your team has logged in <b>{{user.loginFrequencyLast30Days}} times</b> in the last 30 days. Here\u2019s how annual billing could save <b>{{account.name}}</b> significantly:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Monthly Billing', text: '{{account.mrr}}/month\n{{account.arr}}/year\nCancel anytime', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
                { imageUrl: '', imageAlt: '', heading: 'Annual Billing', text: 'Save 2 months free\nPriority support included\nLocked-in pricing', buttonLabel: 'Switch to annual', buttonUrl: '{{company.website}}/billing/annual', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(4, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>What you get by switching:</b>',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>2 months free</b> \u2014 That\u2019s the equivalent of saving 17% on your total cost' },
                { text: '<b>Priority support</b> \u2014 Annual customers get fast-track access to our success team' },
                { text: '<b>Price lock</b> \u2014 Your rate is locked for the full year, even if we adjust pricing' },
                { text: '<b>Budget predictability</b> \u2014 One annual invoice simplifies your finance workflows' },
            ],
            style: 'check' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#059669', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Switch to Annual & Save', href: '{{company.website}}/billing/annual',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'The switch is prorated \u2014 you\u2019ll only pay the difference for the remaining period. Have questions? Reply directly to this email.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  REVENUE 1 - Payment Failed (Dunning)
 *  Graceful recovery for failed payment attempts.
 * ═══════════════════════════════════════════════════════════════════════ */

const dunningBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef2f2;color:#b91c1c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Action Required</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#b91c1c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, your payment didn\u2019t go through',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'We attempted to charge the card on file for the <b>{{user.plan}}</b> subscription at <b>{{account.name}}</b>, but the payment of <b>{{account.mrr}}</b> was declined. This can happen for a number of reasons \u2014 expired card, insufficient funds, or a bank security hold.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>What happens next:</b><br/>\u2022 We\u2019ll retry the payment automatically in 3 days<br/>\u2022 If not resolved within 7 days, your account will be downgraded to the free tier<br/>\u2022 Your data, segments, flows, and team access will be preserved for 30 days',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: '#fef2f2',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Update Payment Method', href: '{{company.website}}/billing/payment',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'If you believe this was charged in error or need help, reply to this email and our billing team will assist you within 24 hours. We\u2019re here to help keep <b>{{account.name}}</b> running smoothly.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  REVENUE 2 - Invoice & Payment Receipt
 *  Professional payment confirmation and receipt.
 * ═══════════════════════════════════════════════════════════════════════ */

const invoiceReceiptBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u2705 Payment Confirmed</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#166534', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Payment receipt for {{account.name}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, this confirms your payment has been successfully processed. Here are the details for your records:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Plan', text: '{{user.plan}}', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
                { imageUrl: '', imageAlt: '', heading: 'Amount', text: '{{account.mrr}}', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
                { imageUrl: '', imageAlt: '', heading: 'Next Billing', text: 'In {{user.daysUntilRenewal}} days', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 4, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'divider',
        content: {
            color: '#e5e7eb', thickness: 1, width: 100, style: 'solid' as const,
            padding: p(16, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>Invoice details:</b><br/><br/>Account: {{account.name}}<br/>Plan: {{user.plan}}<br/>Billing period: Monthly<br/>Amount charged: {{account.mrr}}<br/>Payment method: Card on file<br/>Seats: {{user.seatCount}} of {{user.seatLimit}} active',
            textAlign: 'left', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Download Full Invoice (PDF)', href: '{{company.website}}/billing/invoices',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Need to update your billing info or have questions about this charge? <a href="{{company.website}}/billing" style="color:#2563eb;text-decoration:underline;">Manage billing</a> or reply to this email.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  FEEDBACK 1 - CSAT Survey Request
 *  Post-interaction customer satisfaction survey.
 * ═══════════════════════════════════════════════════════════════════════ */

const csatSurveyBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: 'How was your experience, {{user.firstName}}?',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'You recently interacted with our team at {{company.name}}. We\u2019d love to know how it went. Your honest feedback directly helps us improve the experience for teams like <b>{{account.name}}</b>.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'How satisfied were you with the support you received?',
            level: 2, textAlign: 'center', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude1e', text: 'Not satisfied', buttonLabel: 'Rate 1-2', buttonUrl: '{{company.website}}/feedback/csat?score=1', buttonColor: '#dc2626' },
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude10', text: 'It was okay', buttonLabel: 'Rate 3', buttonUrl: '{{company.website}}/feedback/csat?score=3', buttonColor: '#d97706' },
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude0a', text: 'Very satisfied', buttonLabel: 'Rate 4-5', buttonUrl: '{{company.website}}/feedback/csat?score=5', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'This takes less than 30 seconds and directly influences how we prioritize improvements. Every response is read by our team.',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'divider',
        content: {
            color: '#e5e7eb', thickness: 1, width: 100, style: 'solid' as const,
            padding: p(12, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Prefer to share detailed feedback? <a href="{{company.website}}/feedback/detailed" style="color:#2563eb;text-decoration:underline;">Fill out the full survey</a> (it only takes 2 minutes).',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  FEEDBACK 2 - Feature Request Status Update
 *  Closing the loop on user-submitted feature requests.
 * ═══════════════════════════════════════════════════════════════════════ */

const featureRequestUpdateBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\ud83d\udce3 Feature Update</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#1d4ed8', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, we built something you asked for',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Remember when you submitted a feature request? We listened. Your feedback (along with input from other teams) directly shaped what we just shipped. Here\u2019s an update on features that <b>{{account.name}}</b> asked for:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<span style="color:#059669;font-weight:600;">\u2705 Shipped:</span> Advanced segment filtering with custom event properties' },
                { text: '<span style="color:#2563eb;font-weight:600;">\ud83d\udea7 In Progress:</span> Webhook-based flow triggers for real-time automation' },
                { text: '<span style="color:#d97706;font-weight:600;">\ud83d\udcdd Planned:</span> Multi-language email template support for global teams' },
            ],
            style: 'bullet' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 14,
            padding: p(4, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'We believe the best products are built with customer input, not in isolation. Your requests aren\u2019t filed into a backlog and forgotten \u2014 they actively shape our roadmap.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'Try the New Features', href: '{{company.website}}/changelog',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Have more ideas? <a href="{{company.website}}/feedback" style="color:#2563eb;text-decoration:underline;">Submit another feature request</a> \u2014 we read every single one.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  GROWTH 1 - Case Study Invitation
 *  Invite high-NPS power users to share their story.
 * ═══════════════════════════════════════════════════════════════════════ */

const caseStudyInviteBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, would {{account.name}} like to be featured?',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'You rated us <b>{{user.npsScore}}/10</b>, and your team at <b>{{account.name}}</b> has been achieving outstanding results with {{company.name}}. We\u2019d love to tell your story.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'We\u2019re building a collection of customer success stories to help other {{account.industry}} teams understand how lifecycle management drives real business outcomes. Being featured includes:',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'list',
        content: {
            items: [
                { text: '<b>A professionally written case study</b> published on our website and shared with our audience' },
                { text: '<b>Backlink and brand exposure</b> to thousands of SaaS decision-makers in our community' },
                { text: '<b>Co-branded social media promotion</b> across our LinkedIn, Twitter, and newsletter' },
                { text: '<b>$500 credit</b> applied to your next billing cycle as a thank you' },
            ],
            style: 'star' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#d97706', spacing: 12,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'The process is simple: a 30-minute interview over Zoom. We handle all the writing, editing, and design. You review and approve before anything is published.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'I\u2019m Interested \u2014 Schedule Interview', href: '{{company.website}}/case-study/apply',
            backgroundColor: '#d97706', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Not the right time? No worries \u2014 we appreciate you being a valued customer either way. We can always revisit this in the future.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  GROWTH 2 - Success Milestone Achievement
 *  Celebrate a meaningful customer achievement to drive advocacy.
 * ═══════════════════════════════════════════════════════════════════════ */

const successMilestoneBlocks: EmailBlock[] = [
    { id: pid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: pid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\ud83c\udfc6 Achievement Unlocked</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#92400e', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'Congratulations, {{user.firstName}}! {{account.name}} hit a major milestone',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'Your team at <b>{{account.name}}</b> has reached a significant achievement on {{company.name}}. Results like these don\u2019t happen by accident \u2014 they\u2019re the direct outcome of your team\u2019s intentional lifecycle strategy.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '{{account.arr}}', text: 'Annual Recurring Revenue', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
                { imageUrl: '', imageAlt: '', heading: '{{account.userCount}}', text: 'Users Managed', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: '{{account.health}}', text: 'Account Health', buttonLabel: '', buttonUrl: '', buttonColor: '#d97706' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#fef3c7', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'heading',
        content: {
            text: 'What this means for {{account.name}}',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: 'You\u2019re now in the top tier of {{company.name}} customers. This level of execution puts <b>{{account.name}}</b> alongside the most successful SaaS teams on our platform when it comes to lifecycle-driven growth.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'text',
        content: {
            html: '<b>Unlock your next level:</b> Teams that combine lifecycle automation with expansion scoring at this stage typically see <b>25-40% additional revenue growth</b> within the next quarter. Here\u2019s how to keep the momentum going:',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: pid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Share your win', text: 'Let your team and stakeholders know about this achievement.', buttonLabel: 'Generate report', buttonUrl: '{{company.website}}/reports', buttonColor: '#d97706' },
                { imageUrl: '', imageAlt: '', heading: 'Level up', text: 'Explore advanced expansion strategies to continue your growth trajectory.', buttonLabel: 'View strategies', buttonUrl: '{{company.website}}/expansion', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: pid(), type: 'button',
        content: {
            text: 'View Your Full Achievement Report', href: '{{company.website}}/dashboard',
            backgroundColor: '#d97706', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 * EXPORTED PROFESSIONAL TEMPLATE CATALOGUE
 * ═══════════════════════════════════════════════════════════════════════ */

export const PRO_TEMPLATES: EmailTemplate[] = [
    /* ── Onboarding ────────────────────────────── */
    {
        id: 'tpl_pro_team_invitation',
        name: 'Team Member Invitation',
        subject: '{{user.firstName}}, you\u2019ve been invited to join {{account.name}} on {{company.name}}',
        preheaderText: '{{account.primaryContact}} invited you to collaborate. Accept in one click.',
        category: 'onboarding',
        blocks: teamInvitationBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_quick_win',
        name: 'Day 1 Quick Win Guide',
        subject: 'Your first quick win with {{company.name}}, {{user.firstName}}',
        preheaderText: 'Teams that act in the first 24 hours are 6x more likely to convert.',
        category: 'onboarding',
        blocks: quickWinGuideBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Activation ────────────────────────────── */
    {
        id: 'tpl_pro_first_milestone',
        name: 'First Milestone Celebration',
        subject: '\u2705 Milestone unlocked, {{user.firstName}} \u2014 your first lifecycle email is live!',
        preheaderText: 'You just completed a key activation milestone. Here\u2019s what to do next.',
        category: 'activation',
        blocks: firstMilestoneBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_setup_checklist',
        name: 'Personalized Setup Checklist',
        subject: '{{user.firstName}}, your tailored setup plan for {{account.name}}',
        preheaderText: 'A custom setup path based on your industry and plan.',
        category: 'activation',
        blocks: setupChecklistBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Engagement ────────────────────────────── */
    {
        id: 'tpl_pro_weekly_digest',
        name: 'Weekly Usage Digest',
        subject: 'Your weekly digest: {{account.name}} performance at a glance',
        preheaderText: 'MRR, health score, churn risk, and recommended actions for this week.',
        category: 'engagement',
        blocks: weeklyDigestBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_power_user_tips',
        name: 'Power User Tips',
        subject: '{{user.firstName}}, 3 advanced strategies top users leverage',
        preheaderText: 'Level up with branching flows, churn prediction, and A/B testing.',
        category: 'engagement',
        blocks: powerUserTipsBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Retention ─────────────────────────────── */
    {
        id: 'tpl_pro_win_back',
        name: 'Win-Back Campaign',
        subject: '{{user.firstName}}, a lot has changed \u2014 come see what\u2019s new',
        preheaderText: 'We\u2019ve rebuilt key features since your last visit. Plus, 30% off to welcome you back.',
        category: 'retention',
        blocks: winBackBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_health_alert',
        name: 'Account Health Alert',
        subject: '\u26a0\ufe0f {{user.firstName}}, your account health score needs attention',
        preheaderText: 'Engagement is declining at {{account.name}}. Here\u2019s what we recommend.',
        category: 'retention',
        blocks: healthAlertBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Expansion ─────────────────────────────── */
    {
        id: 'tpl_pro_usage_limit',
        name: 'Usage Limit Approaching',
        subject: '{{user.firstName}}, {{account.name}} is approaching your plan limits',
        preheaderText: 'You\u2019re nearing your seat limit. Upgrade before it affects your team.',
        category: 'expansion',
        blocks: usageLimitBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_annual_savings',
        name: 'Annual Plan Savings',
        subject: '{{user.firstName}}, save 2 months free by switching to annual',
        preheaderText: 'Lock in your rate, get priority support, and simplify accounting.',
        category: 'expansion',
        blocks: annualSavingsBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Revenue ───────────────────────────────── */
    {
        id: 'tpl_pro_dunning',
        name: 'Payment Failed (Dunning)',
        subject: 'Action required: Payment failed for {{account.name}}',
        preheaderText: 'Your last payment was declined. Update your card to avoid disruption.',
        category: 'revenue',
        blocks: dunningBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_invoice_receipt',
        name: 'Invoice & Payment Receipt',
        subject: 'Payment confirmed: {{account.mrr}} for {{account.name}}',
        preheaderText: 'Your payment was processed successfully. Download your invoice.',
        category: 'revenue',
        blocks: invoiceReceiptBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Feedback ──────────────────────────────── */
    {
        id: 'tpl_pro_csat_survey',
        name: 'CSAT Survey',
        subject: 'Quick question, {{user.firstName}} \u2014 how was your experience?',
        preheaderText: 'Rate your recent interaction in one click. It takes 10 seconds.',
        category: 'feedback',
        blocks: csatSurveyBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_feature_request_update',
        name: 'Feature Request Update',
        subject: '{{user.firstName}}, we built something you asked for',
        preheaderText: 'Your feature request influenced our latest release. Here\u2019s the update.',
        category: 'feedback',
        blocks: featureRequestUpdateBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    /* ── Growth ────────────────────────────────── */
    {
        id: 'tpl_pro_case_study_invite',
        name: 'Case Study Invitation',
        subject: '{{user.firstName}}, would {{account.name}} like to be featured?',
        preheaderText: 'Tell your success story and earn $500 in credits.',
        category: 'growth',
        blocks: caseStudyInviteBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_pro_success_milestone',
        name: 'Success Milestone',
        subject: '\ud83c\udfc6 {{account.name}} just hit a major milestone on {{company.name}}',
        preheaderText: 'Congratulations! Here\u2019s your achievement report and next steps.',
        category: 'growth',
        blocks: successMilestoneBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
];
