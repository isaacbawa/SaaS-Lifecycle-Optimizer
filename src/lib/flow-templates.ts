/* ==========================================================================
 * Flow Templates — SaaS Customer Journey Automations
 *
 * Production-ready flow templates that SaaS owners can customize to
 * automate communications with THEIR end users across every stage of
 * the customer lifecycle.
 *
 * Perspective:
 *   {{company.name}}  = The SaaS owner's product
 *   {{user.name}}     = The end user of that SaaS product
 *   {{user.email}}    = The end user's email
 *   {{account.name}}  = The end user's organization
 *
 * Each template includes:
 *  - Complete node graph (trigger → actions → conditions → delays → exit)
 *  - Proper edge wiring with condition branches
 *  - Relevant flow variables
 *  - Sensible settings (quiet hours, enrollment caps, goal events)
 *  - Categorization for easy discovery
 *
 * Categories:
 *  onboarding   — Welcome, setup, team invite, getting started
 *  activation   — Feature adoption, aha moment, setup completion
 *  engagement   — Tips, usage reports, feature announcements, events
 *  retention    — Re-engagement, win-back, churn prevention
 *  expansion    — Upgrade, upsell, seat limit, annual plan
 *  revenue      — Trial conversion, dunning, renewal reminders
 *  feedback     — NPS, CSAT, review requests
 *  growth       — Referral, milestone celebrations
 *  transactional — Password reset, security alerts
 * ========================================================================== */

import type {
    FlowDefinition,
    FlowNodeDef,
    FlowEdgeDef,
    FlowVariable,
    FlowSettings,
    FlowMetrics,
} from '@/lib/definitions';

/* ── Template Category Type ──────────────────────────────────────────── */

export type FlowTemplateCategory =
    | 'onboarding'
    | 'activation'
    | 'engagement'
    | 'retention'
    | 'expansion'
    | 'revenue'
    | 'feedback'
    | 'growth'
    | 'transactional';

export interface FlowTemplateCategoryMeta {
    id: FlowTemplateCategory;
    label: string;
    description: string;
    color: string;
    icon: string; // lucide icon name
}

export const FLOW_TEMPLATE_CATEGORIES: FlowTemplateCategoryMeta[] = [
    { id: 'onboarding', label: 'Onboarding', description: 'Welcome & setup flows', color: '#2563eb', icon: 'rocket' },
    { id: 'activation', label: 'Activation', description: 'Drive feature adoption', color: '#7c3aed', icon: 'sparkles' },
    { id: 'engagement', label: 'Engagement', description: 'Keep users active & informed', color: '#059669', icon: 'activity' },
    { id: 'retention', label: 'Retention', description: 'Prevent churn & win back users', color: '#dc2626', icon: 'shield' },
    { id: 'expansion', label: 'Expansion', description: 'Upsell & cross-sell', color: '#d97706', icon: 'trending-up' },
    { id: 'revenue', label: 'Revenue', description: 'Trial conversion & billing', color: '#0891b2', icon: 'dollar-sign' },
    { id: 'feedback', label: 'Feedback', description: 'Surveys & review requests', color: '#be185d', icon: 'message-circle' },
    { id: 'growth', label: 'Growth', description: 'Referrals & advocacy', color: '#ea580c', icon: 'users' },
    { id: 'transactional', label: 'Transactional', description: 'Security & account alerts', color: '#64748b', icon: 'lock' },
];

/* ── Extended Template Type ──────────────────────────────────────────── */

export interface FlowTemplate {
    id: string;
    name: string;
    description: string;
    category: FlowTemplateCategory;
    trigger: string;
    /** The nodes, edges, variables, and settings that will be cloned into a new flow */
    nodes: FlowNodeDef[];
    edges: FlowEdgeDef[];
    variables: FlowVariable[];
    settings: FlowSettings;
    /** Expected goal event */
    goalEvent?: string;
    /** Estimated completion time in minutes */
    estimatedSetupMinutes?: number;
    /** Tags for search */
    tags: string[];
}

/* ── Default Settings ────────────────────────────────────────────────── */

const defaultSettings: FlowSettings = {
    enrollmentCap: 0,
    maxConcurrentEnrollments: 5000,
    autoExitDays: 30,
    respectQuietHours: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursTimezone: 'UTC',
    priority: 5,
};

/* ═══════════════════════════════════════════════════════════════════════
 *  ONBOARDING — Welcome & Setup Flows
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. Welcome & Getting Started Series ─────────────────────────────── */

const welcomeSeriesTemplate: FlowTemplate = {
    id: 'ftpl_welcome_series',
    name: 'Welcome & Getting Started Series',
    description: 'Comprehensive 5-day onboarding series that welcomes new users, guides them through setup, and ensures they reach their first value moment.',
    category: 'onboarding',
    trigger: 'User signs up',
    tags: ['welcome', 'onboarding', 'setup', 'new user', 'day 1'],
    estimatedSetupMinutes: 15,
    goalEvent: 'onboarding_completed',
    settings: { ...defaultSettings, goalEvent: 'onboarding_completed', goalTimeout: 10080, priority: 9 },
    variables: [
        { key: 'user_plan', label: 'User Plan', type: 'string', source: 'user_property', sourceField: 'plan' },
        { key: 'setup_complete', label: 'Setup Complete', type: 'boolean', defaultValue: false },
    ],
    nodes: [
        {
            id: 'n1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'New User Signup',
                description: 'Fires when a new user creates an account',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'user_signed_up', allowReEntry: false },
            },
        },
        {
            id: 'n2', type: 'action', position: { x: 400, y: 180 },
            data: {
                label: 'Welcome Email',
                description: 'Send welcome email with quick-start guide',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Welcome to {{company.name}}, {{user.name}}!',
                    emailBody: 'Hi {{user.name}},\n\nThanks for signing up for {{company.name}}! Your account is ready.\n\nHere\'s how to get started:\n1. Complete your profile\n2. Create your first project\n3. Invite your team\n\nLet\'s go →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'n3', type: 'action', position: { x: 400, y: 310 },
            data: {
                label: 'Tag: Onboarding',
                nodeType: 'action',
                actionConfig: { kind: 'add_tag', tag: 'onboarding-active' },
            },
        },
        {
            id: 'n4', type: 'delay', position: { x: 400, y: 420 },
            data: {
                label: 'Wait 1 Day',
                nodeType: 'delay',
                delayConfig: { kind: 'fixed_duration', durationMinutes: 1440 },
            },
        },
        {
            id: 'n5', type: 'condition', position: { x: 400, y: 550 },
            data: {
                label: 'Profile Complete?',
                description: 'Check if user completed their profile setup',
                nodeType: 'condition',
                conditionConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.profile_completed', operator: 'equals', value: true }],
                },
            },
        },
        {
            id: 'n6', type: 'action', position: { x: 200, y: 680 },
            data: {
                label: 'Setup Reminder',
                description: 'Gentle nudge to complete profile',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, you\'re almost set up',
                    emailBody: 'Hi {{user.name}},\n\nYou\'re close to getting full value from {{company.name}}. Just finish setting up your profile and you\'re good to go.\n\nComplete setup →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'n7', type: 'action', position: { x: 600, y: 680 },
            data: {
                label: 'Getting Started Tips',
                description: 'Send tips for activated users',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '3 things to try first in {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nGreat job finishing setup! Here are 3 things our most successful users do in their first week:\n\n1. Set up automations\n2. Explore integrations\n3. Invite teammates\n\nLet\'s dive in →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'n8', type: 'delay', position: { x: 400, y: 810 },
            data: {
                label: 'Wait 3 Days',
                nodeType: 'delay',
                delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 },
            },
        },
        {
            id: 'n9', type: 'condition', position: { x: 400, y: 930 },
            data: {
                label: 'Created First Project?',
                description: 'Check if user has created their first project',
                nodeType: 'condition',
                conditionConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.project_count', operator: 'greater_than', value: 0 }],
                },
            },
        },
        {
            id: 'n10', type: 'action', position: { x: 200, y: 1060 },
            data: {
                label: 'Project Creation Nudge',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Ready to create your first project?',
                    emailBody: 'Hi {{user.name}},\n\nCreate your first project in {{company.name}} and start seeing results. It takes less than 2 minutes.\n\nCreate a project →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'n11', type: 'action', position: { x: 600, y: 1060 },
            data: {
                label: 'Team Invite Suggestion',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, invite your team to {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nYou\'re off to a great start! Bring your team along so you can collaborate together.\n\nInvite teammates →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'n12', type: 'action', position: { x: 400, y: 1190 },
            data: {
                label: 'Remove Onboarding Tag',
                nodeType: 'action',
                actionConfig: { kind: 'remove_tag', tag: 'onboarding-active' },
            },
        },
        {
            id: 'n13', type: 'exit', position: { x: 400, y: 1300 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Onboarding series complete' } },
        },
    ],
    edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
        { id: 'e5', source: 'n5', target: 'n6', sourceHandle: 'no', label: 'no' },
        { id: 'e6', source: 'n5', target: 'n7', sourceHandle: 'yes', label: 'yes' },
        { id: 'e7', source: 'n6', target: 'n8' },
        { id: 'e8', source: 'n7', target: 'n8' },
        { id: 'e9', source: 'n8', target: 'n9' },
        { id: 'e10', source: 'n9', target: 'n10', sourceHandle: 'no', label: 'no' },
        { id: 'e11', source: 'n9', target: 'n11', sourceHandle: 'yes', label: 'yes' },
        { id: 'e12', source: 'n10', target: 'n12' },
        { id: 'e13', source: 'n11', target: 'n12' },
        { id: 'e14', source: 'n12', target: 'n13' },
    ],
};

/* ── 2. Email Verification Nudge ─────────────────────────────────────── */

const emailVerificationTemplate: FlowTemplate = {
    id: 'ftpl_email_verification',
    name: 'Email Verification Reminder',
    description: 'Reminds users who haven\'t verified their email address, with escalating urgency over 3 days.',
    category: 'onboarding',
    trigger: 'User signs up (email unverified)',
    tags: ['verification', 'email', 'signup', 'security'],
    estimatedSetupMinutes: 5,
    goalEvent: 'email_verified',
    settings: { ...defaultSettings, goalEvent: 'email_verified', goalTimeout: 4320, priority: 10 },
    variables: [],
    nodes: [
        {
            id: 'v1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'User Signed Up',
                description: 'New user created — email not yet verified',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'user_signed_up', allowReEntry: false },
            },
        },
        {
            id: 'v2', type: 'delay', position: { x: 400, y: 170 },
            data: {
                label: 'Wait 2 Hours',
                nodeType: 'delay',
                delayConfig: { kind: 'fixed_duration', durationMinutes: 120 },
            },
        },
        {
            id: 'v3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Email Verified?',
                nodeType: 'condition',
                conditionConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.email_verified', operator: 'equals', value: true }],
                },
            },
        },
        {
            id: 'v4', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Verification Reminder',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Please verify your email for {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nPlease verify your email address to activate your {{company.name}} account and unlock all features.\n\nVerify email →',
                    emailFromName: '{{company.name}}',
                },
            },
        },
        {
            id: 'v5', type: 'delay', position: { x: 200, y: 540 },
            data: {
                label: 'Wait 1 Day',
                nodeType: 'delay',
                delayConfig: { kind: 'fixed_duration', durationMinutes: 1440 },
            },
        },
        {
            id: 'v6', type: 'condition', position: { x: 200, y: 660 },
            data: {
                label: 'Still Unverified?',
                nodeType: 'condition',
                conditionConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.email_verified', operator: 'equals', value: false }],
                },
            },
        },
        {
            id: 'v7', type: 'action', position: { x: 100, y: 790 },
            data: {
                label: 'Final Verification Warning',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Last chance: Verify your {{company.name}} email',
                    emailBody: 'Hi {{user.name}},\n\nYour email address hasn\'t been verified yet. Verify now to keep your account active.\n\nVerify email →',
                    emailFromName: '{{company.name}}',
                },
            },
        },
        {
            id: 'v8', type: 'exit', position: { x: 400, y: 900 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Email verification flow complete' } },
        },
    ],
    edges: [
        { id: 've1', source: 'v1', target: 'v2' },
        { id: 've2', source: 'v2', target: 'v3' },
        { id: 've3', source: 'v3', target: 'v4', sourceHandle: 'no', label: 'no' },
        { id: 've4', source: 'v3', target: 'v8', sourceHandle: 'yes', label: 'yes' },
        { id: 've5', source: 'v4', target: 'v5' },
        { id: 've6', source: 'v5', target: 'v6' },
        { id: 've7', source: 'v6', target: 'v7', sourceHandle: 'yes', label: 'yes' },
        { id: 've8', source: 'v6', target: 'v8', sourceHandle: 'no', label: 'no' },
        { id: 've9', source: 'v7', target: 'v8' },
    ],
};

