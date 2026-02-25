/* ==========================================================================
 * Seed Flow Definitions — Visual Builder Format
 *
 * These are complete FlowDefinition objects with nodes, edges, and
 * variables ready for the flow builder canvas.
 * ========================================================================== */

import type {
    FlowDefinition,
    FlowNodeDef,
    FlowEdgeDef,
    FlowVariable,
    FlowSettings,
    FlowMetrics,
} from '@/lib/definitions';

/* ── Helper ──────────────────────────────────────────────────────────── */

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

const emptyMetrics: FlowMetrics = {
    totalEnrolled: 0,
    currentlyActive: 0,
    completed: 0,
    goalReached: 0,
    exitedEarly: 0,
    errorCount: 0,
    revenueGenerated: 0,
    openRate: 0,
    clickRate: 0,
};

/* ═══════════════════════════════════════════════════════════════════════
 * Flow 1 — Trial Welcome Series
 * ═══════════════════════════════════════════════════════════════════════ */

const trialWelcomeNodes: FlowNodeDef[] = [
    {
        id: 'n1',
        type: 'trigger',
        position: { x: 400, y: 50 },
        data: {
            label: 'Trial Started',
            description: 'Fires when a user enters Trial lifecycle stage',
            nodeType: 'trigger',
            triggerConfig: {
                kind: 'lifecycle_change',
                lifecycleTo: ['Trial'],
                allowReEntry: false,
            },
        },
    },
    {
        id: 'n2',
        type: 'action',
        position: { x: 400, y: 180 },
        data: {
            label: 'Welcome Email',
            description: 'Send welcome email with quick-start guide',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Welcome to LifecycleOS — here\'s your 5-min setup',
                emailBody: 'Hi {{user.name}},\n\nWelcome! Here\'s how to get started in under 5 minutes...',
                emailFromName: 'LifecycleOS Team',
            },
            metrics: { entered: 1204, completed: 1200, failed: 4, skipped: 0 },
        },
    },
    {
        id: 'n3',
        type: 'delay',
        position: { x: 400, y: 310 },
        data: {
            label: 'Wait 1 Day',
            nodeType: 'delay',
            delayConfig: {
                kind: 'fixed_duration',
                durationMinutes: 1440,
            },
        },
    },
    {
        id: 'n4',
        type: 'condition',
        position: { x: 400, y: 440 },
        data: {
            label: 'Completed Setup?',
            description: 'Check if user finished the onboarding setup',
            nodeType: 'condition',
            conditionConfig: {
                logic: 'AND',
                rules: [{ field: 'user.featureUsageLast30Days', operator: 'contains', value: 'setup_completed' }],
            },
        },
    },
    {
        id: 'n5',
        type: 'action',
        position: { x: 200, y: 580 },
        data: {
            label: 'Setup Reminder',
            description: 'Remind user to complete setup',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'You\'re 2 steps away from your first lifecycle insight',
                emailBody: 'Hi {{user.name}},\n\nLooks like you haven\'t finished setup yet. Here\'s what you\'re missing...',
            },
            metrics: { entered: 340, completed: 338, failed: 2, skipped: 0 },
        },
    },
    {
        id: 'n6',
        type: 'action',
        position: { x: 600, y: 580 },
        data: {
            label: 'Aha Moment Guide',
            description: 'Guide user to their aha moment',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Here\'s what top teams discover in their first week',
                emailBody: 'Hi {{user.name}},\n\nGreat job completing setup! Now let\'s get you to your first insight...',
            },
            metrics: { entered: 864, completed: 860, failed: 4, skipped: 0 },
        },
    },
    {
        id: 'n7',
        type: 'delay',
        position: { x: 400, y: 710 },
        data: {
            label: 'Wait 3 Days',
            nodeType: 'delay',
            delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 },
        },
    },
    {
        id: 'n8',
        type: 'action',
        position: { x: 400, y: 840 },
        data: {
            label: 'Conversion Nudge',
            description: 'Encourage trial-to-paid conversion',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Your trial data shows real results — keep them',
                emailBody: 'Hi {{user.name}},\n\nYour trial is showing results. Here\'s what upgrading unlocks...',
            },
            metrics: { entered: 1024, completed: 1020, failed: 4, skipped: 0 },
        },
    },
    {
        id: 'n9',
        type: 'exit',
        position: { x: 400, y: 970 },
        data: {
            label: 'End',
            nodeType: 'exit',
            exitConfig: { reason: 'Trial welcome series complete' },
        },
    },
];

