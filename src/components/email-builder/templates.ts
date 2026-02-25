/* ==========================================================================
 * Email Builder — Professional SaaS Email Templates
 *
 * 11 production-ready, revenue-focused email templates designed for real
 * SaaS lifecycle use cases. Every template uses platform variables from
 * the SDK data model (user, account, lifecycle, system).
 *
 * Templates follow email-marketing best practices:
 *  - Single primary CTA above the fold
 *  - Preheader text for inbox preview
 *  - Mobile-responsive structure (single column, 600px max)
 *  - CAN-SPAM compliant footer with unsubscribe
 *  - Personalization via {{variable}} merge tags
 *  - Concise, scannable copy
 * ========================================================================== */

import type { EmailTemplate, EmailBlock } from './types';
import { DEFAULT_GLOBAL_STYLES } from './types';

/* ── Helpers ─────────────────────────────────────────────────────────── */

let _seq = 0;
function bid() { return `tpl_${++_seq}_${Math.random().toString(36).slice(2, 6)}`; }

const FONT = 'Arial, Helvetica, sans-serif';
const pad = (t: number, r: number, b: number, l: number) => ({ top: t, right: r, bottom: b, left: l });

/* ═══════════════════════════════════════════════════════════════════════
 * 1. TRIAL WELCOME — Onboarding first-touch
 * ═══════════════════════════════════════════════════════════════════════ */

const trialWelcomeBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'image',
    content: {
      src: '{{company.website}}/logo.png', alt: '{{company.name}}',
      href: '{{company.website}}', width: 40, align: 'left',
      padding: pad(24, 32, 16, 32), backgroundColor: 'transparent', borderRadius: 0,
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Welcome aboard, {{user.firstName}}!',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(8, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Your <b>14-day free trial</b> of {{company.name}} is now active. You have full access to every feature \u2014 no credit card required until you decide to upgrade.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Start Your Setup (\u22482 min)', href: '{{company.website}}/onboarding',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(4, 32, 24, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'divider',
    content: {
      color: '#e5e7eb', thickness: 1, width: 100, style: 'solid' as const,
      padding: pad(0, 32, 0, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Get value in 3 steps',
      level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(24, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: '1. Install the SDK', text: 'Drop in our lightweight snippet to start tracking real user events and lifecycle changes.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: '2. Define Segments', text: 'Group users by lifecycle stage, plan tier, usage, or any custom property from your app.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: '3. Launch Flows', text: 'Build automated email sequences triggered by real events \u2014 trial start, churn risk, expansion signals.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
      ],
      layout: '1-1-1' as const, gap: 16,
      padding: pad(0, 32, 24, 32), backgroundColor: 'transparent', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Questions? Reply directly to this email \u2014 it goes straight to our team, not a queue. Or check our <a href="{{company.website}}/docs" style="color:#2563eb;text-decoration:underline;">documentation</a>.',
      textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'social',
    content: {
      links: [
        { platform: 'twitter', url: 'https://twitter.com/', label: 'Twitter' },
        { platform: 'linkedin', url: 'https://linkedin.com/', label: 'LinkedIn' },
      ],
      iconSize: 20, align: 'center' as const, color: '#9ca3af',
      padding: pad(16, 32, 8, 32), backgroundColor: '#f9fafb',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(8, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 2. ACTIVATION NUDGE — Day 3 incomplete setup
 * ═══════════════════════════════════════════════════════════════════════ */

const activationNudgeBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: '{{user.firstName}}, you\'re almost there',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'You signed up for {{company.name}} <b>3 days ago</b> but haven\'t completed your setup. Teams that finish onboarding in the first week see <b>3x more value</b> from the platform.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<b>Here\'s what\'s left:</b><br/><br/>\u2705 Account created<br/>\u2705 Email verified<br/>\u2b1c Connect your data source<br/>\u2b1c Create your first segment<br/>\u2b1c Launch your first flow',
      textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: '#f0f9ff',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Complete Setup Now', href: '{{company.website}}/onboarding',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 16, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Need a hand? <a href="{{company.website}}/demo" style="color:#2563eb;text-decoration:underline;">Book a 15-minute walkthrough</a> with our team. No sales pitch \u2014 just help.',
      textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 3. CHURN PREVENTION — Re-engagement for at-risk users
 * ═══════════════════════════════════════════════════════════════════════ */

const churnPreventionBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'We noticed you\'ve been away, {{user.firstName}}',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'It\'s been <b>{{user.lastLoginDaysAgo}} days</b> since your last login to {{company.name}}. Your <b>{{user.plan}}</b> plan at <b>{{account.name}}</b> is still fully active, and we\'ve shipped some updates we think you\'ll love.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: 'New: Smart Segments', text: 'Auto-updating segments based on real-time user behavior and lifecycle stage.', buttonLabel: 'Try it', buttonUrl: '{{company.website}}/segments', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: 'Improved Flows', text: 'Visual flow builder with A/B testing, branching logic, and revenue attribution.', buttonLabel: 'Explore', buttonUrl: '{{company.website}}/flows', buttonColor: '#2563eb' },
      ],
      layout: '1-1' as const, gap: 16,
      padding: pad(8, 32, 16, 32), backgroundColor: '#fef3c7', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Log Back In', href: '{{company.website}}/dashboard',
      backgroundColor: '#dc2626', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 16, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'If there\'s something we can improve, just reply to this email. Your feedback goes directly to our product team.',
      textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe from these emails',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 4. EXPANSION / UPGRADE — Seat-based upsell
 * ═══════════════════════════════════════════════════════════════════════ */

const expansionBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: '{{user.firstName}}, your team is growing fast',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<b>{{account.name}}</b> is using <b>{{user.seatCount}} of {{user.seatLimit}}</b> available seats on the <b>{{user.plan}}</b> plan. At this pace, you\'ll hit your limit soon.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: 'Current Plan', text: '{{user.plan}}\n{{user.mrr}}/month\n{{user.seatLimit}} seats included', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
        { imageUrl: '', imageAlt: '', heading: 'Recommended: Business', text: 'Unlimited seats\nPriority support\nAdvanced analytics\nCustom integrations', buttonLabel: 'Compare Plans', buttonUrl: '{{company.website}}/pricing', buttonColor: '#059669' },
      ],
      layout: '1-1' as const, gap: 16,
      padding: pad(8, 32, 16, 32), backgroundColor: '#f0fdf4', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Upgrade Now \u2014 Save 20%', href: '{{company.website}}/billing/upgrade?promo=GROWTH20',
      backgroundColor: '#059669', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'center', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 8, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<span style="color:#059669;font-weight:600;">Limited offer:</span> Upgrade this week and lock in 20% off your first 3 months. That\'s a savings of over $300.',
      textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 5. FEATURE ADOPTION — Drive usage of underused feature
 * ═══════════════════════════════════════════════════════════════════════ */

const featureAdoptionBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'You\'re missing out on Automations, {{user.firstName}}',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Teams on the <b>{{user.plan}}</b> plan like <b>{{account.name}}</b> who use Automations retain <b>2.4x more users</b> and generate <b>40% more expansion revenue</b>. You haven\'t set one up yet.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'image',
    content: {
      src: '{{company.website}}/images/automations-preview.png', alt: 'Automations dashboard preview',
      href: '{{company.website}}/flows', width: 100, align: 'center',
      padding: pad(8, 32, 16, 32), backgroundColor: 'transparent', borderRadius: 8,
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<b>What you can automate:</b><br/><br/>\u2022 Welcome sequences for new trial users<br/>\u2022 Churn prevention for at-risk accounts<br/>\u2022 Expansion nudges when usage spikes<br/>\u2022 NPS follow-ups based on score<br/>\u2022 Contract renewal reminders',
      textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Create Your First Automation', href: '{{company.website}}/flows/new',
      backgroundColor: '#7c3aed', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(4, 32, 24, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 6. TRIAL EXPIRY WARNING — 3 days before trial ends
 * ═══════════════════════════════════════════════════════════════════════ */

const trialExpiryBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Your trial ends in 3 days, {{user.firstName}}',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Your free trial of {{company.name}} expires on <b>{{user.trialEndDate}}</b>. Here\'s what your team at <b>{{account.name}}</b> has accomplished so far:',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: '{{user.loginFrequencyLast30Days}}', text: 'Team logins this month', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: '{{account.userCount}}', text: 'Team members onboarded', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: '{{user.seatCount}}', text: 'Active seats used', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
      ],
      layout: '1-1-1' as const, gap: 12,
      padding: pad(8, 32, 16, 32), backgroundColor: '#eff6ff', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Upgrade now to keep everything \u2014 your data, segments, flows, and team access. If you don\'t upgrade by {{user.trialEndDate}}, your account will be moved to the free tier.',
      textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Choose a Plan & Upgrade', href: '{{company.website}}/billing/upgrade',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'center', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(4, 32, 8, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Not ready yet? <a href="{{company.website}}/billing/extend" style="color:#2563eb;text-decoration:underline;">Request a 7-day extension</a> \u2014 no strings attached.',
      textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 7. NPS FOLLOW-UP — Context-aware response to survey
 * ═══════════════════════════════════════════════════════════════════════ */

const npsFollowUpBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Thanks for the feedback, {{user.firstName}}',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'You rated {{company.name}} a <b>{{user.npsScore}} out of 10</b>. We take every response seriously \u2014 here\'s how your score translates into action on our end.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<b>If you scored 9-10 (Promoter):</b> We\'d be honored if you shared your experience. A quick review helps other teams like {{account.name}} discover us.<br/><br/><b>If you scored 7-8 (Passive):</b> We\'re close \u2014 what would make us a 10? Reply and tell us.<br/><br/><b>If you scored 0-6 (Detractor):</b> We hear you. Our head of customer success will reach out personally within 24 hours.',
      textAlign: 'left', fontSize: 15, lineHeight: 1.7, color: '#374151', fontFamily: FONT,
      padding: pad(8, 32, 16, 32), backgroundColor: '#f0fdf4',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Leave a Review on G2', href: 'https://www.g2.com/',
      backgroundColor: '#f97316', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 8, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Your score directly influences our product roadmap. Thank you for helping us improve.',
      textAlign: 'left', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 8. CONTRACT RENEWAL — 30-day proactive reminder
 * ═══════════════════════════════════════════════════════════════════════ */

const contractRenewalBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Your renewal is coming up, {{user.firstName}}',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'The <b>{{user.plan}}</b> plan for <b>{{account.name}}</b> renews in <b>{{user.daysUntilRenewal}} days</b> at <b>{{account.mrr}}/month</b> ({{account.arr}}/year). No action is needed if you want to continue as-is.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: 'Current Plan', text: '{{user.plan}}\n{{account.mrr}}/month\n{{user.seatLimit}} seats', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
        { imageUrl: '', imageAlt: '', heading: 'Usage Summary', text: '{{account.userCount}} team members\n{{user.seatCount}} active seats\nHealth: {{account.health}}', buttonLabel: '', buttonUrl: '', buttonColor: '#6b7280' },
      ],
      layout: '1-1' as const, gap: 16,
      padding: pad(4, 32, 16, 32), backgroundColor: '#f8fafc', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<b>Options before renewal:</b><br/>\u2022 <a href="{{company.website}}/billing/upgrade" style="color:#2563eb;text-decoration:underline;">Upgrade</a> to unlock more seats or premium features<br/>\u2022 <a href="{{company.website}}/billing" style="color:#2563eb;text-decoration:underline;">Update billing</a> info or payment method<br/>\u2022 <a href="{{company.website}}/billing/annual" style="color:#2563eb;text-decoration:underline;">Switch to annual</a> and save 17%',
      textAlign: 'left', fontSize: 15, lineHeight: 1.8, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Review Billing & Renew', href: '{{company.website}}/billing',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(4, 32, 24, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 9. PRODUCT UPDATE / CHANGELOG — Monthly feature roundup
 * ═══════════════════════════════════════════════════════════════════════ */

const productUpdateBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'image',
    content: {
      src: '{{company.website}}/logo.png', alt: '{{company.name}}',
      href: '{{company.website}}', width: 40, align: 'left',
      padding: pad(24, 32, 8, 32), backgroundColor: 'transparent', borderRadius: 0,
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: '<span style="color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Product Update \u2022 {{system.currentYear}}</span>',
      textAlign: 'left', fontSize: 13, lineHeight: 1.4, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'What\'s new this month',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(4, 32, 8, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Hi {{user.firstName}}, here\'s what the team shipped this month to help teams like <b>{{account.name}}</b> grow faster.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: '\ud83d\ude80 Revenue Attribution',
      level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(8, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'See exactly how much revenue each email flow, campaign, and touchpoint generates. No more guessing \u2014 tie every dollar back to the action that drove it.',
      textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: '\u2728 Visual Email Builder',
      level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(8, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Drag-and-drop email builder with 10 professional templates, live preview, mobile optimization, and one-click variable personalization from your SDK data.',
      textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 12, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'heading',
    content: {
      text: '\ud83d\udcca Smart Segments v2',
      level: 2, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(8, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Segments now auto-refresh in real time. Combine lifecycle stage, plan tier, engagement score, and custom events for laser-targeted automations.',
      textAlign: 'left', fontSize: 15, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(4, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'See Full Changelog', href: '{{company.website}}/changelog',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'left', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 24, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'social',
    content: {
      links: [
        { platform: 'twitter', url: 'https://twitter.com/', label: 'Twitter' },
        { platform: 'linkedin', url: 'https://linkedin.com/', label: 'LinkedIn' },
      ],
      iconSize: 20, align: 'center' as const, color: '#9ca3af',
      padding: pad(16, 32, 8, 32), backgroundColor: '#f9fafb',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe from product updates',
      padding: pad(8, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 10. REFERRAL PROGRAM — Turn promoters into revenue
 * ═══════════════════════════════════════════════════════════════════════ */

const referralBlocks: EmailBlock[] = [
  { id: bid(), type: 'spacer', content: { height: 8, backgroundColor: 'transparent' } },
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Give $100, get $100',
      level: 1, textAlign: 'center', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 4, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Hey {{user.firstName}} \u2014 you scored us a <b>{{user.npsScore}}/10</b>. We\'re flattered! If you know another team that could benefit from {{company.name}}, here\'s a thank-you offer:',
      textAlign: 'center', fontSize: 16, lineHeight: 1.65, color: '#374151', fontFamily: FONT,
      padding: pad(8, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'columns',
    content: {
      cells: [
        { imageUrl: '', imageAlt: '', heading: 'They Get', text: '$100 credit on their first invoice when they sign up with your link.', buttonLabel: '', buttonUrl: '', buttonColor: '#2563eb' },
        { imageUrl: '', imageAlt: '', heading: 'You Get', text: '$100 credit applied to your next billing cycle at {{account.name}}.', buttonLabel: '', buttonUrl: '', buttonColor: '#059669' },
      ],
      layout: '1-1' as const, gap: 16,
      padding: pad(4, 32, 16, 32), backgroundColor: '#eff6ff', verticalAlign: 'top' as const,
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Get Your Referral Link', href: '{{company.website}}/referral',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 40,
      align: 'center', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 8, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'No limits on referrals. The more teams you bring, the more you save. Credits stack and never expire.',
      textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: '#6b7280', fontFamily: FONT,
      padding: pad(4, 32, 24, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * 11. BLANK — Minimal starting point
 * ═══════════════════════════════════════════════════════════════════════ */

const blankBlocks: EmailBlock[] = [
  {
    id: bid(), type: 'heading',
    content: {
      text: 'Your Heading Here',
      level: 1, textAlign: 'left', color: '#111827', fontFamily: FONT,
      padding: pad(32, 32, 8, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'text',
    content: {
      html: 'Start writing your email content here. Use <b>bold</b>, <i>italic</i>, and <a href="#" style="color:#2563eb;">links</a>. Insert personalization variables like {{user.firstName}} from the panel on the right.',
      textAlign: 'left', fontSize: 16, lineHeight: 1.6, color: '#374151', fontFamily: FONT,
      padding: pad(8, 32, 16, 32), backgroundColor: 'transparent',
    },
  },
  {
    id: bid(), type: 'button',
    content: {
      text: 'Call to Action', href: 'https://',
      backgroundColor: '#2563eb', textColor: '#ffffff',
      borderRadius: 6, fontSize: 16, paddingV: 14, paddingH: 36,
      align: 'center', fullWidth: false, fontFamily: FONT,
      containerPadding: pad(8, 32, 24, 32), containerBg: 'transparent',
    },
  },
  {
    id: bid(), type: 'footer',
    content: {
      html: '\u00a9 {{system.currentYear}} {{company.name}} \u00b7 {{company.address}}',
      textAlign: 'center' as const, fontSize: 12, color: '#9ca3af',
      showUnsubscribe: true, unsubscribeText: 'Unsubscribe',
      padding: pad(24, 32, 24, 32), backgroundColor: '#f9fafb',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
 * EXPORTED TEMPLATE CATALOGUE
 * ═══════════════════════════════════════════════════════════════════════ */

export const STARTER_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_blank',
    name: 'Blank',
    subject: '',
    preheaderText: '',
    blocks: blankBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_trial_welcome',
    name: 'Trial Welcome',
    subject: 'Welcome to {{company.name}}, {{user.firstName}}!',
    preheaderText: 'Your 14-day free trial is active \u2014 here\'s how to get started.',
    blocks: trialWelcomeBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_activation_nudge',
    name: 'Activation Nudge',
    subject: '{{user.firstName}}, finish setup to unlock full value',
    preheaderText: 'You\'re almost there \u2014 3 steps left to complete.',
    blocks: activationNudgeBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_churn_prevention',
    name: 'Churn Prevention',
    subject: 'We miss you, {{user.firstName}} \u2014 here\'s what\'s new',
    preheaderText: 'We\'ve shipped updates since your last visit.',
    blocks: churnPreventionBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_expansion',
    name: 'Expansion / Upgrade',
    subject: '{{user.firstName}}, your team is almost at capacity',
    preheaderText: 'Upgrade now and save 20% for 3 months.',
    blocks: expansionBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_feature_adoption',
    name: 'Feature Adoption',
    subject: 'You haven\'t tried Automations yet, {{user.firstName}}',
    preheaderText: 'Teams using Automations retain 2.4x more users.',
    blocks: featureAdoptionBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_trial_expiry',
    name: 'Trial Expiry Warning',
    subject: 'Your trial ends in 3 days, {{user.firstName}}',
    preheaderText: 'Upgrade to keep your data, segments, and flows.',
    blocks: trialExpiryBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_nps_followup',
    name: 'NPS Follow-Up',
    subject: 'Thanks for the feedback, {{user.firstName}}',
    preheaderText: 'Your score directly influences our roadmap.',
    blocks: npsFollowUpBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_contract_renewal',
    name: 'Contract Renewal',
    subject: 'Your {{user.plan}} plan renews in {{user.daysUntilRenewal}} days',
    preheaderText: 'Review your plan and billing before renewal.',
    blocks: contractRenewalBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_product_update',
    name: 'Product Update',
    subject: 'What\'s new at {{company.name}} this month',
    preheaderText: 'Revenue attribution, email builder, smart segments & more.',
    blocks: productUpdateBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
  {
    id: 'tpl_referral',
    name: 'Referral Program',
    subject: 'Give $100, get $100 \u2014 refer a team to {{company.name}}',
    preheaderText: 'Earn credits for every team you refer. No limits.',
    blocks: referralBlocks,
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  },
];