/* ── 3. Team Invitation Follow-Up ────────────────────────────────────── */

const teamInviteTemplate: FlowTemplate = {
    id: 'ftpl_team_invite_followup',
    name: 'Team Invitation Follow-Up',
    description: 'Follows up with invited team members who haven\'t accepted their invitation within 48 hours.',
    category: 'onboarding',
    trigger: 'Team invite sent',
    tags: ['team', 'invite', 'collaboration', 'follow-up'],
    estimatedSetupMinutes: 5,
    goalEvent: 'team_invite_accepted',
    settings: { ...defaultSettings, goalEvent: 'team_invite_accepted', goalTimeout: 10080, priority: 6 },
    variables: [
        { key: 'inviter_name', label: 'Inviter Name', type: 'string', source: 'event_property', sourceField: 'inviterName' },
    ],
    nodes: [
        {
            id: 'ti1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Team Invite Sent',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'team_invite_sent', allowReEntry: true, reEntryCooldownMinutes: 10080 },
            },
        },
        {
            id: 'ti2', type: 'delay', position: { x: 400, y: 170 },
            data: { label: 'Wait 48 Hours', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 2880 } },
        },
        {
            id: 'ti3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Invite Accepted?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.invite_accepted', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'ti4', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Reminder Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{var.inviter_name}} is waiting for you on {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\n{{var.inviter_name}} invited you to join {{account.name}} on {{company.name}}. Your invitation is still open — accept it to start collaborating.\n\nAccept invitation →',
                    emailFromName: '{{company.name}}',
                },
            },
        },
        {
            id: 'ti5', type: 'exit', position: { x: 400, y: 540 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Team invite follow-up complete' } },
        },
    ],
    edges: [
        { id: 'tie1', source: 'ti1', target: 'ti2' },
        { id: 'tie2', source: 'ti2', target: 'ti3' },
        { id: 'tie3', source: 'ti3', target: 'ti4', sourceHandle: 'no', label: 'no' },
        { id: 'tie4', source: 'ti3', target: 'ti5', sourceHandle: 'yes', label: 'yes' },
        { id: 'tie5', source: 'ti4', target: 'ti5' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  ACTIVATION — Feature Adoption Flows
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 4. First Value / Aha Moment Flow ────────────────────────────────── */

const ahamomentTemplate: FlowTemplate = {
    id: 'ftpl_aha_moment',
    name: 'First Value Moment',
    description: 'Guides users to their first meaningful outcome. Checks key activation milestones and sends targeted nudges if milestones are missed.',
    category: 'activation',
    trigger: 'User completes onboarding',
    tags: ['activation', 'aha moment', 'first value', 'milestone'],
    estimatedSetupMinutes: 10,
    goalEvent: 'first_value_achieved',
    settings: { ...defaultSettings, goalEvent: 'first_value_achieved', goalTimeout: 10080, priority: 8 },
    variables: [
        { key: 'activation_score', label: 'Activation Score', type: 'number', defaultValue: 0, source: 'user_property', sourceField: 'activationScore' },
    ],
    nodes: [
        {
            id: 'ah1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Onboarding Complete',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'onboarding_completed', allowReEntry: false },
            },
        },
        {
            id: 'ah2', type: 'delay', position: { x: 400, y: 170 },
            data: { label: 'Wait 2 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 2880 } },
        },
        {
            id: 'ah3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Used Core Feature?',
                description: 'Check if user has tried the main feature',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.core_feature_used', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'ah4', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Feature Discovery Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, have you tried this yet?',
                    emailBody: 'Hi {{user.name}},\n\nMost successful teams start by trying [core feature]. It takes just a few minutes and delivers immediate results.\n\nTry it now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ah5', type: 'action', position: { x: 600, y: 420 },
            data: {
                label: 'Celebration Email',
                description: 'Congrats on reaching first value!',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '🎉 You did it, {{user.name}}!',
                    emailBody: 'Hi {{user.name}},\n\nYou just reached your first milestone in {{company.name}}! Here\'s what to try next to build on your momentum.\n\nSee what\'s next →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ah6', type: 'delay', position: { x: 200, y: 550 },
            data: { label: 'Wait 3 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'ah7', type: 'action', position: { x: 200, y: 680 },
            data: {
                label: 'Second Nudge',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Teams like yours are getting results with {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nHere\'s how teams similar to {{account.name}} are using {{company.name}} to save time and improve outcomes.\n\nSee examples →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ah8', type: 'exit', position: { x: 400, y: 810 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Activation flow complete' } },
        },
    ],
    edges: [
        { id: 'ahe1', source: 'ah1', target: 'ah2' },
        { id: 'ahe2', source: 'ah2', target: 'ah3' },
        { id: 'ahe3', source: 'ah3', target: 'ah4', sourceHandle: 'no', label: 'no' },
        { id: 'ahe4', source: 'ah3', target: 'ah5', sourceHandle: 'yes', label: 'yes' },
        { id: 'ahe5', source: 'ah4', target: 'ah6' },
        { id: 'ahe6', source: 'ah6', target: 'ah7' },
        { id: 'ahe7', source: 'ah5', target: 'ah8' },
        { id: 'ahe8', source: 'ah7', target: 'ah8' },
    ],
};

/* ── 5. Feature Adoption Campaign ────────────────────────────────────── */

const featureAdoptionTemplate: FlowTemplate = {
    id: 'ftpl_feature_adoption',
    name: 'Feature Adoption Campaign',
    description: 'Introduces a specific feature to users who haven\'t tried it yet. Includes an A/B test on messaging approach.',
    category: 'activation',
    trigger: 'User active but hasn\'t used feature',
    tags: ['feature', 'adoption', 'ab test', 'engagement'],
    estimatedSetupMinutes: 10,
    goalEvent: 'feature_used',
    settings: { ...defaultSettings, goalEvent: 'feature_used', goalTimeout: 14400, priority: 5 },
    variables: [
        { key: 'feature_name', label: 'Feature Name', type: 'string', defaultValue: '[Feature Name]' },
        { key: 'feature_url', label: 'Feature URL', type: 'string', defaultValue: '' },
    ],
    nodes: [
        {
            id: 'fa1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'User Active (7+ days)',
                description: 'User has been active for at least 7 days',
                nodeType: 'trigger',
                triggerConfig: { kind: 'segment_entry', segmentId: 'active_no_feature', allowReEntry: false },
            },
        },
        {
            id: 'fa2', type: 'filter', position: { x: 400, y: 170 },
            data: {
                label: 'Has Not Used Feature',
                nodeType: 'filter',
                filterConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.feature_used', operator: 'not_equals', value: true }],
                },
            },
        },
        {
            id: 'fa3', type: 'split', position: { x: 400, y: 290 },
            data: {
                label: 'A/B: Feature Intro',
                nodeType: 'split',
                splitConfig: {
                    variants: [
                        { id: 'a', label: 'Benefits-led', percentage: 50 },
                        { id: 'b', label: 'Use-case-led', percentage: 50 },
                    ],
                    winnerMetric: 'click_rate',
                    autoPickAfter: 200,
                },
            },
        },
        {
            id: 'fa4', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Benefits Email (A)',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, unlock {{var.feature_name}}',
                    emailBody: 'Hi {{user.name}},\n\nDid you know {{company.name}} includes {{var.feature_name}}? Here\'s how it can save your team time:\n\n• [Benefit 1]\n• [Benefit 2]\n• [Benefit 3]\n\nTry it now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'fa5', type: 'action', position: { x: 600, y: 420 },
            data: {
                label: 'Use-Case Email (B)',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'How {{account.name}} can use {{var.feature_name}}',
                    emailBody: 'Hi {{user.name}},\n\nTeams like {{account.name}} use {{var.feature_name}} to [specific use case]. Here\'s a quick example of what\'s possible:\n\n[Example]\n\nSee for yourself →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'fa6', type: 'delay', position: { x: 400, y: 550 },
            data: { label: 'Wait 5 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 7200 } },
        },
        {
            id: 'fa7', type: 'condition', position: { x: 400, y: 670 },
            data: {
                label: 'Feature Adopted?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.feature_used', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'fa8', type: 'action', position: { x: 200, y: 800 },
            data: {
                label: 'Follow-Up Nudge',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Still curious about {{var.feature_name}}?',
                    emailBody: 'Hi {{user.name}},\n\nWe thought you might want one more look at {{var.feature_name}} before moving on. Here\'s a 2-minute video walkthrough.\n\nWatch video →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'fa9', type: 'exit', position: { x: 400, y: 920 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Feature adoption flow complete' } },
        },
    ],
    edges: [
        { id: 'fae1', source: 'fa1', target: 'fa2' },
        { id: 'fae2', source: 'fa2', target: 'fa3' },
        { id: 'fae3', source: 'fa3', target: 'fa4', sourceHandle: 'variant-a', label: 'A' },
        { id: 'fae4', source: 'fa3', target: 'fa5', sourceHandle: 'variant-b', label: 'B' },
        { id: 'fae5', source: 'fa4', target: 'fa6' },
        { id: 'fae6', source: 'fa5', target: 'fa6' },
        { id: 'fae7', source: 'fa6', target: 'fa7' },
        { id: 'fae8', source: 'fa7', target: 'fa8', sourceHandle: 'no', label: 'no' },
        { id: 'fae9', source: 'fa7', target: 'fa9', sourceHandle: 'yes', label: 'yes' },
        { id: 'fae10', source: 'fa8', target: 'fa9' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  ENGAGEMENT — Keep Users Active
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 6. Weekly Usage Digest ──────────────────────────────────────────── */

const weeklyDigestTemplate: FlowTemplate = {
    id: 'ftpl_weekly_digest',
    name: 'Weekly Usage Digest',
    description: 'Sends a personalized weekly summary of the user\'s activity and key metrics. Keeps engagement high with relevant insights.',
    category: 'engagement',
    trigger: 'Scheduled every Monday',
    tags: ['weekly', 'digest', 'report', 'usage', 'engagement'],
    estimatedSetupMinutes: 10,
    settings: { ...defaultSettings, priority: 4 },
    variables: [],
    nodes: [
        {
            id: 'wd1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Weekly Schedule',
                description: 'Every Monday at 9:00 AM user\'s timezone',
                nodeType: 'trigger',
                triggerConfig: { kind: 'schedule', cronExpression: '0 9 * * 1', timezone: 'user', allowReEntry: true },
            },
        },
        {
            id: 'wd2', type: 'filter', position: { x: 400, y: 170 },
            data: {
                label: 'Active Last 30 Days',
                description: 'Only send to users who logged in recently',
                nodeType: 'filter',
                filterConfig: {
                    logic: 'AND',
                    rules: [{ field: 'user.properties.last_login_days_ago', operator: 'less_than', value: 30 }],
                },
            },
        },
        {
            id: 'wd3', type: 'action', position: { x: 400, y: 290 },
            data: {
                label: 'Weekly Digest Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Your {{company.name}} week in review',
                    emailBody: 'Hi {{user.name}},\n\nHere\'s what you and your team at {{account.name}} accomplished this week:\n\n• Tasks completed: [X]\n• Time saved: [Y] hours\n• Active team members: [Z]\n\nView full report →',
                    emailFromName: '{{company.name}}',
                },
            },
        },
        {
            id: 'wd4', type: 'exit', position: { x: 400, y: 410 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Weekly digest sent' } },
        },
    ],
    edges: [
        { id: 'wde1', source: 'wd1', target: 'wd2' },
        { id: 'wde2', source: 'wd2', target: 'wd3' },
        { id: 'wde3', source: 'wd3', target: 'wd4' },
    ],
};

/* ── 7. New Feature Announcement ─────────────────────────────────────── */

const newFeatureTemplate: FlowTemplate = {
    id: 'ftpl_new_feature_announcement',
    name: 'New Feature Announcement',
    description: 'Announces a new feature to all active users with a personalized message based on their usage patterns.',
    category: 'engagement',
    trigger: 'Manual trigger (feature launch)',
    tags: ['feature', 'announcement', 'product update', 'changelog'],
    estimatedSetupMinutes: 8,
    settings: { ...defaultSettings, priority: 6 },
    variables: [
        { key: 'feature_name', label: 'Feature Name', type: 'string', defaultValue: '' },
        { key: 'feature_url', label: 'Feature URL', type: 'string', defaultValue: '' },
    ],
    nodes: [
        {
            id: 'nf1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Manual: Feature Launch',
                nodeType: 'trigger',
                triggerConfig: { kind: 'manual', allowReEntry: false },
            },
        },
        {
            id: 'nf2', type: 'filter', position: { x: 400, y: 170 },
            data: {
                label: 'Active Users Only',
                nodeType: 'filter',
                filterConfig: { logic: 'AND', rules: [{ field: 'user.properties.last_login_days_ago', operator: 'less_than', value: 60 }] },
            },
        },
        {
            id: 'nf3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Power User?',
                description: 'Users with high engagement get early access messaging',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.lifecycleState', operator: 'equals', value: 'PowerUser' }] },
            },
        },
        {
            id: 'nf4', type: 'action', position: { x: 600, y: 420 },
            data: {
                label: 'Power User Announcement',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, you got early access to {{var.feature_name}}',
                    emailBody: 'Hi {{user.name}},\n\nAs one of our most active users, you\'re among the first to try {{var.feature_name}}. We built this based on feedback from power users like you.\n\nTry it now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'nf5', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Standard Announcement',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'New in {{company.name}}: {{var.feature_name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe just launched {{var.feature_name}} — and we think you\'ll love it. Here\'s what it does and why it matters for your workflow.\n\nLearn more →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'nf6', type: 'exit', position: { x: 400, y: 560 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Feature announcement sent' } },
        },
    ],
    edges: [
        { id: 'nfe1', source: 'nf1', target: 'nf2' },
        { id: 'nfe2', source: 'nf2', target: 'nf3' },
        { id: 'nfe3', source: 'nf3', target: 'nf4', sourceHandle: 'yes', label: 'yes' },
        { id: 'nfe4', source: 'nf3', target: 'nf5', sourceHandle: 'no', label: 'no' },
        { id: 'nfe5', source: 'nf4', target: 'nf6' },
        { id: 'nfe6', source: 'nf5', target: 'nf6' },
    ],
};

/* ── 8. Event/Webinar Invitation ─────────────────────────────────────── */

const eventInviteTemplate: FlowTemplate = {
    id: 'ftpl_event_invite',
    name: 'Event / Webinar Invitation',
    description: 'Invites users to a webinar or event with RSVP tracking, a reminder the day before, and a follow-up with the recording.',
    category: 'engagement',
    trigger: 'Manual trigger (event created)',
    tags: ['event', 'webinar', 'invitation', 'rsvp', 'follow-up'],
    estimatedSetupMinutes: 12,
    goalEvent: 'event_attended',
    settings: { ...defaultSettings, goalEvent: 'event_attended', priority: 5 },
    variables: [
        { key: 'event_name', label: 'Event Name', type: 'string', defaultValue: '' },
        { key: 'event_date', label: 'Event Date', type: 'string', defaultValue: '' },
        { key: 'event_url', label: 'Registration URL', type: 'string', defaultValue: '' },
        { key: 'recording_url', label: 'Recording URL', type: 'string', defaultValue: '' },
    ],
    nodes: [
        {
            id: 'ev1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Manual: Event Launch',
                nodeType: 'trigger',
                triggerConfig: { kind: 'manual', allowReEntry: false },
            },
        },
        {
            id: 'ev2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Event Invitation',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'You\'re invited: {{var.event_name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe\'re hosting {{var.event_name}} on {{var.event_date}} and we think you\'d find it valuable.\n\nWhat you\'ll learn:\n• [Topic 1]\n• [Topic 2]\n• Live Q&A\n\nRegister now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ev3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait Until Day Before', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'ev4', type: 'condition', position: { x: 400, y: 410 },
            data: {
                label: 'Registered?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.event_registered', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'ev5', type: 'action', position: { x: 600, y: 530 },
            data: {
                label: 'Event Reminder',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Reminder: {{var.event_name}} is tomorrow',
                    emailBody: 'Hi {{user.name}},\n\nJust a reminder that {{var.event_name}} is tomorrow. Here\'s your access link:\n\n[Join Link]\n\nSee you there!',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ev6', type: 'action', position: { x: 200, y: 530 },
            data: {
                label: 'Last Chance to Register',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Last chance: {{var.event_name}} is tomorrow',
                    emailBody: 'Hi {{user.name}},\n\n{{var.event_name}} is happening tomorrow and spots are filling up. Register now if you\'d like to attend.\n\nRegister →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ev7', type: 'delay', position: { x: 400, y: 660 },
            data: { label: 'Wait 1 Day (post-event)', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 1440 } },
        },
        {
            id: 'ev8', type: 'action', position: { x: 400, y: 780 },
            data: {
                label: 'Recording Follow-Up',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{var.event_name}} recording is ready',
                    emailBody: 'Hi {{user.name}},\n\nThank you for your interest in {{var.event_name}}! The recording is now available.\n\nWatch recording →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ev9', type: 'exit', position: { x: 400, y: 900 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Event flow complete' } },
        },
    ],
    edges: [
        { id: 'eve1', source: 'ev1', target: 'ev2' },
        { id: 'eve2', source: 'ev2', target: 'ev3' },
        { id: 'eve3', source: 'ev3', target: 'ev4' },
        { id: 'eve4', source: 'ev4', target: 'ev5', sourceHandle: 'yes', label: 'yes' },
        { id: 'eve5', source: 'ev4', target: 'ev6', sourceHandle: 'no', label: 'no' },
        { id: 'eve6', source: 'ev5', target: 'ev7' },
        { id: 'eve7', source: 'ev6', target: 'ev7' },
        { id: 'eve8', source: 'ev7', target: 'ev8' },
        { id: 'eve9', source: 'ev8', target: 'ev9' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  RETENTION — Churn Prevention & Win-Back
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 9. Inactivity Re-Engagement ─────────────────────────────────────── */

const inactivityReengagementTemplate: FlowTemplate = {
    id: 'ftpl_inactivity_reengagement',
    name: 'Inactivity Re-Engagement',
    description: 'Multi-step re-engagement campaign triggered when a user becomes inactive. Sends 3 increasingly urgent touchpoints over 14 days.',
    category: 'retention',
    trigger: 'User inactive for 14 days',
    tags: ['inactive', 're-engagement', 'churn', 'retention'],
    estimatedSetupMinutes: 10,
    goalEvent: 'session_started',
    settings: { ...defaultSettings, goalEvent: 'session_started', goalTimeout: 30240, priority: 8 },
    variables: [],
    nodes: [
        {
            id: 're1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'User Inactive 14 Days',
                nodeType: 'trigger',
                triggerConfig: { kind: 'segment_entry', segmentId: 'inactive_14_days', allowReEntry: false, reEntryCooldownMinutes: 43200 },
            },
        },
        {
            id: 're2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Soft Re-Engagement',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'It\'s been a while, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe noticed you haven\'t logged in to {{company.name}} recently. Your account and data are still here — here\'s what\'s new since your last visit:\n\n• [Update 1]\n• [Update 2]\n\nLog back in →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 're3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait 5 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 7200 } },
        },
        {
            id: 're4', type: 'condition', position: { x: 400, y: 410 },
            data: {
                label: 'Logged In?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.last_login_days_ago', operator: 'less_than', value: 5 }] },
            },
        },
        {
            id: 're5', type: 'action', position: { x: 200, y: 540 },
            data: {
                label: 'Value Reminder',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, here\'s what you\'re missing',
                    emailBody: 'Hi {{user.name}},\n\nYour team at {{account.name}} has pending items waiting for you in {{company.name}}. Don\'t let them go stale.\n\nView your dashboard →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 're6', type: 'delay', position: { x: 200, y: 660 },
            data: { label: 'Wait 7 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 10080 } },
        },
        {
            id: 're7', type: 'condition', position: { x: 200, y: 780 },
            data: {
                label: 'Still Inactive?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.last_login_days_ago', operator: 'greater_than', value: 21 }] },
            },
        },
        {
            id: 're8', type: 'action', position: { x: 100, y: 910 },
            data: {
                label: 'Final Re-Engagement',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'We\'d love to have you back, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe understand things change. If something wasn\'t working for you in {{company.name}}, we\'d genuinely like to know. Reply to this email — it goes straight to our team.\n\nOr if you\'re ready to come back: Log in →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 're9', type: 'exit', position: { x: 400, y: 1030 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Re-engagement flow complete' } },
        },
    ],
    edges: [
        { id: 'ree1', source: 're1', target: 're2' },
        { id: 'ree2', source: 're2', target: 're3' },
        { id: 'ree3', source: 're3', target: 're4' },
        { id: 'ree4', source: 're4', target: 're5', sourceHandle: 'no', label: 'no' },
        { id: 'ree5', source: 're4', target: 're9', sourceHandle: 'yes', label: 'yes' },
        { id: 'ree6', source: 're5', target: 're6' },
        { id: 'ree7', source: 're6', target: 're7' },
        { id: 'ree8', source: 're7', target: 're8', sourceHandle: 'yes', label: 'yes' },
        { id: 'ree9', source: 're7', target: 're9', sourceHandle: 'no', label: 'no' },
        { id: 'ree10', source: 're8', target: 're9' },
    ],
};

/* ── 10. Churn Prevention (At-Risk Users) ────────────────────────────── */

const churnPreventionTemplate: FlowTemplate = {
    id: 'ftpl_churn_prevention',
    name: 'Churn Prevention',
    description: 'Triggered when a user enters an "at-risk" state. Routes high-value accounts to personal outreach and others to automated re-engagement with a save offer.',
    category: 'retention',
    trigger: 'User enters at-risk state',
    tags: ['churn', 'at-risk', 'prevention', 'retention', 'save offer'],
    estimatedSetupMinutes: 12,
    goalEvent: 'lifecycle_recovered',
    settings: { ...defaultSettings, goalEvent: 'lifecycle_recovered', goalTimeout: 43200, priority: 10 },
    variables: [
        { key: 'risk_score', label: 'Churn Risk Score', type: 'number', source: 'user_property', sourceField: 'churnRiskScore' },
        { key: 'mrr', label: 'Monthly Revenue', type: 'number', source: 'user_property', sourceField: 'mrr' },
    ],
    nodes: [
        {
            id: 'ch1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'At-Risk Detected',
                description: 'User enters AtRisk lifecycle state',
                nodeType: 'trigger',
                triggerConfig: { kind: 'lifecycle_change', lifecycleTo: ['AtRisk'], allowReEntry: false, reEntryCooldownMinutes: 10080 },
            },
        },
        {
            id: 'ch2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Tag: Churn Prevention',
                nodeType: 'action',
                actionConfig: { kind: 'add_tag', tag: 'churn-prevention-active' },
            },
        },
        {
            id: 'ch3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'High-Value Account?',
                description: 'Route accounts with MRR > $200 to priority path',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.mrr', operator: 'greater_than', value: 200 }] },
            },
        },
        {
            id: 'ch4', type: 'action', position: { x: 600, y: 420 },
            data: {
                label: 'Personal Outreach Email',
                description: 'High-touch personal email from a team member',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, can we chat?',
                    emailBody: 'Hi {{user.name}},\n\nI noticed your usage of {{company.name}} has dropped. I\'d like to understand what\'s happening and see if there\'s anything we can do to help.\n\nWould you be open to a quick call this week? Just reply with a time that works.\n\nBest,\n[Your Name]',
                    emailFromName: '[Customer Success Manager]',
                },
            },
        },
        {
            id: 'ch5', type: 'action', position: { x: 600, y: 550 },
            data: {
                label: 'Create CS Task',
                description: 'Alert customer success for high-value accounts',
                nodeType: 'action',
                actionConfig: {
                    kind: 'create_task',
                    taskTitle: '🚨 At-Risk: {{user.name}} ({{account.name}}) — MRR: ${{var.mrr}}',
                    taskPriority: 'critical',
                },
            },
        },
        {
            id: 'ch6', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Re-Engagement Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'We noticed you\'ve been away, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe\'ve made improvements to {{company.name}} since your last visit. Here\'s what\'s new:\n\n• [Improvement 1]\n• [Improvement 2]\n\nCome back and see →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ch7', type: 'delay', position: { x: 400, y: 680 },
            data: { label: 'Wait 5 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 7200 } },
        },
        {
            id: 'ch8', type: 'condition', position: { x: 400, y: 800 },
            data: {
                label: 'Still At-Risk?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.lifecycleState', operator: 'equals', value: 'AtRisk' }] },
            },
        },
        {
            id: 'ch9', type: 'action', position: { x: 200, y: 930 },
            data: {
                label: 'Save Offer Email',
                description: 'Discount offer as last-resort retention',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Before you go — a special offer for {{account.name}}',
                    emailBody: 'Hi {{user.name}},\n\nWe don\'t want to lose you. As a thank-you for being a {{company.name}} customer, here\'s 30% off your next month.\n\nUse code: STAYWITHUS\n\nClaim offer →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ch10', type: 'action', position: { x: 600, y: 930 },
            data: {
                label: 'Remove Churn Tag',
                description: 'User recovered',
                nodeType: 'action',
                actionConfig: { kind: 'remove_tag', tag: 'churn-prevention-active' },
            },
        },
        {
            id: 'ch11', type: 'exit', position: { x: 400, y: 1060 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Churn prevention complete' } },
        },
    ],
    edges: [
        { id: 'che1', source: 'ch1', target: 'ch2' },
        { id: 'che2', source: 'ch2', target: 'ch3' },
        { id: 'che3', source: 'ch3', target: 'ch4', sourceHandle: 'yes', label: 'yes' },
        { id: 'che4', source: 'ch3', target: 'ch6', sourceHandle: 'no', label: 'no' },
        { id: 'che5', source: 'ch4', target: 'ch5' },
        { id: 'che6', source: 'ch5', target: 'ch7' },
        { id: 'che7', source: 'ch6', target: 'ch7' },
        { id: 'che8', source: 'ch7', target: 'ch8' },
        { id: 'che9', source: 'ch8', target: 'ch9', sourceHandle: 'yes', label: 'yes' },
        { id: 'che10', source: 'ch8', target: 'ch10', sourceHandle: 'no', label: 'no' },
        { id: 'che11', source: 'ch9', target: 'ch11' },
        { id: 'che12', source: 'ch10', target: 'ch11' },
    ],
};