const trialWelcomeEdges: FlowEdgeDef[] = [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' },
    { id: 'e3', source: 'n3', target: 'n4' },
    { id: 'e4', source: 'n4', target: 'n5', sourceHandle: 'no', label: 'no' },
    { id: 'e5', source: 'n4', target: 'n6', sourceHandle: 'yes', label: 'yes' },
    { id: 'e6', source: 'n5', target: 'n7' },
    { id: 'e7', source: 'n6', target: 'n7' },
    { id: 'e8', source: 'n7', target: 'n8' },
    { id: 'e9', source: 'n8', target: 'n9' },
];

/* ═══════════════════════════════════════════════════════════════════════
 * Flow 2 — Churn Prevention
 * ═══════════════════════════════════════════════════════════════════════ */

const churnPreventionNodes: FlowNodeDef[] = [
    {
        id: 'cp1',
        type: 'trigger',
        position: { x: 400, y: 50 },
        data: {
            label: 'At-Risk Detected',
            description: 'User enters AtRisk lifecycle state',
            nodeType: 'trigger',
            triggerConfig: {
                kind: 'lifecycle_change',
                lifecycleTo: ['AtRisk'],
                allowReEntry: false,
                reEntryCooldownMinutes: 10080, // 7 days
            },
        },
    },
    {
        id: 'cp2',
        type: 'action',
        position: { x: 400, y: 180 },
        data: {
            label: 'Tag At-Risk',
            nodeType: 'action',
            actionConfig: { kind: 'add_tag', tag: 'churn-prevention-active' },
        },
    },
    {
        id: 'cp3',
        type: 'condition',
        position: { x: 400, y: 310 },
        data: {
            label: 'High MRR?',
            description: 'Check if MRR > $500 to route to priority path',
            nodeType: 'condition',
            conditionConfig: {
                logic: 'AND',
                rules: [{ field: 'user.mrr', operator: 'greater_than', value: 500 }],
            },
        },
    },
    {
        id: 'cp4',
        type: 'action',
        position: { x: 600, y: 440 },
        data: {
            label: 'Create Priority Task',
            description: 'Alert account manager for high-value accounts',
            nodeType: 'action',
            actionConfig: {
                kind: 'create_task',
                taskTitle: 'Priority: {{user.name}} ({{user.account.name}}) at risk — ${{user.mrr}}/mo',
                taskPriority: 'critical',
            },
            metrics: { entered: 87, completed: 87, failed: 0, skipped: 0 },
        },
    },
    {
        id: 'cp5',
        type: 'action',
        position: { x: 200, y: 440 },
        data: {
            label: 'Re-Engagement Email',
            description: 'Automated re-engagement for lower-value accounts',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'We noticed you\'ve been away — here\'s what\'s new',
                emailBody: 'Hi {{user.name}},\n\nWe\'ve made improvements since your last visit...',
            },
            metrics: { entered: 342, completed: 340, failed: 2, skipped: 0 },
        },
    },
    {
        id: 'cp6',
        type: 'delay',
        position: { x: 400, y: 570 },
        data: {
            label: 'Wait 3 Days',
            nodeType: 'delay',
            delayConfig: { kind: 'fixed_duration', durationMinutes: 4320 },
        },
    },
    {
        id: 'cp7',
        type: 'condition',
        position: { x: 400, y: 700 },
        data: {
            label: 'Still At Risk?',
            nodeType: 'condition',
            conditionConfig: {
                logic: 'AND',
                rules: [{ field: 'user.lifecycleState', operator: 'equals', value: 'AtRisk' }],
            },
        },
    },
    {
        id: 'cp8',
        type: 'action',
        position: { x: 200, y: 830 },
        data: {
            label: 'Escalation Email',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Before you go — we\'d love to make this right',
                emailBody: 'Hi {{user.name}},\n\nWe want to understand what\'s not working and help fix it...',
            },
            metrics: { entered: 198, completed: 196, failed: 2, skipped: 0 },
        },
    },
    {
        id: 'cp9',
        type: 'action',
        position: { x: 600, y: 830 },
        data: {
            label: 'Remove Tag',
            description: 'User recovered — remove at-risk tag',
            nodeType: 'action',
            actionConfig: { kind: 'remove_tag', tag: 'churn-prevention-active' },
        },
    },
    {
        id: 'cp10',
        type: 'exit',
        position: { x: 400, y: 960 },
        data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Churn prevention complete' } },
    },
];

