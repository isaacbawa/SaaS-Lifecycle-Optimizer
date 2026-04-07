/* ==========================================================================
 * Email Builder - SaaS Customer Journey Templates
 *
 * Templates designed for SaaS owners to send to THEIR end users.
 * Every template covers a real SaaS customer journey touchpoint:
 * signup, activation, engagement, billing, churn prevention,
 * expansion, feedback collection, and advocacy.
 *
 * Perspective:
 *   {{company.name}}  = The SaaS owner's product (e.g., "Acme CRM")
 *   {{user.firstName}} = The SaaS owner's end-user / customer
 *   {{account.name}}   = The end-user's organization
 *
 * Design principles:
 *  - Single primary CTA above the fold
 *  - Preheader text for inbox preview (40-90 chars)
 *  - Mobile-responsive single column (600px max)
 *  - CAN-SPAM compliant footer with unsubscribe
 *  - Personalization via {{variable}} merge tags
 *  - Concise, scannable copy with clear hierarchy
 *  - No hype - practical, respectful, conversion-focused
 * ========================================================================== */

import type { EmailTemplate, EmailBlock } from './types';
import { DEFAULT_GLOBAL_STYLES } from './types';

/* ── Helpers ─────────────────────────────────────────────────────────── */

let _saasSeq = 20000;
function sid() { return `saas_${++_saasSeq}_${Math.random().toString(36).slice(2, 6)}`; }

const FONT = 'Arial, Helvetica, sans-serif';
const p = (t: number, r: number, b: number, l: number) => ({ top: t, right: r, bottom: b, left: l });

/* ── Reusable Blocks ─────────────────────────────────────────────────── */

function standardFooter(): EmailBlock {
    return {
        id: sid(), type: 'footer',
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
        id: sid(), type: 'social',
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
        id: sid(), type: 'image',
        content: {
            src: '{{company.website}}/logo.png', alt: '{{company.name}}',
            href: '{{company.website}}', width: 40, align: 'left',
            padding: p(24, 32, 12, 32), backgroundColor: 'transparent', borderRadius: 0,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── ONBOARDING CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. Welcome Email (New Signup) ───────────────────────────────────── */

const welcomeSignupBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Welcome to {{company.name}}, {{user.firstName}}!',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Thanks for signing up. We built {{company.name}} to help you work smarter, and we\u2019re glad you\u2019re here. Your account is ready \u2014 no complicated setup, no hidden fees during your trial.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Here\u2019s what you can do right now:',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: '<b>Explore your dashboard</b> \u2014 Get an overview of everything available on your plan' },
                { text: '<b>Invite your team</b> \u2014 Add colleagues so you can collaborate together' },
                { text: '<b>Follow the setup guide</b> \u2014 A short walkthrough to help you get value quickly' },
            ],
            style: 'check' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Go to My Dashboard', href: '{{company.website}}/dashboard',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'If you have any questions, just reply to this email. A real person on our team will get back to you.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 2. Email Verification ───────────────────────────────────────────── */

const emailVerificationBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Verify your email address',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, please confirm your email address to finish setting up your {{company.name}} account. This helps us keep your account secure.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Verify My Email', href: '{{company.website}}/verify?token={{user.verificationToken}}',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 16, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Or copy and paste this link into your browser:<br/><a href="{{company.website}}/verify?token={{user.verificationToken}}" style="color:#2563eb;word-break:break-all;">{{company.website}}/verify?token={{user.verificationToken}}</a>',
            textAlign: 'left', fontSize: 13, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'This link expires in 24 hours. If you didn\u2019t create a {{company.name}} account, you can safely ignore this email.',
            textAlign: 'left', fontSize: 13, lineHeight: 1.6, color: '#9ca3af', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardFooter(),
];

/* ── 3. Team Invitation ──────────────────────────────────────────────── */

const teamInviteBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you\u2019ve been invited to join {{account.name}} on {{company.name}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>{{account.primaryContact}}</b> has invited you to join the <b>{{account.name}}</b> workspace on {{company.name}}. Accept the invitation to start collaborating with your team.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Accept Invitation', href: '{{company.website}}/invite/accept',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 16, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'This invitation expires in 7 days. If you didn\u2019t expect this, you can ignore this email.',
            textAlign: 'left', fontSize: 13, lineHeight: 1.6, color: '#9ca3af', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 4. Getting Started Guide (Day 1) ────────────────────────────────── */

const gettingStartedBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Get started with {{company.name}} in 3 simple steps',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, most users who follow these three steps in their first day get the most value from {{company.name}}. Each one takes just a few minutes.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Step 1', text: 'Complete your profile and configure your workspace preferences.', buttonLabel: 'Set up', buttonUrl: '{{company.website}}/settings/profile', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Step 2', text: 'Create your first project or import existing data from another tool.', buttonLabel: 'Create', buttonUrl: '{{company.website}}/projects/new', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Step 3', text: 'Invite your team members so everyone can collaborate in one place.', buttonLabel: 'Invite', buttonUrl: '{{company.website}}/settings/team', buttonColor: '#2563eb' },
            ],
            layout: '1-1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Continue Setup', href: '{{company.website}}/onboarding',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Need help? Check our <a href="{{company.website}}/docs" style="color:#2563eb;text-decoration:underline;">documentation</a> or reply to this email and our team will assist you.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── ACTIVATION CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 5. Setup Incomplete Reminder ────────────────────────────────────── */

const setupIncompleteBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you\u2019re almost set up',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'You started setting up {{company.name}} a few days ago but haven\u2019t finished yet. You\u2019re close \u2014 here\u2019s what\u2019s left:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '\u2705 Account created<br/>\u2705 Email verified<br/>\u2b1c Complete your profile<br/>\u2b1c Create your first project<br/>\u2b1c Invite a team member',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: '#f0f9ff',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Finish Setup', href: '{{company.website}}/onboarding',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 16, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Stuck on something? <a href="{{company.website}}/support" style="color:#2563eb;text-decoration:underline;">Contact our support team</a> and we\u2019ll help you get going.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 6. First Achievement Celebration ────────────────────────────────── */

const firstAchievementBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u2705 Achievement Unlocked</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#166534', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Nice work, {{user.firstName}}! You just hit your first milestone',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'You\u2019ve completed a key step in {{company.name}} \u2014 that\u2019s a great start. Users who reach this point early tend to get the most out of the platform long-term.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>What to try next:</b>',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Explore integrations', text: 'Connect the tools you already use to streamline your workflow.', buttonLabel: 'Browse integrations', buttonUrl: '{{company.website}}/integrations', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Try an advanced feature', text: 'You\u2019ve unlocked access to features that can save you even more time.', buttonLabel: 'See features', buttonUrl: '{{company.website}}/features', buttonColor: '#7c3aed' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Keep Going', href: '{{company.website}}/dashboard',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 7. Personalized Recommendations ─────────────────────────────────── */

const personalizedRecsBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, here\u2019s what we recommend for you',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Based on how you\u2019ve been using {{company.name}}, we think these features will help you get even more done.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Automations', text: 'Automate repetitive tasks and save hours every week. Most users start with a simple rule.', buttonLabel: 'Set up', buttonUrl: '{{company.website}}/automations', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Templates', text: 'Use pre-built templates to standardize your team\u2019s workflows and reduce errors.', buttonLabel: 'Browse', buttonUrl: '{{company.website}}/templates', buttonColor: '#7c3aed' },
                { imageUrl: '', imageAlt: '', heading: 'Reports', text: 'Track your progress with built-in analytics and share insights with stakeholders.', buttonLabel: 'View', buttonUrl: '{{company.website}}/reports', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 16,
            padding: p(0, 32, 20, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Explore All Features', href: '{{company.website}}/features',
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
 *  ─── ENGAGEMENT CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 8. New Feature Announcement ─────────────────────────────────────── */

const featureAnnouncementBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">What\u2019s New</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#1d4ed8', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Introducing: [Feature Name]',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, we just shipped something your team at <b>{{account.name}}</b> is going to love. Here\u2019s what it does and why it matters for you:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'image',
        content: {
            src: '{{company.website}}/images/feature-preview.png', alt: 'New feature preview',
            href: '{{company.website}}/features/new', width: 100, align: 'center',
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent', borderRadius: 8,
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: '<b>Benefit 1</b> \u2014 Describe the first key benefit for the user' },
                { text: '<b>Benefit 2</b> \u2014 Describe the second key benefit for the user' },
                { text: '<b>Benefit 3</b> \u2014 Describe the third key benefit for the user' },
            ],
            style: 'check' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Try It Now', href: '{{company.website}}/features/new',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 9. Product Tips & Best Practices ────────────────────────────────── */

const productTipsBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '3 tips to get more from {{company.name}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, here are a few practical tips that our most successful users apply regularly. Each one takes less than 5 minutes to implement.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Tip 1: Use keyboard shortcuts',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Press <code>Ctrl+K</code> (or <code>Cmd+K</code>) to open the command palette and quickly navigate to any feature without leaving the keyboard.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Tip 2: Set up notifications wisely',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Go to Settings \u2192 Notifications and customize which alerts matter to you. Reducing noise helps you focus on what\u2019s important.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Tip 3: Automate recurring tasks',
            level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'If you find yourself doing the same thing every week, chances are it can be automated. Check out our <a href="{{company.website}}/automations" style="color:#2563eb;text-decoration:underline;">automations library</a>.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'View All Tips', href: '{{company.website}}/blog/tips',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 10. Weekly / Monthly Usage Report ───────────────────────────────── */

const usageReportBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#f0f9ff;color:#0369a1;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Your Weekly Summary</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#0369a1', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Here\u2019s your {{company.name}} activity this week',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, here\u2019s a snapshot of what you and your team at <b>{{account.name}}</b> accomplished this week.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '[X] tasks', text: 'Completed this week', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
                { imageUrl: '', imageAlt: '', heading: '[Y] hours', text: 'Time saved via automations', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: '[Z] members', text: 'Active team members', buttonLabel: '', buttonUrl: '', buttonColor: '#7c3aed' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>Highlights:</b><br/>\u2022 Your most active project this week: [Project Name]<br/>\u2022 Team member spotlight: [Name] completed the most tasks<br/>\u2022 Suggestion: Try scheduling recurring reports for your stakeholders',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'View Full Report', href: '{{company.website}}/reports/weekly',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 11. Webinar / Event Invitation ──────────────────────────────────── */

const eventInvitationBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'You\u2019re invited: [Event Title]',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, we\u2019re hosting a live session that we think will be valuable for your work at <b>{{account.name}}</b>.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>Event details:</b><br/><br/>\ud83d\udcc5 <b>Date:</b> [Day, Month Date, Year]<br/>\ud83d\udd52 <b>Time:</b> [Time + Timezone]<br/>\ud83d\udccd <b>Where:</b> Online (link sent after registration)<br/>\u23f1 <b>Duration:</b> [X] minutes + Q&A',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>What you\u2019ll learn:</b>',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: 'How to [first learning outcome] to improve results' },
                { text: 'Best practices for [second learning outcome]' },
                { text: 'Live Q&A with the {{company.name}} team' },
            ],
            style: 'arrow' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Register for Free', href: '{{company.website}}/events/register',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Seats are limited. A recording will be sent to all registrants if you can\u2019t attend live.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── RETENTION CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 12. Inactive User Re-engagement ─────────────────────────────────── */

const inactiveReengagementBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'It\u2019s been a while, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'We noticed you haven\u2019t logged in to {{company.name}} recently. Your account and all your data are still there, fully intact. Here\u2019s what\u2019s been happening while you were away:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: 'We shipped [Feature X] \u2014 customers are saving [Y hours] per week with it' },
                { text: 'Your team at {{account.name}} has [Z] pending items waiting for your review' },
                { text: 'Your plan includes features you haven\u2019t tried yet' },
            ],
            style: 'arrow' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Log Back In', href: '{{company.website}}/login',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Is something not working for you? We\u2019d genuinely like to know. Reply to this email and tell us \u2014 it goes straight to our team.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 13. We Miss You (Lapsed User) ───────────────────────────────────── */

const weMissYouBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, we\u2019d love to have you back',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'It\u2019s been a while since you last used {{company.name}}. We understand things change \u2014 but we\u2019ve made meaningful improvements since then, and we think it\u2019s worth another look.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Faster performance', text: 'The entire app is noticeably faster. Page loads, searches, and reports are all improved.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'New features', text: 'We\u2019ve added [Feature A], [Feature B], and a redesigned dashboard based on user feedback.', buttonLabel: '', buttonUrl: '', buttonColor: '#7c3aed' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'As a welcome-back gesture, here\u2019s <b>20% off your next month</b> if you reactivate this week. Use code <b>COMEBACK20</b> at checkout.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: '#fef3c7',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Reactivate My Account', href: '{{company.website}}/reactivate',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 14. Cancellation Prevention (Save Offer) ────────────────────────── */

const cancellationSaveBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Before you go, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'We received your cancellation request for the <b>{{user.plan}}</b> plan at <b>{{account.name}}</b>. We\u2019re sorry to see you go. Before your account is deactivated, we wanted to offer a few options:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Downgrade instead', text: 'Switch to a lower plan rather than cancelling. You keep your data and core features.', buttonLabel: 'View plans', buttonUrl: '{{company.website}}/pricing', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'Pause your account', text: 'Take a break for up to 3 months. We\u2019ll keep everything safe until you\u2019re ready.', buttonLabel: 'Pause', buttonUrl: '{{company.website}}/billing/pause', buttonColor: '#d97706' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#fef2f2', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'If there\u2019s something specific that isn\u2019t working for you, we genuinely want to hear it. Your feedback directly influences what we build next.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Keep My Account Active', href: '{{company.website}}/billing/retain',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'If you\u2019ve already decided, we respect your choice. Your data will remain accessible for 30 days after cancellation.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── EXPANSION CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 15. Usage Limit Warning ─────────────────────────────────────────── */

const usageLimitWarningBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fff7ed;color:#c2410c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Usage Notice</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#c2410c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you\u2019re approaching your plan limit',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Your <b>{{user.plan}}</b> plan at <b>{{account.name}}</b> is nearing its usage limit. This is actually a good sign \u2014 it means your team is getting real value from {{company.name}}.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Current usage', text: '{{user.seatCount}} of {{user.seatLimit}} seats used\nApproaching limit', buttonLabel: '', buttonUrl: '', buttonColor: '#c2410c' },
                { imageUrl: '', imageAlt: '', heading: 'Next plan', text: 'More seats & features\nPriority support\nAdvanced reporting', buttonLabel: 'See pricing', buttonUrl: '{{company.website}}/pricing', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#fff7ed', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
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

/* ── 16. Upgrade Offer / Upsell ──────────────────────────────────────── */

const upgradeOfferBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Unlock more with {{company.name}}, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'You\u2019ve been getting good results on the <b>{{user.plan}}</b> plan. Here\u2019s what upgrading unlocks for your team at <b>{{account.name}}</b>:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Your current plan', text: '{{user.plan}}\n{{user.seatLimit}} seats\n{{account.mrr}}/month\nStandard features', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
                { imageUrl: '', imageAlt: '', heading: 'Recommended plan', text: 'Expanded limits\nPriority support\nAdvanced analytics\nCustom integrations', buttonLabel: 'Compare plans', buttonUrl: '{{company.website}}/pricing', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Upgrade Now', href: '{{company.website}}/billing/upgrade',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Have questions about which plan is right for you? Reply to this email or <a href="{{company.website}}/demo" style="color:#2563eb;text-decoration:underline;">book a quick call</a> with our team.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 17. Premium Feature Teaser (Feature Gating) ─────────────────────── */

const premiumFeatureTeaseBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, you just tried a premium feature',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'We noticed you attempted to use <b>[Feature Name]</b>, which is available on our <b>[Plan Name]</b> plan. Here\u2019s what it does and why teams like <b>{{account.name}}</b> use it:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: '<b>[Benefit 1]</b> \u2014 Save time with automated workflows' },
                { text: '<b>[Benefit 2]</b> \u2014 Get deeper insights with advanced analytics' },
                { text: '<b>[Benefit 3]</b> \u2014 Collaborate more effectively with expanded team tools' },
            ],
            style: 'star' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#d97706', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Unlock This Feature', href: '{{company.website}}/billing/upgrade',
            backgroundColor: '#7c3aed', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Want to try it first? <a href="{{company.website}}/billing/trial-upgrade" style="color:#7c3aed;text-decoration:underline;">Start a 7-day free trial of the [Plan Name] plan</a> \u2014 no commitment required.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 18. Annual Plan Savings ─────────────────────────────────────────── */

const annualSavingsBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Save 2 months free by switching to annual billing',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, you\u2019re currently paying <b>{{account.mrr}}/month</b> on the <b>{{user.plan}}</b> plan at <b>{{account.name}}</b>. By switching to annual billing, you save the equivalent of 2 months \u2014 that\u2019s a 17% discount.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'Monthly', text: '{{account.mrr}}/month\n{{account.arr}}/year\nCancel anytime', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
                { imageUrl: '', imageAlt: '', heading: 'Annual (Save 17%)', text: '2 months free\nPrice lock guarantee\nPriority support', buttonLabel: 'Switch now', buttonUrl: '{{company.website}}/billing/annual', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Switch to Annual & Save', href: '{{company.website}}/billing/annual',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'The switch is prorated \u2014 you only pay the difference. Have questions? Reply to this email.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── REVENUE CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 19. Trial Expiring Soon ─────────────────────────────────────────── */

const trialExpiringSoonBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Your free trial ends in 3 days, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Your trial of {{company.name}} ends soon. Here\u2019s a quick recap of what your team at <b>{{account.name}}</b> has accomplished so far:',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 12, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '{{user.loginFrequencyLast30Days}}', text: 'Logins during trial', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: '{{account.userCount}}', text: 'Team members active', buttonLabel: '', buttonUrl: '', buttonColor: '#7c3aed' },
                { imageUrl: '', imageAlt: '', heading: '{{user.seatCount}}', text: 'Features explored', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(4, 32, 16, 32), backgroundColor: '#eff6ff', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Upgrade now to keep everything \u2014 your data, configurations, and team access. If you don\u2019t upgrade, your account will move to our free tier and some features will be limited.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Choose a Plan', href: '{{company.website}}/pricing',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Not ready? <a href="{{company.website}}/billing/extend-trial" style="color:#2563eb;text-decoration:underline;">Request a 7-day extension</a> \u2014 no commitment.',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 20. Trial Expired \u2014 Convert to Paid ──────────────────────────────── */

const trialExpiredBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Your trial has ended, {{user.firstName}}',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Your free trial of {{company.name}} has expired. Your account has been moved to our free tier, which means some features are now limited. Your data is safe \u2014 nothing has been deleted.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'To restore full access for your team at <b>{{account.name}}</b>, choose a paid plan. You\u2019ll pick up right where you left off.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Upgrade Now', href: '{{company.website}}/billing/upgrade',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Not sure which plan fits? <a href="{{company.website}}/pricing" style="color:#2563eb;text-decoration:underline;">Compare plans</a> or <a href="{{company.website}}/demo" style="color:#2563eb;text-decoration:underline;">book a call</a> with our team.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 21. Payment Receipt / Invoice ───────────────────────────────────── */

const paymentReceiptBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\u2705 Payment Confirmed</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#166534', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Your payment receipt',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, this confirms your payment to {{company.name}} has been processed successfully.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>Invoice details:</b><br/><br/>Account: {{account.name}}<br/>Plan: {{user.plan}}<br/>Amount: {{account.mrr}}<br/>Billing period: Monthly<br/>Next billing date: In {{user.daysUntilRenewal}} days',
            textAlign: 'left', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Download Invoice (PDF)', href: '{{company.website}}/billing/invoices',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Manage your billing at any time from <a href="{{company.website}}/billing" style="color:#2563eb;text-decoration:underline;">your billing settings</a>.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardFooter(),
];

/* ── 22. Payment Failed (Dunning) ────────────────────────────────────── */

const paymentFailedBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef2f2;color:#b91c1c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">Action Required</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#b91c1c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, your payment didn\u2019t go through',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'We tried to charge the card on file for the <b>{{user.plan}}</b> plan at <b>{{account.name}}</b>, but the payment of <b>{{account.mrr}}</b> was declined. This is usually caused by an expired card or a temporary bank hold.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>What happens next:</b><br/>\u2022 We\u2019ll retry the payment in 3 days<br/>\u2022 If unresolved within 7 days, your account will be downgraded<br/>\u2022 Your data remains safe for 30 days regardless',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#fef2f2',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Update Payment Method', href: '{{company.website}}/billing/payment',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Need help? Reply to this email and our billing team will assist you.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 23. Subscription Renewed Confirmation ───────────────────────────── */

const subscriptionRenewedBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Your subscription has been renewed',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, your <b>{{user.plan}}</b> plan for <b>{{account.name}}</b> has been automatically renewed. No action is required on your end.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>Renewal summary:</b><br/><br/>Plan: {{user.plan}}<br/>Amount: {{account.mrr}}/month<br/>Next renewal: In {{user.daysUntilRenewal}} days<br/>Seats: {{user.seatCount}} of {{user.seatLimit}} used',
            textAlign: 'left', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'View Billing Details', href: '{{company.website}}/billing',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Want to change your plan? <a href="{{company.website}}/pricing" style="color:#2563eb;text-decoration:underline;">View all plans</a> or reply to this email.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 24. Plan Changed Confirmation ───────────────────────────────────── */

const planChangedBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Your plan has been updated',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, this confirms that the plan for <b>{{account.name}}</b> has been changed to <b>{{user.plan}}</b>. The changes are effective immediately.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>New plan details:</b><br/><br/>Plan: {{user.plan}}<br/>Amount: {{account.mrr}}/month<br/>Seats included: {{user.seatLimit}}<br/>Next billing date: In {{user.daysUntilRenewal}} days',
            textAlign: 'left', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f0fdf4',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Explore Your New Features', href: '{{company.website}}/features',
            backgroundColor: '#059669', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(8, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── FEEDBACK CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 25. NPS Survey Request ──────────────────────────────────────────── */

const npsSurveyBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, one quick question',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'How likely are you to recommend {{company.name}} to a friend or colleague? Your honest answer helps us improve.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<div style="text-align:center;"><span style="font-size:13px;color:#6b7280;">Not likely</span>&nbsp;&nbsp;&nbsp;<a href="{{company.website}}/nps?score=0" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">0</a> <a href="{{company.website}}/nps?score=1" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">1</a> <a href="{{company.website}}/nps?score=2" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">2</a> <a href="{{company.website}}/nps?score=3" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">3</a> <a href="{{company.website}}/nps?score=4" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">4</a> <a href="{{company.website}}/nps?score=5" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">5</a> <a href="{{company.website}}/nps?score=6" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">6</a> <a href="{{company.website}}/nps?score=7" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#374151;text-decoration:none;font-size:14px;margin:2px;">7</a> <a href="{{company.website}}/nps?score=8" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#2563eb;text-decoration:none;font-size:14px;font-weight:600;margin:2px;border-color:#2563eb;">8</a> <a href="{{company.website}}/nps?score=9" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#059669;text-decoration:none;font-size:14px;font-weight:600;margin:2px;border-color:#059669;">9</a> <a href="{{company.website}}/nps?score=10" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border:1px solid #e5e7eb;border-radius:6px;color:#059669;text-decoration:none;font-size:14px;font-weight:600;margin:2px;border-color:#059669;">10</a>&nbsp;&nbsp;&nbsp;<span style="font-size:13px;color:#6b7280;">Very likely</span></div>',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(8, 16, 16, 16), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Just click a number above \u2014 it takes 2 seconds. Every response is read by our team and influences what we build next.',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 26. CSAT Survey (Post-Support) ──────────────────────────────────── */

const csatSurveyBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'How was your support experience?',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, you recently contacted {{company.name}} support. We\u2019d love to know how it went so we can keep improving.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude1e', text: 'Poor', buttonLabel: 'Rate 1-2', buttonUrl: '{{company.website}}/feedback/csat?score=1', buttonColor: '#dc2626' },
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude10', text: 'Okay', buttonLabel: 'Rate 3', buttonUrl: '{{company.website}}/feedback/csat?score=3', buttonColor: '#d97706' },
                { imageUrl: '', imageAlt: '', heading: '\ud83d\ude0a', text: 'Great', buttonLabel: 'Rate 4-5', buttonUrl: '{{company.website}}/feedback/csat?score=5', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Your feedback is read by our team and directly improves how we support customers like you.',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 27. Feature Request Acknowledgment ──────────────────────────────── */

const featureRequestAckBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'We received your feature request',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, thanks for submitting a feature request to {{company.name}}. We take every suggestion seriously, and yours has been logged and shared with our product team.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>What happens next:</b><br/>\u2022 Your request is reviewed by our product team within 5 business days<br/>\u2022 We\u2019ll notify you if it\u2019s added to our roadmap<br/>\u2022 You can track the status of your requests in your account',
            textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#f8fafc',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'View Your Requests', href: '{{company.website}}/feedback/my-requests',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Want to add more context or vote on other requests? Visit our <a href="{{company.website}}/feedback" style="color:#2563eb;text-decoration:underline;">feedback board</a>.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 28. Product Review Request ──────────────────────────────────────── */

const reviewRequestBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, would you share your experience?',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'You\u2019ve been using {{company.name}} for a while, and we hope it\u2019s been helpful for your team at <b>{{account.name}}</b>. If you have a moment, a short review would mean a lot to us \u2014 and it helps other people like you discover {{company.name}}.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Leave a Review', href: '{{company.website}}/review',
            backgroundColor: '#f97316', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'It only takes 2 minutes. Thank you for helping us grow \u2014 it genuinely makes a difference.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── GROWTH CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 29. Referral Program Invitation ─────────────────────────────────── */

const referralInviteBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Give {{company.name}} to a friend, get rewarded',
            level: 1, textAlign: 'center', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, know someone who\u2019d benefit from {{company.name}}? Refer them using your personal link and you both get rewarded.',
            textAlign: 'center', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: 'They get', text: 'A discount or credit on their first month when they sign up with your link.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: 'You get', text: 'A credit applied to your next billing cycle at {{account.name}}.', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
            ],
            layout: '1-1' as const, gap: 16,
            padding: p(0, 32, 16, 32), backgroundColor: '#eff6ff', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Get My Referral Link', href: '{{company.website}}/referral',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'No limit on referrals. The more friends you bring, the more you save.',
            textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 30. Milestone Celebration (Anniversary / Usage) ─────────────────── */

const milestoneCelebrationBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\ud83c\udf89 Milestone</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#92400e', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Happy anniversary, {{user.firstName}}!',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'One year ago, <b>{{account.name}}</b> joined {{company.name}}. A lot has happened since then \u2014 and your team has accomplished some impressive results.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'columns',
        content: {
            cells: [
                { imageUrl: '', imageAlt: '', heading: '1 year', text: 'As a customer', buttonLabel: '', buttonUrl: '', buttonColor: '#d97706' },
                { imageUrl: '', imageAlt: '', heading: '{{account.userCount}}', text: 'Team members', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
                { imageUrl: '', imageAlt: '', heading: '{{user.loginFrequencyLast30Days}}', text: 'Logins this month', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
            ],
            layout: '1-1-1' as const, gap: 12,
            padding: p(0, 32, 16, 32), backgroundColor: '#fef3c7', verticalAlign: 'top' as const,
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Thank you for trusting {{company.name}} to be part of your workflow. We\u2019re committed to making every year better than the last.',
            textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'View Your Year in Review', href: '{{company.website}}/reports/year-in-review',
            backgroundColor: '#d97706', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(0, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ── 31. Testimonial / Case Study Request ────────────────────────────── */

const testimonialRequestBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: '{{user.firstName}}, would you share your story with us?',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Your team at <b>{{account.name}}</b> has been getting great results with {{company.name}}, and we\u2019d love to feature your experience as a case study. It\u2019s a great way to showcase what your team has accomplished.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>What\u2019s involved:</b>',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'list',
        content: {
            items: [
                { text: 'A 20-minute interview over Zoom at your convenience' },
                { text: 'We handle all the writing and design' },
                { text: 'You review and approve before anything is published' },
                { text: 'Featured on our website with a link to {{account.domain}}' },
            ],
            style: 'arrow' as const, color: '#374151', fontSize: 15, fontFamily: FONT,
            iconColor: '#2563eb', spacing: 10,
            padding: p(0, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'I\u2019m Interested', href: '{{company.website}}/case-study/apply',
            backgroundColor: '#7c3aed', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 8, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Not the right time? No worries at all. We appreciate your business regardless.',
            textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardSocial(),
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 *  ─── UTILITY / TRANSACTIONAL CATEGORY ───
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 32. Password Reset ──────────────────────────────────────────────── */

const passwordResetBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'heading',
        content: {
            text: 'Reset your password',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(8, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, we received a request to reset your {{company.name}} password. Click the button below to choose a new one.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Reset My Password', href: '{{company.website}}/reset-password?token={{user.resetToken}}',
            backgroundColor: '#2563eb', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'center', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 16, 32), containerBg: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'This link expires in 1 hour. If you didn\u2019t request a password reset, you can safely ignore this email. Your password will remain unchanged.',
            textAlign: 'left', fontSize: 13, lineHeight: 1.6, color: '#9ca3af', fontFamily: FONT,
            padding: p(4, 32, 20, 32), backgroundColor: 'transparent',
        },
    },
    standardFooter(),
];

/* ── 33. Security Alert (New Login) ──────────────────────────────────── */

const securityAlertBlocks: EmailBlock[] = [
    { id: sid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
    logoBlock(),
    {
        id: sid(), type: 'text',
        content: {
            html: '<span style="display:inline-block;background:#fef2f2;color:#b91c1c;font-weight:600;font-size:12px;letter-spacing:0.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;">\ud83d\udd12 Security Alert</span>',
            textAlign: 'left', fontSize: 12, lineHeight: 1.4, color: '#b91c1c', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'heading',
        content: {
            text: 'New sign-in to your account',
            level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
            padding: p(4, 32, 4, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: 'Hi {{user.firstName}}, we detected a new sign-in to your {{company.name}} account. If this was you, no action is needed.',
            textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 16, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>Sign-in details:</b><br/><br/>Date: [Date & Time]<br/>Device: [Device / Browser]<br/>Location: [City, Country]<br/>IP Address: [IP]',
            textAlign: 'left', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
            padding: p(0, 32, 16, 32), backgroundColor: '#fef2f2',
        },
    },
    {
        id: sid(), type: 'text',
        content: {
            html: '<b>If this wasn\u2019t you</b>, secure your account immediately:',
            textAlign: 'left', fontSize: 15, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
            padding: p(4, 32, 8, 32), backgroundColor: 'transparent',
        },
    },
    {
        id: sid(), type: 'button',
        content: {
            text: 'Secure My Account', href: '{{company.website}}/security',
            backgroundColor: '#dc2626', textColor: '#ffffff',
            borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
            align: 'left', fullWidth: false, fontFamily: FONT,
            containerPadding: p(4, 32, 20, 32), containerBg: 'transparent',
        },
    },
    standardFooter(),
];

/* ═══════════════════════════════════════════════════════════════════════
 * EXPORTED SAAS CUSTOMER JOURNEY TEMPLATE CATALOGUE
 * ═══════════════════════════════════════════════════════════════════════ */

export const SAAS_TEMPLATES: EmailTemplate[] = [
    /* ── Onboarding (4) ────────────────────── */
    {
        id: 'tpl_saas_welcome_signup',
        name: 'Welcome Email (New Signup)',
        subject: 'Welcome to {{company.name}}, {{user.firstName}}!',
        preheaderText: 'Your account is ready. Here\u2019s how to get started.',
        category: 'onboarding',
        blocks: welcomeSignupBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_email_verification',
        name: 'Email Verification',
        subject: 'Verify your email for {{company.name}}',
        preheaderText: 'Confirm your email address to activate your account.',
        category: 'onboarding',
        blocks: emailVerificationBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_team_invite',
        name: 'Team Invitation',
        subject: '{{account.primaryContact}} invited you to {{company.name}}',
        preheaderText: 'Join your team on {{company.name}}. Accept in one click.',
        category: 'onboarding',
        blocks: teamInviteBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_getting_started',
        name: 'Getting Started Guide',
        subject: 'Get started with {{company.name}} in 3 simple steps',
        preheaderText: 'Follow these steps to get the most out of your account.',
        category: 'onboarding',
        blocks: gettingStartedBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Activation (3) ────────────────────── */
    {
        id: 'tpl_saas_setup_incomplete',
        name: 'Setup Incomplete Reminder',
        subject: '{{user.firstName}}, you\u2019re almost set up',
        preheaderText: 'Finish your setup to start getting value.',
        category: 'activation',
        blocks: setupIncompleteBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_first_achievement',
        name: 'First Achievement Celebration',
        subject: '\u2705 Nice work, {{user.firstName}} \u2014 you hit your first milestone!',
        preheaderText: 'You just completed a key step. Here\u2019s what to do next.',
        category: 'activation',
        blocks: firstAchievementBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_personalized_recs',
        name: 'Personalized Recommendations',
        subject: '{{user.firstName}}, features we recommend for you',
        preheaderText: 'Based on your usage, here are features worth trying.',
        category: 'activation',
        blocks: personalizedRecsBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Engagement (4) ────────────────────── */
    {
        id: 'tpl_saas_feature_announcement',
        name: 'New Feature Announcement',
        subject: 'New in {{company.name}}: [Feature Name]',
        preheaderText: 'We just shipped something your team will love.',
        category: 'engagement',
        blocks: featureAnnouncementBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_product_tips',
        name: 'Product Tips & Best Practices',
        subject: '3 tips to get more from {{company.name}}',
        preheaderText: 'Practical tips our most successful users apply regularly.',
        category: 'engagement',
        blocks: productTipsBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_usage_report',
        name: 'Weekly / Monthly Usage Report',
        subject: 'Your {{company.name}} activity this week, {{user.firstName}}',
        preheaderText: 'A snapshot of what your team accomplished this week.',
        category: 'engagement',
        blocks: usageReportBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_event_invitation',
        name: 'Webinar / Event Invitation',
        subject: 'You\u2019re invited: [Event Title]',
        preheaderText: 'Join our live session and learn something valuable.',
        category: 'engagement',
        blocks: eventInvitationBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Retention (3) ─────────────────────── */
    {
        id: 'tpl_saas_inactive_reengagement',
        name: 'Inactive User Re-engagement',
        subject: 'It\u2019s been a while, {{user.firstName}}',
        preheaderText: 'Your account is waiting. Here\u2019s what\u2019s new.',
        category: 'retention',
        blocks: inactiveReengagementBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_we_miss_you',
        name: 'We Miss You (Win-Back)',
        subject: '{{user.firstName}}, we\u2019d love to have you back',
        preheaderText: 'A lot has improved. Plus a welcome-back offer inside.',
        category: 'retention',
        blocks: weMissYouBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_cancellation_save',
        name: 'Cancellation Prevention',
        subject: 'Before you go, {{user.firstName}}',
        preheaderText: 'We have some options before your account is closed.',
        category: 'retention',
        blocks: cancellationSaveBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Expansion (4) ─────────────────────── */
    {
        id: 'tpl_saas_usage_limit',
        name: 'Usage Limit Warning',
        subject: '{{user.firstName}}, you\u2019re approaching your plan limit',
        preheaderText: 'You\u2019re nearing your usage cap. Upgrade before it\u2019s full.',
        category: 'expansion',
        blocks: usageLimitWarningBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_upgrade_offer',
        name: 'Upgrade Offer',
        subject: 'Unlock more with {{company.name}}, {{user.firstName}}',
        preheaderText: 'See what upgrading unlocks for your team.',
        category: 'expansion',
        blocks: upgradeOfferBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_premium_feature_tease',
        name: 'Premium Feature Teaser',
        subject: '{{user.firstName}}, you just tried a premium feature',
        preheaderText: 'Unlock this feature and more on a higher plan.',
        category: 'expansion',
        blocks: premiumFeatureTeaseBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_annual_savings',
        name: 'Annual Plan Savings',
        subject: 'Save 2 months free by switching to annual billing',
        preheaderText: 'Lock in your rate and save 17% on {{company.name}}.',
        category: 'expansion',
        blocks: annualSavingsBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Revenue (6) ───────────────────────── */
    {
        id: 'tpl_saas_trial_expiring',
        name: 'Trial Expiring Soon',
        subject: 'Your free trial ends in 3 days, {{user.firstName}}',
        preheaderText: 'Upgrade to keep your data and team access.',
        category: 'revenue',
        blocks: trialExpiringSoonBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_trial_expired',
        name: 'Trial Expired',
        subject: 'Your trial has ended, {{user.firstName}}',
        preheaderText: 'Upgrade now to restore full access.',
        category: 'revenue',
        blocks: trialExpiredBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_payment_receipt',
        name: 'Payment Receipt',
        subject: 'Payment confirmed for {{account.name}}',
        preheaderText: 'Your payment was processed. Download your invoice.',
        category: 'revenue',
        blocks: paymentReceiptBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_payment_failed',
        name: 'Payment Failed (Dunning)',
        subject: 'Action required: Payment failed for {{account.name}}',
        preheaderText: 'Your payment was declined. Update your card now.',
        category: 'revenue',
        blocks: paymentFailedBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_subscription_renewed',
        name: 'Subscription Renewed',
        subject: 'Your {{user.plan}} subscription has been renewed',
        preheaderText: 'Your plan has been automatically renewed. Details inside.',
        category: 'revenue',
        blocks: subscriptionRenewedBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_plan_changed',
        name: 'Plan Change Confirmation',
        subject: 'Your plan has been updated to {{user.plan}}',
        preheaderText: 'Your new plan is active. Explore your new features.',
        category: 'revenue',
        blocks: planChangedBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Feedback (4) ──────────────────────── */
    {
        id: 'tpl_saas_nps_survey',
        name: 'NPS Survey',
        subject: '{{user.firstName}}, one quick question about {{company.name}}',
        preheaderText: 'How likely are you to recommend us? Click a number.',
        category: 'feedback',
        blocks: npsSurveyBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_csat_survey',
        name: 'CSAT Survey (Post-Support)',
        subject: 'How was your support experience, {{user.firstName}}?',
        preheaderText: 'Rate your recent interaction in one click.',
        category: 'feedback',
        blocks: csatSurveyBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_feature_request_ack',
        name: 'Feature Request Acknowledgment',
        subject: 'We received your feature request, {{user.firstName}}',
        preheaderText: 'Your request has been logged and shared with our team.',
        category: 'feedback',
        blocks: featureRequestAckBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_review_request',
        name: 'Product Review Request',
        subject: '{{user.firstName}}, would you share your experience?',
        preheaderText: 'A 2-minute review helps others discover us.',
        category: 'feedback',
        blocks: reviewRequestBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Growth (3) ────────────────────────── */
    {
        id: 'tpl_saas_referral_invite',
        name: 'Referral Program',
        subject: 'Refer a friend to {{company.name}} and get rewarded',
        preheaderText: 'Share your link. You both get a reward.',
        category: 'growth',
        blocks: referralInviteBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_milestone_celebration',
        name: 'Milestone Celebration',
        subject: '\ud83c\udf89 Happy anniversary, {{user.firstName}}!',
        preheaderText: 'Celebrating your journey with {{company.name}}.',
        category: 'growth',
        blocks: milestoneCelebrationBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_testimonial_request',
        name: 'Case Study / Testimonial Request',
        subject: '{{user.firstName}}, would you share your story?',
        preheaderText: 'We\u2019d love to feature {{account.name}} as a success story.',
        category: 'growth',
        blocks: testimonialRequestBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },

    /* ── Utility / Transactional (2) ───────── */
    {
        id: 'tpl_saas_password_reset',
        name: 'Password Reset',
        subject: 'Reset your {{company.name}} password',
        preheaderText: 'You requested a password reset. Click to continue.',
        category: 'utility',
        blocks: passwordResetBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
    {
        id: 'tpl_saas_security_alert',
        name: 'Security Alert (New Login)',
        subject: 'New sign-in to your {{company.name}} account',
        preheaderText: 'We detected a new sign-in. Was this you?',
        category: 'utility',
        blocks: securityAlertBlocks,
        globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    },
];