/* ── 11. Cancellation Save Flow ──────────────────────────────────────── */

const cancellationSaveTemplate: FlowTemplate = {
    id: 'ftpl_cancellation_save',
    name: 'Cancellation Save Flow',
    description: 'Triggered when a user initiates cancellation. Offers alternatives (pause, downgrade) and a save offer before account closure.',
    category: 'retention',
    trigger: 'User initiates cancellation',
    tags: ['cancellation', 'save', 'downgrade', 'pause', 'retention'],
    estimatedSetupMinutes: 8,
    goalEvent: 'cancellation_reversed',
    settings: { ...defaultSettings, goalEvent: 'cancellation_reversed', goalTimeout: 10080, priority: 10 },
    variables: [
        { key: 'cancel_reason', label: 'Cancel Reason', type: 'string', source: 'event_property', sourceField: 'reason' },
    ],
    nodes: [
        {
            id: 'cs1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Cancellation Initiated',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'subscription_cancel_requested', allowReEntry: false },
            },
        },
        {
            id: 'cs2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Alternatives Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Before you go, {{user.name}} — we have options',
                    emailBody: 'Hi {{user.name}},\n\nWe received your cancellation request. Before your account closes, consider these alternatives:\n\n1. Pause your account for up to 3 months\n2. Downgrade to a smaller plan\n3. Talk to our team about what isn\'t working\n\nExplore options →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'cs3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait 2 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 2880 } },
        },
        {
            id: 'cs4', type: 'condition', position: { x: 400, y: 410 },
            data: {
                label: 'Still Cancelling?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.cancellation_pending', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'cs5', type: 'action', position: { x: 200, y: 540 },
            data: {
                label: 'Final Save Offer',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'We really don\'t want to lose you, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nHere\'s 50% off your next 2 months if you decide to stay with {{company.name}}. No strings attached.\n\nUse code: STAY50\n\nKeep my account →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'cs6', type: 'exit', position: { x: 400, y: 670 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Cancellation save flow complete' } },
        },
    ],
    edges: [
        { id: 'cse1', source: 'cs1', target: 'cs2' },
        { id: 'cse2', source: 'cs2', target: 'cs3' },
        { id: 'cse3', source: 'cs3', target: 'cs4' },
        { id: 'cse4', source: 'cs4', target: 'cs5', sourceHandle: 'yes', label: 'yes' },
        { id: 'cse5', source: 'cs4', target: 'cs6', sourceHandle: 'no', label: 'no' },
        { id: 'cse6', source: 'cs5', target: 'cs6' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  EXPANSION — Upgrade & Upsell Flows
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 12. Upgrade Offer (A/B Tested) ──────────────────────────────────── */

const upgradeOfferTemplate: FlowTemplate = {
    id: 'ftpl_upgrade_offer',
    name: 'Upgrade Offer (A/B Tested)',
    description: 'A/B tested upgrade messaging for expansion-ready users. Tests value-focused vs urgency-focused approaches and syncs with CRM.',
    category: 'expansion',
    trigger: 'User enters expansion-ready state',
    tags: ['upgrade', 'upsell', 'expansion', 'ab test', 'crm'],
    estimatedSetupMinutes: 12,
    goalEvent: 'plan_upgraded',
    settings: { ...defaultSettings, goalEvent: 'plan_upgraded', goalTimeout: 30240, priority: 7 },
    variables: [
        { key: 'seatUsagePercent', label: 'Seat Usage %', type: 'number', defaultValue: 0, source: 'user_property', sourceField: 'seatCount' },
        { key: 'current_plan', label: 'Current Plan', type: 'string', source: 'user_property', sourceField: 'plan' },
    ],
    nodes: [
        {
            id: 'up1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Expansion Ready',
                nodeType: 'trigger',
                triggerConfig: { kind: 'lifecycle_change', lifecycleTo: ['ExpansionReady'], allowReEntry: false },
            },
        },
        {
            id: 'up2', type: 'split', position: { x: 400, y: 170 },
            data: {
                label: 'A/B: Upgrade Message',
                nodeType: 'split',
                splitConfig: {
                    variants: [
                        { id: 'a', label: 'Value-focused', percentage: 50 },
                        { id: 'b', label: 'Urgency-focused', percentage: 50 },
                    ],
                    winnerMetric: 'conversion_rate',
                    autoPickAfter: 200,
                },
            },
        },
        {
            id: 'up3', type: 'action', position: { x: 200, y: 300 },
            data: {
                label: 'Value Upgrade Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Unlock more for {{account.name}} on {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nYou\'re getting great results on {{var.current_plan}}. Here\'s what upgrading unlocks:\n\n• More seats for your growing team\n• Advanced analytics & reporting\n• Priority support\n\nCompare plans →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'up4', type: 'action', position: { x: 600, y: 300 },
            data: {
                label: 'Urgency Upgrade Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, you\'re at {{var.seatUsagePercent}}% of your limit',
                    emailBody: 'Hi {{user.name}},\n\n{{account.name}} is approaching team seat limits on the {{var.current_plan}} plan. Upgrade now to avoid disruptions.\n\nUpgrade now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'up5', type: 'delay', position: { x: 400, y: 430 },
            data: { label: 'Wait 5 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 7200 } },
        },
        {
            id: 'up6', type: 'condition', position: { x: 400, y: 550 },
            data: {
                label: 'Upgraded?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.plan_upgraded', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'up7', type: 'action', position: { x: 200, y: 680 },
            data: {
                label: 'CRM Webhook',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_webhook',
                    webhookUrl: 'https://your-crm.example.com/opportunities',
                    webhookMethod: 'POST',
                    webhookPayload: '{"userId":"{{user.id}}","account":"{{account.name}}","signal":"expansion_ready","mrr":"{{user.mrr}}","plan":"{{var.current_plan}}"}',
                },
            },
        },
        {
            id: 'up8', type: 'exit', position: { x: 400, y: 800 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Upgrade offer flow complete' } },
        },
    ],
    edges: [
        { id: 'upe1', source: 'up1', target: 'up2' },
        { id: 'upe2', source: 'up2', target: 'up3', sourceHandle: 'variant-a', label: 'A' },
        { id: 'upe3', source: 'up2', target: 'up4', sourceHandle: 'variant-b', label: 'B' },
        { id: 'upe4', source: 'up3', target: 'up5' },
        { id: 'upe5', source: 'up4', target: 'up5' },
        { id: 'upe6', source: 'up5', target: 'up6' },
        { id: 'upe7', source: 'up6', target: 'up8', sourceHandle: 'yes', label: 'yes' },
        { id: 'upe8', source: 'up6', target: 'up7', sourceHandle: 'no', label: 'no' },
        { id: 'upe9', source: 'up7', target: 'up8' },
    ],
};

/* ── 13. Usage Limit Approaching ─────────────────────────────────────── */

const usageLimitTemplate: FlowTemplate = {
    id: 'ftpl_usage_limit',
    name: 'Usage Limit Notification',
    description: 'Notifies users when they approach their plan\'s usage limits. Sends at 80% and 95% thresholds with upgrade options.',
    category: 'expansion',
    trigger: 'Usage exceeds 80% of plan limit',
    tags: ['usage', 'limit', 'upgrade', 'threshold', 'seats'],
    estimatedSetupMinutes: 8,
    goalEvent: 'plan_upgraded',
    settings: { ...defaultSettings, goalEvent: 'plan_upgraded', priority: 7 },
    variables: [
        { key: 'usage_percent', label: 'Usage Percentage', type: 'number', source: 'user_property', sourceField: 'usagePercent' },
    ],
    nodes: [
        {
            id: 'ul1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Usage at 80%',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'usage_threshold_80', allowReEntry: false },
            },
        },
        {
            id: 'ul2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: '80% Warning Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, you\'re at {{var.usage_percent}}% of your plan limit',
                    emailBody: 'Hi {{user.name}},\n\n{{account.name}} is approaching the usage limit on your current plan. This is a good sign — it means you\'re getting value from {{company.name}}.\n\nUpgrade to get more capacity and advanced features.\n\nView plans →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ul3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait 7 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 10080 } },
        },
        {
            id: 'ul4', type: 'condition', position: { x: 400, y: 410 },
            data: {
                label: 'Usage > 95%?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.usage_percent', operator: 'greater_than', value: 95 }] },
            },
        },
        {
            id: 'ul5', type: 'action', position: { x: 200, y: 540 },
            data: {
                label: 'Critical Limit Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Urgent: {{account.name}} is nearly at capacity',
                    emailBody: 'Hi {{user.name}},\n\nYou\'re at 95%+ of your plan limit. To avoid service interruptions, upgrade your plan now.\n\nUpgrade immediately →',
                    emailFromName: '{{company.name}}',
                },
            },
        },
        {
            id: 'ul6', type: 'exit', position: { x: 400, y: 660 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Usage limit flow complete' } },
        },
    ],
    edges: [
        { id: 'ule1', source: 'ul1', target: 'ul2' },
        { id: 'ule2', source: 'ul2', target: 'ul3' },
        { id: 'ule3', source: 'ul3', target: 'ul4' },
        { id: 'ule4', source: 'ul4', target: 'ul5', sourceHandle: 'yes', label: 'yes' },
        { id: 'ule5', source: 'ul4', target: 'ul6', sourceHandle: 'no', label: 'no' },
        { id: 'ule6', source: 'ul5', target: 'ul6' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  REVENUE — Trial & Billing Flows
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 14. Trial-to-Paid Conversion ────────────────────────────────────── */

const trialConversionTemplate: FlowTemplate = {
    id: 'ftpl_trial_conversion',
    name: 'Trial-to-Paid Conversion',
    description: 'Full trial conversion series: welcome, value demonstration, social proof, urgency, and final conversion nudge.',
    category: 'revenue',
    trigger: 'User starts trial',
    tags: ['trial', 'conversion', 'paid', 'upgrade', 'urgency'],
    estimatedSetupMinutes: 15,
    goalEvent: 'subscription_started',
    settings: { ...defaultSettings, goalEvent: 'subscription_started', goalTimeout: 20160, priority: 9 },
    variables: [
        { key: 'trial_days_left', label: 'Trial Days Remaining', type: 'number', defaultValue: 14 },
        { key: 'user_plan', label: 'User Plan', type: 'string', source: 'user_property', sourceField: 'plan' },
    ],
    nodes: [
        {
            id: 'tc1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Trial Started',
                nodeType: 'trigger',
                triggerConfig: { kind: 'lifecycle_change', lifecycleTo: ['Trial'], allowReEntry: false },
            },
        },
        {
            id: 'tc2', type: 'delay', position: { x: 400, y: 170 },
            data: { label: 'Wait 3 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'tc3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Active in Trial?',
                description: 'Check if user has been actively using the product',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.session_count', operator: 'greater_than', value: 2 }] },
            },
        },
        {
            id: 'tc4', type: 'action', position: { x: 600, y: 420 },
            data: {
                label: 'Social Proof Email',
                description: 'Show success stories from similar companies',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'How teams like {{account.name}} use {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nCompanies similar to yours are getting measurable results with {{company.name}}. Here are their stories.\n\nRead customer stories →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'tc5', type: 'action', position: { x: 200, y: 420 },
            data: {
                label: 'Check-In Email',
                description: 'Help inactive trialists get started',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, need help getting started?',
                    emailBody: 'Hi {{user.name}},\n\nWe noticed you haven\'t had a chance to explore {{company.name}} much yet. Here\'s a quick 3-step guide to get started.\n\nGet started →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'tc6', type: 'delay', position: { x: 400, y: 550 },
            data: { label: 'Wait Until Day 10', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 10080 } },
        },
        {
            id: 'tc7', type: 'action', position: { x: 400, y: 670 },
            data: {
                label: 'Trial Ending Soon',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Your trial ends in 4 days, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nYour {{company.name}} trial is almost over. Upgrade now to keep your data, team access, and all the features you\'ve been using.\n\nChoose a plan →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'tc8', type: 'delay', position: { x: 400, y: 790 },
            data: { label: 'Wait 3 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'tc9', type: 'condition', position: { x: 400, y: 910 },
            data: {
                label: 'Subscribed?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.plan', operator: 'not_equals', value: 'Trial' }] },
            },
        },
        {
            id: 'tc10', type: 'action', position: { x: 200, y: 1040 },
            data: {
                label: 'Final Day Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Last day: Your {{company.name}} trial expires today',
                    emailBody: 'Hi {{user.name}},\n\nYour trial ends today. Upgrade in the next few hours to keep everything.\n\nNot ready? Reply to this email and we\'ll extend your trial by 7 more days.\n\nUpgrade now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'tc11', type: 'exit', position: { x: 400, y: 1160 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Trial conversion flow complete' } },
        },
    ],
    edges: [
        { id: 'tce1', source: 'tc1', target: 'tc2' },
        { id: 'tce2', source: 'tc2', target: 'tc3' },
        { id: 'tce3', source: 'tc3', target: 'tc4', sourceHandle: 'yes', label: 'yes' },
        { id: 'tce4', source: 'tc3', target: 'tc5', sourceHandle: 'no', label: 'no' },
        { id: 'tce5', source: 'tc4', target: 'tc6' },
        { id: 'tce6', source: 'tc5', target: 'tc6' },
        { id: 'tce7', source: 'tc6', target: 'tc7' },
        { id: 'tce8', source: 'tc7', target: 'tc8' },
        { id: 'tce9', source: 'tc8', target: 'tc9' },
        { id: 'tce10', source: 'tc9', target: 'tc11', sourceHandle: 'yes', label: 'yes' },
        { id: 'tce11', source: 'tc9', target: 'tc10', sourceHandle: 'no', label: 'no' },
        { id: 'tce12', source: 'tc10', target: 'tc11' },
    ],
};

/* ── 15. Payment Failed (Dunning) ────────────────────────────────────── */

const dunningTemplate: FlowTemplate = {
    id: 'ftpl_dunning',
    name: 'Payment Failed (Dunning)',
    description: 'Automated dunning sequence when a payment fails. Sends 3 escalating reminders before account suspension.',
    category: 'revenue',
    trigger: 'Payment fails',
    tags: ['dunning', 'payment', 'failed', 'billing', 'card'],
    estimatedSetupMinutes: 8,
    goalEvent: 'payment_succeeded',
    settings: { ...defaultSettings, goalEvent: 'payment_succeeded', goalTimeout: 20160, priority: 10 },
    variables: [],
    nodes: [
        {
            id: 'dn1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Payment Failed',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'payment_failed', allowReEntry: true, reEntryCooldownMinutes: 43200 },
            },
        },
        {
            id: 'dn2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Payment Failed Notice',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Action needed: Your payment for {{company.name}} failed',
                    emailBody: 'Hi {{user.name}},\n\nWe tried to charge your card for {{account.name}}\'s subscription but it was declined. Please update your payment method to avoid any interruption.\n\nUpdate payment →',
                    emailFromName: '{{company.name}} Billing',
                },
            },
        },
        {
            id: 'dn3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait 3 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'dn4', type: 'condition', position: { x: 400, y: 410 },
            data: {
                label: 'Payment Resolved?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.payment_current', operator: 'equals', value: true }] },
            },
        },
        {
            id: 'dn5', type: 'action', position: { x: 200, y: 540 },
            data: {
                label: 'Second Warning',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Urgent: Update your payment for {{company.name}}',
                    emailBody: 'Hi {{user.name}},\n\nYour payment is still outstanding. We\'ll retry in 4 days. If unresolved, your account will be downgraded.\n\nUpdate payment now →',
                    emailFromName: '{{company.name}} Billing',
                },
            },
        },
        {
            id: 'dn6', type: 'delay', position: { x: 200, y: 660 },
            data: { label: 'Wait 4 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 5760 } },
        },
        {
            id: 'dn7', type: 'condition', position: { x: 200, y: 780 },
            data: {
                label: 'Still Unresolved?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.payment_current', operator: 'equals', value: false }] },
            },
        },
        {
            id: 'dn8', type: 'action', position: { x: 100, y: 910 },
            data: {
                label: 'Final Warning — Account Suspension',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Your {{company.name}} account will be suspended tomorrow',
                    emailBody: 'Hi {{user.name}},\n\nThis is a final notice. Your payment for {{account.name}} has not been received. Your account will be suspended tomorrow unless payment is resolved.\n\nUpdate payment immediately →',
                    emailFromName: '{{company.name}} Billing',
                },
            },
        },
        {
            id: 'dn9', type: 'exit', position: { x: 400, y: 1030 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Dunning sequence complete' } },
        },
    ],
    edges: [
        { id: 'dne1', source: 'dn1', target: 'dn2' },
        { id: 'dne2', source: 'dn2', target: 'dn3' },
        { id: 'dne3', source: 'dn3', target: 'dn4' },
        { id: 'dne4', source: 'dn4', target: 'dn5', sourceHandle: 'no', label: 'no' },
        { id: 'dne5', source: 'dn4', target: 'dn9', sourceHandle: 'yes', label: 'yes' },
        { id: 'dne6', source: 'dn5', target: 'dn6' },
        { id: 'dne7', source: 'dn6', target: 'dn7' },
        { id: 'dne8', source: 'dn7', target: 'dn8', sourceHandle: 'yes', label: 'yes' },
        { id: 'dne9', source: 'dn7', target: 'dn9', sourceHandle: 'no', label: 'no' },
        { id: 'dne10', source: 'dn8', target: 'dn9' },
    ],
};