const churnPreventionEdges: FlowEdgeDef[] = [
    { id: 'ce1', source: 'cp1', target: 'cp2' },
    { id: 'ce2', source: 'cp2', target: 'cp3' },
    { id: 'ce3', source: 'cp3', target: 'cp4', sourceHandle: 'yes', label: 'yes' },
    { id: 'ce4', source: 'cp3', target: 'cp5', sourceHandle: 'no', label: 'no' },
    { id: 'ce5', source: 'cp4', target: 'cp6' },
    { id: 'ce6', source: 'cp5', target: 'cp6' },
    { id: 'ce7', source: 'cp6', target: 'cp7' },
    { id: 'ce8', source: 'cp7', target: 'cp8', sourceHandle: 'yes', label: 'yes' },
    { id: 'ce9', source: 'cp7', target: 'cp9', sourceHandle: 'no', label: 'no' },
    { id: 'ce10', source: 'cp8', target: 'cp10' },
    { id: 'ce11', source: 'cp9', target: 'cp10' },
];

/* ═══════════════════════════════════════════════════════════════════════
 * Flow 3 — Expansion Opportunity
 * ═══════════════════════════════════════════════════════════════════════ */

const expansionNodes: FlowNodeDef[] = [
    {
        id: 'ex1',
        type: 'trigger',
        position: { x: 400, y: 50 },
        data: {
            label: 'Expansion Ready',
            description: 'User enters ExpansionReady lifecycle state',
            nodeType: 'trigger',
            triggerConfig: {
                kind: 'lifecycle_change',
                lifecycleTo: ['ExpansionReady'],
                allowReEntry: false,
            },
        },
    },
    {
        id: 'ex2',
        type: 'split',
        position: { x: 400, y: 180 },
        data: {
            label: 'A/B: Upgrade Message',
            description: 'Test two upgrade messaging approaches',
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
        id: 'ex3',
        type: 'action',
        position: { x: 200, y: 310 },
        data: {
            label: 'Value Upgrade Email',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'You\'re getting great results — unlock even more',
                emailBody: 'Hi {{user.name}},\n\nYour usage shows you\'re ready for the next level...',
            },
            metrics: { entered: 156, completed: 155, failed: 1, skipped: 0 },
        },
    },
    {
        id: 'ex4',
        type: 'action',
        position: { x: 600, y: 310 },
        data: {
            label: 'Urgency Upgrade Email',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'You\'re approaching your plan limits — upgrade now',
                emailBody: 'Hi {{user.name}},\n\nYou\'re at {{var.seatUsagePercent}}% of your seat limit...',
            },
            metrics: { entered: 148, completed: 147, failed: 1, skipped: 0 },
        },
    },
    {
        id: 'ex5',
        type: 'delay',
        position: { x: 400, y: 440 },
        data: {
            label: 'Wait 5 Days',
            nodeType: 'delay',
            delayConfig: { kind: 'fixed_duration', durationMinutes: 7200 },
        },
    },
    {
        id: 'ex6',
        type: 'action',
        position: { x: 400, y: 570 },
        data: {
            label: 'Webhook: CRM Update',
            description: 'Update CRM with expansion opportunity data',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_webhook',
                webhookUrl: 'https://api.crm.example.com/opportunities',
                webhookMethod: 'POST',
                webhookPayload: '{"userId":"{{user.id}}","signal":"expansion","mrr":{{user.mrr}}}',
            },
            metrics: { entered: 280, completed: 278, failed: 2, skipped: 0 },
        },
    },
    {
        id: 'ex7',
        type: 'exit',
        position: { x: 400, y: 700 },
        data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Expansion flow complete' } },
    },
];