/* ── 16. Contract Renewal Reminder ───────────────────────────────────── */

const renewalReminderTemplate: FlowTemplate = {
    id: 'ftpl_renewal_reminder',
    name: 'Contract Renewal Reminder',
    description: 'Proactive renewal flow starting 30 days before contract end. Sends reminders at 30, 14, and 3 days with escalation.',
    category: 'revenue',
    trigger: 'Renewal approaching (30 days)',
    tags: ['renewal', 'contract', 'reminder', 'annual', 'billing'],
    estimatedSetupMinutes: 10,
    goalEvent: 'contract_renewed',
    settings: { ...defaultSettings, goalEvent: 'contract_renewed', goalTimeout: 43200, priority: 9 },
    variables: [
        { key: 'renewal_date', label: 'Renewal Date', type: 'date', source: 'user_property', sourceField: 'contractRenewalDate' },
    ],
    nodes: [
        {
            id: 'rn1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Renewal in 30 Days',
                nodeType: 'trigger',
                triggerConfig: { kind: 'date_property', dateProperty: 'contractRenewalDate', dateOffsetDays: -30, allowReEntry: false },
            },
        },
        {
            id: 'rn2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Renewal Heads-Up',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Your {{company.name}} renewal is coming up',
                    emailBody: 'Hi {{user.name}},\n\nYour contract for {{account.name}} renews on {{var.renewal_date}}. If you need to make changes to your plan or team, now is a great time.\n\nReview your plan →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'rn3', type: 'delay', position: { x: 400, y: 290 },
            data: { label: 'Wait 16 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 23040 } },
        },
        {
            id: 'rn4', type: 'action', position: { x: 400, y: 410 },
            data: {
                label: '14-Day Reminder',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '2 weeks until renewal — {{account.name}}',
                    emailBody: 'Hi {{user.name}},\n\nYour {{company.name}} contract renews in 14 days. Everything will auto-renew unless you make changes.\n\nManage billing →',
                    emailFromName: '{{company.name}} Billing',
                },
            },
        },
        {
            id: 'rn5', type: 'delay', position: { x: 400, y: 530 },
            data: { label: 'Wait 11 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 15840 } },
        },
        {
            id: 'rn6', type: 'action', position: { x: 400, y: 650 },
            data: {
                label: 'Final Renewal Notice',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Your contract renews in 3 days',
                    emailBody: 'Hi {{user.name}},\n\n{{account.name}}\'s {{company.name}} contract auto-renews in 3 days. Need to make changes? Contact us before then.\n\nReview details →',
                    emailFromName: '{{company.name}} Billing',
                },
            },
        },
        {
            id: 'rn7', type: 'exit', position: { x: 400, y: 770 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Renewal reminder sequence complete' } },
        },
    ],
    edges: [
        { id: 'rne1', source: 'rn1', target: 'rn2' },
        { id: 'rne2', source: 'rn2', target: 'rn3' },
        { id: 'rne3', source: 'rn3', target: 'rn4' },
        { id: 'rne4', source: 'rn4', target: 'rn5' },
        { id: 'rne5', source: 'rn5', target: 'rn6' },
        { id: 'rne6', source: 'rn6', target: 'rn7' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  FEEDBACK — Surveys & Review Requests
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 17. NPS Follow-Up ───────────────────────────────────────────────── */

const npsFollowUpTemplate: FlowTemplate = {
    id: 'ftpl_nps_followup',
    name: 'NPS Survey Follow-Up',
    description: 'Branches based on NPS score: promoters get review/referral requests, detractors get personal follow-up, passives get a thank-you.',
    category: 'feedback',
    trigger: 'NPS survey submitted',
    tags: ['nps', 'survey', 'feedback', 'promoter', 'detractor', 'review'],
    estimatedSetupMinutes: 10,
    settings: { ...defaultSettings, priority: 6 },
    variables: [
        { key: 'nps_score', label: 'NPS Score', type: 'number', defaultValue: 0, source: 'event_property', sourceField: 'npsScore' },
    ],
    nodes: [
        {
            id: 'np1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'NPS Submitted',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'nps_submitted', allowReEntry: true, reEntryCooldownMinutes: 43200 },
            },
        },
        {
            id: 'np2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Store NPS Score',
                nodeType: 'action',
                actionConfig: { kind: 'set_variable', variableKey: 'nps_score', variableValue: '{{event.npsScore}}' },
            },
        },
        {
            id: 'np3', type: 'condition', position: { x: 400, y: 290 },
            data: {
                label: 'Promoter? (9-10)',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'var.nps_score', operator: 'greater_or_equal', value: 9 }] },
            },
        },
        {
            id: 'np4', type: 'action', position: { x: 650, y: 420 },
            data: {
                label: 'Thank + Review Request',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Thank you for the great rating, {{user.name}}! 🎉',
                    emailBody: 'Hi {{user.name}},\n\nThank you for your amazing score! Your support means the world to us. Would you be willing to leave a quick review? It takes 2 minutes and helps others discover {{company.name}}.\n\nLeave a review →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'np5', type: 'condition', position: { x: 200, y: 420 },
            data: {
                label: 'Detractor? (0-6)',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'var.nps_score', operator: 'less_or_equal', value: 6 }] },
            },
        },
        {
            id: 'np6', type: 'action', position: { x: 50, y: 560 },
            data: {
                label: 'Detractor Follow-Up',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'We want to make this right, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nThank you for your honest feedback. We\'re sorry {{company.name}} hasn\'t met your expectations. Can we schedule a quick call to understand what we can improve?\n\nBook a call →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'np7', type: 'action', position: { x: 50, y: 690 },
            data: {
                label: 'Create CS Task',
                nodeType: 'action',
                actionConfig: {
                    kind: 'create_task',
                    taskTitle: '📊 NPS Detractor: {{user.name}} scored {{var.nps_score}} — follow up immediately',
                    taskPriority: 'high',
                },
            },
        },
        {
            id: 'np8', type: 'action', position: { x: 350, y: 560 },
            data: {
                label: 'Passive Thank-You',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Thanks for your feedback, {{user.name}}',
                    emailBody: 'Hi {{user.name}},\n\nThank you for taking the time to share your thoughts about {{company.name}}. We\'re always working to improve, and your feedback helps us do that.\n\nBest,\nThe {{company.name}} Team',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'np9', type: 'exit', position: { x: 400, y: 830 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'NPS follow-up complete' } },
        },
    ],
    edges: [
        { id: 'npe1', source: 'np1', target: 'np2' },
        { id: 'npe2', source: 'np2', target: 'np3' },
        { id: 'npe3', source: 'np3', target: 'np4', sourceHandle: 'yes', label: 'yes' },
        { id: 'npe4', source: 'np3', target: 'np5', sourceHandle: 'no', label: 'no' },
        { id: 'npe5', source: 'np5', target: 'np6', sourceHandle: 'yes', label: 'yes' },
        { id: 'npe6', source: 'np5', target: 'np8', sourceHandle: 'no', label: 'no' },
        { id: 'npe7', source: 'np6', target: 'np7' },
        { id: 'npe8', source: 'np4', target: 'np9' },
        { id: 'npe9', source: 'np7', target: 'np9' },
        { id: 'npe10', source: 'np8', target: 'np9' },
    ],
};