const expansionEdges: FlowEdgeDef[] = [
    { id: 'ee1', source: 'ex1', target: 'ex2' },
    { id: 'ee2', source: 'ex2', target: 'ex3', sourceHandle: 'variant-a', label: 'A' },
    { id: 'ee3', source: 'ex2', target: 'ex4', sourceHandle: 'variant-b', label: 'B' },
    { id: 'ee4', source: 'ex3', target: 'ex5' },
    { id: 'ee5', source: 'ex4', target: 'ex5' },
    { id: 'ee6', source: 'ex5', target: 'ex6' },
    { id: 'ee7', source: 'ex6', target: 'ex7' },
];

/* ═══════════════════════════════════════════════════════════════════════
 * Flow 4 — NPS Follow-Up
 * ═══════════════════════════════════════════════════════════════════════ */

const npsFollowUpNodes: FlowNodeDef[] = [
    {
        id: 'nps1',
        type: 'trigger',
        position: { x: 400, y: 50 },
        data: {
            label: 'NPS Response',
            description: 'Triggered when user submits NPS survey',
            nodeType: 'trigger',
            triggerConfig: {
                kind: 'event_received',
                eventName: 'nps_submitted',
                allowReEntry: true,
                reEntryCooldownMinutes: 43200, // 30 days
            },
        },
    },
    {
        id: 'nps2',
        type: 'action',
        position: { x: 400, y: 180 },
        data: {
            label: 'Store NPS Score',
            nodeType: 'action',
            actionConfig: {
                kind: 'set_variable',
                variableKey: 'nps_score',
                variableValue: '{{event.npsScore}}',
            },
        },
    },
    {
        id: 'nps3',
        type: 'condition',
        position: { x: 400, y: 310 },
        data: {
            label: 'Promoter?',
            description: 'NPS >= 9',
            nodeType: 'condition',
            conditionConfig: {
                logic: 'AND',
                rules: [{ field: 'var.nps_score', operator: 'greater_or_equal', value: 9 }],
            },
        },
    },
    {
        id: 'nps4',
        type: 'action',
        position: { x: 600, y: 440 },
        data: {
            label: 'Thank Promoter',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Thank you for your support! 🎉',
                emailBody: 'Hi {{user.name}},\n\nThank you for the great rating! Would you be willing to leave a review?',
            },
        },
    },
    {
        id: 'nps5',
        type: 'condition',
        position: { x: 200, y: 440 },
        data: {
            label: 'Detractor?',
            description: 'NPS <= 6',
            nodeType: 'condition',
            conditionConfig: {
                logic: 'AND',
                rules: [{ field: 'var.nps_score', operator: 'less_or_equal', value: 6 }],
            },
        },
    },
    {
        id: 'nps6',
        type: 'action',
        position: { x: 50, y: 570 },
        data: {
            label: 'Detractor Follow-Up',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'We value your feedback — let\'s talk',
                emailBody: 'Hi {{user.name}},\n\nWe\'re sorry to hear about your experience. Can we schedule a call?',
            },
        },
    },
    {
        id: 'nps7',
        type: 'action',
        position: { x: 50, y: 700 },
        data: {
            label: 'Create Follow-Up Task',
            nodeType: 'action',
            actionConfig: {
                kind: 'create_task',
                taskTitle: 'NPS Detractor: {{user.name}} scored {{var.nps_score}} — follow up',
                taskPriority: 'high',
            },
        },
    },
    {
        id: 'nps8',
        type: 'action',
        position: { x: 350, y: 570 },
        data: {
            label: 'Passive Thank You',
            nodeType: 'action',
            actionConfig: {
                kind: 'send_email',
                emailSubject: 'Thanks for your feedback',
                emailBody: 'Hi {{user.name}},\n\nThanks for sharing your thoughts. We\'re always working to improve.',
            },
        },
    },
    {
        id: 'nps9',
        type: 'exit',
        position: { x: 400, y: 830 },
        data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'NPS follow-up complete' } },
    },
];

const npsFollowUpEdges: FlowEdgeDef[] = [
    { id: 'ne1', source: 'nps1', target: 'nps2' },
    { id: 'ne2', source: 'nps2', target: 'nps3' },
    { id: 'ne3', source: 'nps3', target: 'nps4', sourceHandle: 'yes', label: 'yes' },
    { id: 'ne4', source: 'nps3', target: 'nps5', sourceHandle: 'no', label: 'no' },
    { id: 'ne5', source: 'nps5', target: 'nps6', sourceHandle: 'yes', label: 'yes' },
    { id: 'ne6', source: 'nps5', target: 'nps8', sourceHandle: 'no', label: 'no' },
    { id: 'ne7', source: 'nps6', target: 'nps7' },
    { id: 'ne8', source: 'nps4', target: 'nps9' },
    { id: 'ne9', source: 'nps7', target: 'nps9' },
    { id: 'ne10', source: 'nps8', target: 'nps9' },
];

/* ═══════════════════════════════════════════════════════════════════════
 * Export All Seed Flow Definitions
 * ═══════════════════════════════════════════════════════════════════════ */

export const seedFlowDefinitions: FlowDefinition[] = [
    {
        id: 'fdef_1',
        name: 'Trial Welcome Series',
        description: 'Guides new trial users through setup, aha moment, and conversion with personalized branching based on onboarding progress.',
        trigger: 'User starts trial',
        status: 'active',
        version: 3,
        nodes: trialWelcomeNodes,
        edges: trialWelcomeEdges,
        variables: [
            { key: 'user_plan', label: 'User Plan', type: 'string', source: 'user_property', sourceField: 'plan' },
            { key: 'days_since_signup', label: 'Days Since Signup', type: 'number', defaultValue: 0 },
        ],
        settings: { ...defaultSettings, goalEvent: 'subscription_started', goalTimeout: 20160, priority: 8 },
        metrics: { totalEnrolled: 1204, currentlyActive: 180, completed: 890, goalReached: 231, exitedEarly: 103, errorCount: 4, revenueGenerated: 8450, openRate: 58.4, clickRate: 12.1 },
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-06-10T14:30:00Z',
        publishedAt: '2025-01-18T09:00:00Z',
    },
    {
        id: 'fdef_2',
        name: 'Churn Prevention',
        description: 'Automated intervention when users move to AtRisk state. Routes high-MRR accounts to manual outreach and low-MRR to automated re-engagement.',
        trigger: 'User enters "At Risk" state',
        status: 'active',
        version: 5,
        nodes: churnPreventionNodes,
        edges: churnPreventionEdges,
        variables: [
            { key: 'risk_score', label: 'Churn Risk Score', type: 'number', source: 'user_property', sourceField: 'churnRiskScore' },
            { key: 'mrr', label: 'Monthly Revenue', type: 'number', source: 'user_property', sourceField: 'mrr' },
        ],
        settings: { ...defaultSettings, goalEvent: 'lifecycle_recovered', goalTimeout: 43200, priority: 10 },
        metrics: { totalEnrolled: 429, currentlyActive: 42, completed: 331, goalReached: 187, exitedEarly: 49, errorCount: 2, revenueGenerated: 14200, openRate: 42.9, clickRate: 8.3 },
        createdAt: '2025-02-01T10:00:00Z',
        updatedAt: '2025-06-12T11:00:00Z',
        publishedAt: '2025-02-05T09:00:00Z',
    },
    {
        id: 'fdef_3',
        name: 'Expansion Opportunity',
        description: 'A/B tested upgrade messaging for users showing expansion signals, with CRM webhook integration for sales handoff.',
        trigger: 'User enters "Expansion Ready" state',
        status: 'active',
        version: 2,
        nodes: expansionNodes,
        edges: expansionEdges,
        variables: [
            { key: 'seatUsagePercent', label: 'Seat Usage %', type: 'number', defaultValue: 0, source: 'user_property', sourceField: 'seatCount' },
            { key: 'current_plan', label: 'Current Plan', type: 'string', source: 'user_property', sourceField: 'plan' },
        ],
        settings: { ...defaultSettings, goalEvent: 'plan_upgraded', goalTimeout: 30240, priority: 7 },
        metrics: { totalEnrolled: 304, currentlyActive: 24, completed: 253, goalReached: 89, exitedEarly: 27, errorCount: 2, revenueGenerated: 24500, openRate: 65.2, clickRate: 20.5 },
        createdAt: '2025-03-10T10:00:00Z',
        updatedAt: '2025-06-11T16:45:00Z',
        publishedAt: '2025-03-12T09:00:00Z',
    },
    {
        id: 'fdef_4',
        name: 'NPS Follow-Up',
        description: 'Context-aware follow-up based on NPS score: promoters get review requests, detractors get personal outreach, passives get appreciation.',
        trigger: 'NPS survey completed',
        status: 'active',
        version: 1,
        nodes: npsFollowUpNodes,
        edges: npsFollowUpEdges,
        variables: [
            { key: 'nps_score', label: 'NPS Score', type: 'number', defaultValue: 0, source: 'event_property', sourceField: 'npsScore' },
        ],
        settings: { ...defaultSettings, priority: 6 },
        metrics: { totalEnrolled: 562, currentlyActive: 18, completed: 520, goalReached: 0, exitedEarly: 24, errorCount: 0, revenueGenerated: 0, openRate: 77.4, clickRate: 34.8 },
        createdAt: '2025-04-20T10:00:00Z',
        updatedAt: '2025-06-09T10:15:00Z',
        publishedAt: '2025-04-22T09:00:00Z',
    },
    {
        id: 'fdef_5',
        name: 'Contract Renewal Reminder',
        description: 'Proactive renewal reminders starting 30 days before contract end, with escalation for non-responders.',
        trigger: 'Renewal approaching (30 days)',
        status: 'draft',
        version: 1,
        nodes: [
            {
                id: 'cr1', type: 'trigger', position: { x: 400, y: 50 },
                data: {
                    label: 'Renewal Approaching',
                    description: '30 days before contract renewal date',
                    nodeType: 'trigger',
                    triggerConfig: { kind: 'date_property', dateProperty: 'contractRenewalDate', dateOffsetDays: -30, allowReEntry: false },
                },
            },
            {
                id: 'cr2', type: 'action', position: { x: 400, y: 180 },
                data: {
                    label: 'Renewal Notice',
                    nodeType: 'action',
                    actionConfig: { kind: 'send_email', emailSubject: 'Your renewal is coming up — let\'s make it seamless', emailBody: 'Hi {{user.name}},\n\nYour contract renews in 30 days...' },
                },
            },
            {
                id: 'cr3', type: 'delay', position: { x: 400, y: 310 },
                data: { label: 'Wait 14 Days', nodeType: 'delay', delayConfig: { kind: 'fixed_duration', durationMinutes: 20160 } },
            },
            {
                id: 'cr4', type: 'action', position: { x: 400, y: 440 },
                data: {
                    label: 'Final Reminder',
                    nodeType: 'action',
                    actionConfig: { kind: 'send_email', emailSubject: 'Your contract renews in 16 days', emailBody: 'Hi {{user.name}},\n\nJust a reminder...' },
                },
            },
            {
                id: 'cr5', type: 'exit', position: { x: 400, y: 570 },
                data: { label: 'End', nodeType: 'exit', exitConfig: { reason: 'Renewal reminder complete' } },
            },
        ],
        edges: [
            { id: 'cre1', source: 'cr1', target: 'cr2' },
            { id: 'cre2', source: 'cr2', target: 'cr3' },
            { id: 'cre3', source: 'cr3', target: 'cr4' },
            { id: 'cre4', source: 'cr4', target: 'cr5' },
        ],
        variables: [],
        settings: { ...defaultSettings, priority: 9 },
        metrics: emptyMetrics,
        createdAt: '2025-06-10T10:00:00Z',
        updatedAt: '2025-06-10T10:00:00Z',
    },
];