/* ── 18. Post-Support CSAT ───────────────────────────────────────────── */

const csatSurveyTemplate: FlowTemplate = {
    id: 'ftpl_csat_survey',
    name: 'Post-Support CSAT Survey',
    description: 'Sends a satisfaction survey after a support ticket is resolved. Routes low scores to escalation.',
    category: 'feedback',
    trigger: 'Support ticket resolved',
    tags: ['csat', 'survey', 'support', 'satisfaction', 'feedback'],
    estimatedSetupMinutes: 5,
    settings: { ...defaultSettings, priority: 5 },
    variables: [
        { key: 'ticket_id', label: 'Ticket ID', type: 'string', source: 'event_property', sourceField: 'ticketId' },
    ],
    nodes: [
        {
            id: 'ct1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Ticket Resolved',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'support_ticket_resolved', allowReEntry: true },
            },
        },
        {
            id: 'ct2', type: 'delay', position: { x: 400, y: 170 },
            data: { label: 'Wait 2 Hours', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 120 } },
        },
        {
            id: 'ct3', type: 'action', position: { x: 400, y: 290 },
            data: {
                label: 'CSAT Survey Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'How was your support experience, {{user.name}}?',
                    emailBody: 'Hi {{user.name}},\n\nYou recently contacted {{company.name}} support (ticket #{{var.ticket_id}}). How did we do?\n\n😞 Poor  |  😐 Okay  |  😊 Great\n\nYour feedback helps us improve. Click one to rate.',
                    emailFromName: '{{company.name}} Support',
                },
            },
        },
        {
            id: 'ct4', type: 'exit', position: { x: 400, y: 410 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'CSAT survey sent' } },
        },
    ],
    edges: [
        { id: 'cte1', source: 'ct1', target: 'ct2' },
        { id: 'cte2', source: 'ct2', target: 'ct3' },
        { id: 'cte3', source: 'ct3', target: 'ct4' },
    ],
};

/* ── 19. Product Review Request ──────────────────────────────────────── */

const reviewRequestTemplate: FlowTemplate = {
    id: 'ftpl_review_request',
    name: 'Product Review Request',
    description: 'Requests a product review from long-term, satisfied users. Filters to only target engaged customers.',
    category: 'feedback',
    trigger: 'User active for 90+ days',
    tags: ['review', 'g2', 'capterra', 'testimonial', 'social proof'],
    estimatedSetupMinutes: 5,
    settings: { ...defaultSettings, priority: 3 },
    variables: [],
    nodes: [
        {
            id: 'rv1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: '90-Day Anniversary',
                nodeType: 'trigger',
                triggerConfig: { kind: 'date_property', dateProperty: 'createdAt', dateOffsetDays: 90, allowReEntry: false },
            },
        },
        {
            id: 'rv2', type: 'filter', position: { x: 400, y: 170 },
            data: {
                label: 'Active & Satisfied',
                nodeType: 'filter',
                filterConfig: {
                    logic: 'AND',
                    rules: [
                        { field: 'user.properties.last_login_days_ago', operator: 'less_than', value: 7 },
                        { field: 'user.npsScore', operator: 'greater_or_equal', value: 7 },
                    ],
                },
            },
        },
        {
            id: 'rv3', type: 'action', position: { x: 400, y: 290 },
            data: {
                label: 'Review Request Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '{{user.name}}, would you share your experience with {{company.name}}?',
                    emailBody: 'Hi {{user.name}},\n\nYou\'ve been using {{company.name}} for 3 months and we hope it\'s been valuable for {{account.name}}. Would you take 2 minutes to leave a review?\n\nIt helps other teams discover us, and we\'d genuinely appreciate it.\n\nLeave a review →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'rv4', type: 'exit', position: { x: 400, y: 410 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Review request sent' } },
        },
    ],
    edges: [
        { id: 'rve1', source: 'rv1', target: 'rv2' },
        { id: 'rve2', source: 'rv2', target: 'rv3' },
        { id: 'rve3', source: 'rv3', target: 'rv4' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  GROWTH — Referrals & Advocacy
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 20. Referral Program Campaign ───────────────────────────────────── */

const referralCampaignTemplate: FlowTemplate = {
    id: 'ftpl_referral_campaign',
    name: 'Referral Program Campaign',
    description: 'Invites power users and promoters to join the referral program. Includes reminder for non-responders.',
    category: 'growth',
    trigger: 'User becomes a power user or promoter',
    tags: ['referral', 'advocacy', 'growth', 'word of mouth', 'viral'],
    estimatedSetupMinutes: 8,
    goalEvent: 'referral_sent',
    settings: { ...defaultSettings, goalEvent: 'referral_sent', priority: 4 },
    variables: [],
    nodes: [
        {
            id: 'rf1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Power User Achieved',
                nodeType: 'trigger',
                triggerConfig: { kind: 'lifecycle_change', lifecycleTo: ['PowerUser'], allowReEntry: false },
            },
        },
        {
            id: 'rf2', type: 'delay', position: { x: 400, y: 170 },
            data: { label: 'Wait 3 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 } },
        },
        {
            id: 'rf3', type: 'action', position: { x: 400, y: 290 },
            data: {
                label: 'Referral Invitation',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Share {{company.name}} and get rewarded',
                    emailBody: 'Hi {{user.name}},\n\nYou\'re one of our most active users — and we\'d love your help spreading the word. Refer a friend to {{company.name}} and you both get rewarded.\n\nGet your referral link →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'rf4', type: 'delay', position: { x: 400, y: 410 },
            data: { label: 'Wait 7 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 10080 } },
        },
        {
            id: 'rf5', type: 'condition', position: { x: 400, y: 530 },
            data: {
                label: 'Referred Anyone?',
                nodeType: 'condition',
                conditionConfig: { logic: 'AND', rules: [{ field: 'user.properties.referral_count', operator: 'greater_than', value: 0 }] },
            },
        },
        {
            id: 'rf6', type: 'action', position: { x: 200, y: 660 },
            data: {
                label: 'Referral Reminder',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: 'Don\'t forget your {{company.name}} referral reward',
                    emailBody: 'Hi {{user.name}},\n\nYour referral link is still waiting. Share it with a friend and you both get a reward.\n\nShare now →',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'rf7', type: 'exit', position: { x: 400, y: 780 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Referral campaign complete' } },
        },
    ],
    edges: [
        { id: 'rfe1', source: 'rf1', target: 'rf2' },
        { id: 'rfe2', source: 'rf2', target: 'rf3' },
        { id: 'rfe3', source: 'rf3', target: 'rf4' },
        { id: 'rfe4', source: 'rf4', target: 'rf5' },
        { id: 'rfe5', source: 'rf5', target: 'rf6', sourceHandle: 'no', label: 'no' },
        { id: 'rfe6', source: 'rf5', target: 'rf7', sourceHandle: 'yes', label: 'yes' },
        { id: 'rfe7', source: 'rf6', target: 'rf7' },
    ],
};

/* ── 21. Milestone Celebration ───────────────────────────────────────── */

const milestoneCelebrationTemplate: FlowTemplate = {
    id: 'ftpl_milestone_celebration',
    name: 'Milestone Celebration',
    description: 'Celebrates user milestones (signup anniversary, usage milestones) with a personalized email and potential ambassador invitation.',
    category: 'growth',
    trigger: 'User reaches a milestone',
    tags: ['milestone', 'anniversary', 'celebration', 'loyalty', 'ambassador'],
    estimatedSetupMinutes: 5,
    settings: { ...defaultSettings, priority: 3 },
    variables: [
        { key: 'milestone_type', label: 'Milestone Type', type: 'string', source: 'event_property', sourceField: 'milestoneType' },
    ],
    nodes: [
        {
            id: 'ml1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Milestone Reached',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'milestone_reached', allowReEntry: true, reEntryCooldownMinutes: 43200 },
            },
        },
        {
            id: 'ml2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Celebration Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '🎉 Congratulations, {{user.name}}!',
                    emailBody: 'Hi {{user.name}},\n\nYou just hit a milestone with {{company.name}} — {{var.milestone_type}}! Thank you for being part of our community.\n\nHere\'s to many more milestones together.\n\nBest,\nThe {{company.name}} Team',
                    emailFromName: '{{company.name}} Team',
                },
            },
        },
        {
            id: 'ml3', type: 'exit', position: { x: 400, y: 290 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Milestone celebration sent' } },
        },
    ],
    edges: [
        { id: 'mle1', source: 'ml1', target: 'ml2' },
        { id: 'mle2', source: 'ml2', target: 'ml3' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 *  TRANSACTIONAL — Security & Account Alerts
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 22. Security Alert Flow ─────────────────────────────────────────── */

const securityAlertTemplate: FlowTemplate = {
    id: 'ftpl_security_alert',
    name: 'Security Alert Notification',
    description: 'Immediately notifies users of suspicious account activity (new device login, password change, etc.).',
    category: 'transactional',
    trigger: 'Security event detected',
    tags: ['security', 'alert', 'login', 'suspicious', 'password'],
    estimatedSetupMinutes: 5,
    settings: { ...defaultSettings, respectQuietHours: false, priority: 10 },
    variables: [
        { key: 'event_type', label: 'Security Event Type', type: 'string', source: 'event_property', sourceField: 'securityEventType' },
        { key: 'device_info', label: 'Device Info', type: 'string', source: 'event_property', sourceField: 'deviceInfo' },
    ],
    nodes: [
        {
            id: 'sa1', type: 'trigger', position: { x: 400, y: 50 },
            data: {
                label: 'Security Event',
                nodeType: 'trigger',
                triggerConfig: { kind: 'event_received', eventName: 'security_event', allowReEntry: true },
            },
        },
        {
            id: 'sa2', type: 'action', position: { x: 400, y: 170 },
            data: {
                label: 'Security Alert Email',
                nodeType: 'action',
                actionConfig: {
                    kind: 'send_email',
                    emailSubject: '🔒 Security alert for your {{company.name}} account',
                    emailBody: 'Hi {{user.name}},\n\nWe detected unusual activity on your {{company.name}} account:\n\nEvent: {{var.event_type}}\nDevice: {{var.device_info}}\n\nIf this was you, no action is needed. If not, secure your account immediately.\n\nSecure my account →',
                    emailFromName: '{{company.name}} Security',
                },
            },
        },
        {
            id: 'sa3', type: 'exit', position: { x: 400, y: 290 },
            data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Security alert sent' } },
        },
    ],
    edges: [
        { id: 'sae1', source: 'sa1', target: 'sa2' },
        { id: 'sae2', source: 'sa2', target: 'sa3' },
    ],
};

/* ═══════════════════════════════════════════════════════════════════════
 * FULL TEMPLATE CATALOGUE
 * ═══════════════════════════════════════════════════════════════════════ */

export const FLOW_TEMPLATES: FlowTemplate[] = [
    // Onboarding (3)
    welcomeSeriesTemplate,
    emailVerificationTemplate,
    teamInviteTemplate,

    // Activation (2)
    ahamomentTemplate,
    featureAdoptionTemplate,

    // Engagement (3)
    weeklyDigestTemplate,
    newFeatureTemplate,
    eventInviteTemplate,

    // Retention (3)
    inactivityReengagementTemplate,
    churnPreventionTemplate,
    cancellationSaveTemplate,

    // Expansion (2)
    upgradeOfferTemplate,
    usageLimitTemplate,

    // Revenue (3)
    trialConversionTemplate,
    dunningTemplate,
    renewalReminderTemplate,

    // Feedback (3)
    npsFollowUpTemplate,
    csatSurveyTemplate,
    reviewRequestTemplate,

    // Growth (2)
    referralCampaignTemplate,
    milestoneCelebrationTemplate,

    // Transactional (1)
    securityAlertTemplate,
];
