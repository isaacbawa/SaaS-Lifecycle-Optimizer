import type {
  User, Account, EmailFlow, RevenueData, ActivationData,
  DeliverabilityData, RetentionCohort, ActivationMilestone,
  ExpansionOpportunity, RevenueWaterfall, ActivityEntry,
  SendingDomain, IPWarmingStatus, TeamMember, WebhookConfig,
} from '@/lib/definitions';

/* ==========================================================================
 * Seed / demo data — production-grade realistic dataset
 * In production, all data comes from PostgreSQL + ClickHouse + Kafka
 * ========================================================================== */

// ── Users ──────────────────────────────────────────────────────────────────

export const users: User[] = [
  {
    id: 'usr_1', name: 'Alex Johnson', email: 'alex.j@innovateinc.com', initials: 'AJ',
    account: { id: 'acc_1', name: 'Innovate Inc.' },
    lifecycleState: 'AtRisk', previousState: 'Activated',
    mrr: 99, lastLoginDaysAgo: 15, loginFrequencyLast7Days: 1, loginFrequencyLast30Days: 4,
    featureUsageLast30Days: ['Dashboard', 'Reports'],
    sessionDepthMinutes: 3, plan: 'Growth', signupDate: '2025-06-12', activatedDate: '2025-06-18',
    churnRiskScore: 72, expansionScore: 10, npsScore: 5,
    seatCount: 3, seatLimit: 5, apiCallsLast30Days: 120, apiLimit: 5000,
    supportTicketsLast30Days: 1, supportEscalations: 0, daysUntilRenewal: 245,
  },
  {
    id: 'usr_2', name: 'Maria Garcia', email: 'maria.g@solutionsllc.com', initials: 'MG',
    account: { id: 'acc_2', name: 'Solutions LLC' },
    lifecycleState: 'PowerUser', previousState: 'Activated',
    mrr: 249, lastLoginDaysAgo: 0, loginFrequencyLast7Days: 7, loginFrequencyLast30Days: 28,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Exports', 'Integrations', 'API Access'],
    sessionDepthMinutes: 45, plan: 'Business', signupDate: '2025-03-01', activatedDate: '2025-03-04',
    churnRiskScore: 5, expansionScore: 85, npsScore: 9,
    seatCount: 28, seatLimit: 30, apiCallsLast30Days: 48200, apiLimit: 50000,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 180,
  },
  {
    id: 'usr_3', name: 'James Smith', email: 'james.s@innovateinc.com', initials: 'JS',
    account: { id: 'acc_1', name: 'Innovate Inc.' },
    lifecycleState: 'Trial',
    mrr: 0, lastLoginDaysAgo: 2, loginFrequencyLast7Days: 5, loginFrequencyLast30Days: 5,
    featureUsageLast30Days: ['Dashboard'],
    sessionDepthMinutes: 8, plan: 'Trial', signupDate: '2026-02-15',
    churnRiskScore: 25, expansionScore: 0,
    seatCount: 1, seatLimit: 3, apiCallsLast30Days: 15, apiLimit: 500,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 12,
  },
  {
    id: 'usr_4', name: 'Patricia Williams', email: 'pat.w@synergycorp.com', initials: 'PW',
    account: { id: 'acc_3', name: 'Synergy Corp' },
    lifecycleState: 'ExpansionReady', previousState: 'PowerUser',
    mrr: 499, lastLoginDaysAgo: 0, loginFrequencyLast7Days: 10, loginFrequencyLast30Days: 38,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Exports', 'API Access', 'SSO', 'Webhooks', 'Custom Flows'],
    sessionDepthMinutes: 62, plan: 'Enterprise', signupDate: '2025-01-15', activatedDate: '2025-01-17',
    churnRiskScore: 2, expansionScore: 92, npsScore: 10,
    seatCount: 48, seatLimit: 50, apiCallsLast30Days: 95000, apiLimit: 100000,
    supportTicketsLast30Days: 2, supportEscalations: 0, daysUntilRenewal: 45,
  },
  {
    id: 'usr_5', name: 'Robert Brown', email: 'rob.b@datawave.io', initials: 'RB',
    account: { id: 'acc_4', name: 'DataWave' },
    lifecycleState: 'Churned', previousState: 'AtRisk',
    mrr: 0, lastLoginDaysAgo: 45, loginFrequencyLast7Days: 0, loginFrequencyLast30Days: 0,
    featureUsageLast30Days: [],
    sessionDepthMinutes: 0, plan: 'Starter', signupDate: '2025-08-20', activatedDate: '2025-09-01',
    churnRiskScore: 100, expansionScore: 0, npsScore: 2,
    seatCount: 1, seatLimit: 3, apiCallsLast30Days: 0, apiLimit: 1000,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 365,
  },
  {
    id: 'usr_6', name: 'Linda Davis', email: 'linda.d@solutionsllc.com', initials: 'LD',
    account: { id: 'acc_2', name: 'Solutions LLC' },
    lifecycleState: 'AtRisk', previousState: 'Activated',
    mrr: 249, lastLoginDaysAgo: 22, loginFrequencyLast7Days: 0, loginFrequencyLast30Days: 2,
    featureUsageLast30Days: ['Dashboard'],
    sessionDepthMinutes: 2, plan: 'Business', signupDate: '2025-04-10', activatedDate: '2025-04-15',
    churnRiskScore: 78, expansionScore: 5, npsScore: 4,
    seatCount: 4, seatLimit: 30, apiCallsLast30Days: 45, apiLimit: 50000,
    supportTicketsLast30Days: 4, supportEscalations: 2, daysUntilRenewal: 22,
  },
  {
    id: 'usr_7', name: 'Michael Chen', email: 'michael@quantumleap.dev', initials: 'MC',
    account: { id: 'acc_5', name: 'Quantum Leap' },
    lifecycleState: 'Activated', previousState: 'Trial',
    mrr: 149, lastLoginDaysAgo: 1, loginFrequencyLast7Days: 6, loginFrequencyLast30Days: 22,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Flows'],
    sessionDepthMinutes: 25, plan: 'Growth', signupDate: '2025-11-01', activatedDate: '2025-11-08',
    churnRiskScore: 12, expansionScore: 45, npsScore: 8,
    seatCount: 7, seatLimit: 10, apiCallsLast30Days: 3200, apiLimit: 5000,
    supportTicketsLast30Days: 1, supportEscalations: 0, daysUntilRenewal: 120,
  },
  {
    id: 'usr_8', name: 'Sarah Kim', email: 'sarah@apexdigital.co', initials: 'SK',
    account: { id: 'acc_6', name: 'Apex Digital' },
    lifecycleState: 'Trial',
    mrr: 0, lastLoginDaysAgo: 5, loginFrequencyLast7Days: 2, loginFrequencyLast30Days: 6,
    featureUsageLast30Days: ['Dashboard', 'Reports'],
    sessionDepthMinutes: 12, plan: 'Trial', signupDate: '2026-02-01',
    churnRiskScore: 35, expansionScore: 0,
    seatCount: 2, seatLimit: 3, apiCallsLast30Days: 80, apiLimit: 500,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 300,
  },
  {
    id: 'usr_9', name: 'David Park', email: 'david@cloudpeak.io', initials: 'DP',
    account: { id: 'acc_7', name: 'CloudPeak Systems' },
    lifecycleState: 'PowerUser', previousState: 'Activated',
    mrr: 349, lastLoginDaysAgo: 0, loginFrequencyLast7Days: 7, loginFrequencyLast30Days: 30,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Exports', 'Integrations', 'Flows', 'API Access'],
    sessionDepthMinutes: 55, plan: 'Business', signupDate: '2025-05-20', activatedDate: '2025-05-22',
    churnRiskScore: 3, expansionScore: 78, npsScore: 9,
    seatCount: 18, seatLimit: 20, apiCallsLast30Days: 42000, apiLimit: 50000,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 90,
  },
  {
    id: 'usr_10', name: 'Emma Wilson', email: 'emma@brightpath.co', initials: 'EW',
    account: { id: 'acc_8', name: 'BrightPath' },
    lifecycleState: 'Reactivated', previousState: 'Churned',
    mrr: 99, lastLoginDaysAgo: 3, loginFrequencyLast7Days: 3, loginFrequencyLast30Days: 8,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics'],
    sessionDepthMinutes: 18, plan: 'Growth', signupDate: '2025-07-15', activatedDate: '2026-01-20',
    churnRiskScore: 30, expansionScore: 20, npsScore: 7,
    seatCount: 2, seatLimit: 5, apiCallsLast30Days: 500, apiLimit: 5000,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 200,
  },
  {
    id: 'usr_11', name: 'Tom Rivera', email: 'tom@nextstep.app', initials: 'TR',
    account: { id: 'acc_9', name: 'NextStep App' },
    lifecycleState: 'Lead',
    mrr: 0, lastLoginDaysAgo: 0, loginFrequencyLast7Days: 1, loginFrequencyLast30Days: 1,
    featureUsageLast30Days: [],
    sessionDepthMinutes: 0, plan: 'Trial', signupDate: '2026-02-22',
    churnRiskScore: 15, expansionScore: 0,
    seatCount: 1, seatLimit: 3, apiCallsLast30Days: 0, apiLimit: 500,
    supportTicketsLast30Days: 3, supportEscalations: 1, daysUntilRenewal: -5,
  },
  {
    id: 'usr_12', name: 'Rachel Foster', email: 'rachel@formflow.io', initials: 'RF',
    account: { id: 'acc_10', name: 'FormFlow' },
    lifecycleState: 'Activated', previousState: 'Trial',
    mrr: 49, lastLoginDaysAgo: 1, loginFrequencyLast7Days: 5, loginFrequencyLast30Days: 18,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Flows'],
    sessionDepthMinutes: 20, plan: 'Starter', signupDate: '2025-12-10', activatedDate: '2025-12-18',
    churnRiskScore: 15, expansionScore: 55, npsScore: 8,
    seatCount: 2, seatLimit: 3, apiCallsLast30Days: 800, apiLimit: 1000,
    supportTicketsLast30Days: 0, supportEscalations: 0, daysUntilRenewal: 340,
  },
];

// ── Accounts ───────────────────────────────────────────────────────────────

export const accounts: Account[] = [
  {
    id: 'acc_1', name: 'Innovate Inc.', initials: 'II', mrr: 1238, arr: 14856,
    userCount: 15, seatLimit: 20, health: 'Fair', plan: 'Business',
    lifecycleDistribution: { Trial: 2, Activated: 5, AtRisk: 3, PowerUser: 4, Churned: 1 },
    churnRiskScore: 48, expansionScore: 30,
    signupDate: '2025-03-15', lastActivityDate: '2026-02-20',
    industry: 'Technology', primaryContact: 'Alex Johnson', primaryContactEmail: 'alex.j@innovateinc.com',
    domain: 'innovateinc.com', contractRenewalDate: '2026-09-15',
    tags: ['mid-market', 'tech', 'at-risk'],
  },
  {
    id: 'acc_2', name: 'Solutions LLC', initials: 'SL', mrr: 2840, arr: 34080,
    userCount: 32, seatLimit: 50, health: 'Good', plan: 'Business',
    lifecycleDistribution: { Activated: 12, PowerUser: 15, AtRisk: 3, ExpansionReady: 2 },
    churnRiskScore: 18, expansionScore: 72,
    signupDate: '2025-01-10', lastActivityDate: '2026-02-23',
    industry: 'Consulting', primaryContact: 'Maria Garcia', primaryContactEmail: 'maria.g@solutionsllc.com',
    domain: 'solutionsllc.com', contractRenewalDate: '2026-07-10',
    tags: ['enterprise-ready', 'consulting', 'expansion'],
  },
  {
    id: 'acc_3', name: 'Synergy Corp', initials: 'SC', mrr: 4990, arr: 59880,
    userCount: 50, seatLimit: 50, health: 'Good', plan: 'Enterprise',
    lifecycleDistribution: { Activated: 10, PowerUser: 30, ExpansionReady: 10 },
    churnRiskScore: 5, expansionScore: 95,
    signupDate: '2025-01-15', lastActivityDate: '2026-02-23',
    industry: 'Finance', primaryContact: 'Patricia Williams', primaryContactEmail: 'pat.w@synergycorp.com',
    domain: 'synergycorp.com', contractRenewalDate: '2026-06-15',
    tags: ['enterprise', 'finance', 'expansion-ready'],
  },
  {
    id: 'acc_4', name: 'DataWave', initials: 'DW', mrr: 0, arr: 0,
    userCount: 1, seatLimit: 3, health: 'Poor', plan: 'Starter',
    lifecycleDistribution: { Churned: 1 },
    churnRiskScore: 100, expansionScore: 0,
    signupDate: '2025-08-20', lastActivityDate: '2026-01-08',
    industry: 'Data & Analytics', primaryContact: 'Robert Brown', primaryContactEmail: 'rob.b@datawave.io',
    domain: 'datawave.io',
    tags: ['churned', 'startup'],
  },
  {
    id: 'acc_5', name: 'Quantum Leap', initials: 'QL', mrr: 999, arr: 11988,
    userCount: 10, seatLimit: 10, health: 'Good', plan: 'Growth',
    lifecycleDistribution: { Activated: 6, PowerUser: 3, Trial: 1 },
    churnRiskScore: 12, expansionScore: 68,
    signupDate: '2025-09-01', lastActivityDate: '2026-02-22',
    industry: 'Technology', primaryContact: 'Michael Chen', primaryContactEmail: 'michael@quantumleap.dev',
    domain: 'quantumleap.dev', contractRenewalDate: '2026-09-01',
    tags: ['growth', 'tech', 'expansion-candidate'],
  },
  {
    id: 'acc_6', name: 'Apex Digital', initials: 'AD', mrr: 0, arr: 0,
    userCount: 3, seatLimit: 3, health: 'Fair', plan: 'Trial',
    lifecycleDistribution: { Trial: 2, Lead: 1 },
    churnRiskScore: 35, expansionScore: 0,
    signupDate: '2026-02-01', lastActivityDate: '2026-02-18',
    industry: 'Marketing', primaryContact: 'Sarah Kim', primaryContactEmail: 'sarah@apexdigital.co',
    domain: 'apexdigital.co',
    tags: ['trial', 'agency'],
  },
  {
    id: 'acc_7', name: 'CloudPeak Systems', initials: 'CP', mrr: 3490, arr: 41880,
    userCount: 20, seatLimit: 20, health: 'Good', plan: 'Business',
    lifecycleDistribution: { Activated: 5, PowerUser: 12, ExpansionReady: 3 },
    churnRiskScore: 8, expansionScore: 82,
    signupDate: '2025-05-01', lastActivityDate: '2026-02-23',
    industry: 'Cloud Infrastructure', primaryContact: 'David Park', primaryContactEmail: 'david@cloudpeak.io',
    domain: 'cloudpeak.io', contractRenewalDate: '2026-11-01',
    tags: ['enterprise-ready', 'infrastructure', 'expansion-ready'],
  },
  {
    id: 'acc_8', name: 'BrightPath', initials: 'BP', mrr: 99, arr: 1188,
    userCount: 3, seatLimit: 5, health: 'Fair', plan: 'Growth',
    lifecycleDistribution: { Reactivated: 1, Activated: 1, Trial: 1 },
    churnRiskScore: 30, expansionScore: 20,
    signupDate: '2025-07-15', lastActivityDate: '2026-02-20',
    industry: 'Education', primaryContact: 'Emma Wilson', primaryContactEmail: 'emma@brightpath.co',
    domain: 'brightpath.co',
    tags: ['reactivated', 'education'],
  },
  {
    id: 'acc_9', name: 'NextStep App', initials: 'NS', mrr: 0, arr: 0,
    userCount: 1, seatLimit: 3, health: 'Fair', plan: 'Trial',
    lifecycleDistribution: { Lead: 1 },
    churnRiskScore: 15, expansionScore: 0,
    signupDate: '2026-02-22', lastActivityDate: '2026-02-22',
    industry: 'Productivity', primaryContact: 'Tom Rivera', primaryContactEmail: 'tom@nextstep.app',
    domain: 'nextstep.app',
    tags: ['new', 'trial'],
  },
  {
    id: 'acc_10', name: 'FormFlow', initials: 'FF', mrr: 49, arr: 588,
    userCount: 2, seatLimit: 3, health: 'Good', plan: 'Starter',
    lifecycleDistribution: { Activated: 2 },
    churnRiskScore: 15, expansionScore: 55,
    signupDate: '2025-12-10', lastActivityDate: '2026-02-22',
    industry: 'Forms & Surveys', primaryContact: 'Rachel Foster', primaryContactEmail: 'rachel@formflow.io',
    domain: 'formflow.io',
    tags: ['starter', 'high-engagement'],
  },
];

// ── Email Flows ────────────────────────────────────────────────────────────

export const emailFlows: EmailFlow[] = [
  {
    id: 'flow_1', name: 'Trial Welcome Series', description: 'Guides new trial users through setup, aha moment, and conversion.',
    trigger: 'User starts trial', triggerType: 'lifecycle_change', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'Welcome & Quick Start', config: { subject: 'Welcome to LifecycleOS — here\'s your 5-min setup', delay: 0 }, sent: 1204, opened: 722, clicked: 168 },
      { id: 's2', type: 'delay', name: 'Wait 1 day', config: { hours: 24 } },
      { id: 's3', type: 'condition', name: 'Completed setup?', config: { event: 'setup_completed', branch: 'yes/no' } },
      { id: 's4', type: 'email', name: 'Setup Reminder (No)', config: { subject: 'You\'re 2 steps away from your first lifecycle insight', delay: 0 }, sent: 340, opened: 180, clicked: 72 },
      { id: 's5', type: 'email', name: 'Aha Moment Guide (Yes)', config: { subject: 'Here\'s what top teams discover in their first week', delay: 0 }, sent: 864, opened: 542, clicked: 96 },
      { id: 's6', type: 'delay', name: 'Wait 3 days', config: { hours: 72 } },
      { id: 's7', type: 'email', name: 'Conversion Nudge', config: { subject: 'Your trial data shows real results — keep them', delay: 0 }, sent: 1024, opened: 580, clicked: 210 },
    ],
    recipients: 1204, openRate: 58.4, clickRate: 12.1, conversionRate: 19.2, revenueGenerated: 8450,
    unsubscribeRate: 0.8, lastSentDate: '2026-02-23', createdDate: '2025-06-15', updatedDate: '2026-01-10',
  },
  {
    id: 'flow_2', name: 'Churn Prevention — At Risk', description: 'Automatically engages users who enter the At Risk lifecycle state.',
    trigger: 'User enters "At Risk" state', triggerType: 'lifecycle_change', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'We noticed you\'ve been away', config: { subject: 'We miss you — here\'s what\'s new', delay: 0 }, sent: 302, opened: 145, clicked: 38 },
      { id: 's2', type: 'delay', name: 'Wait 2 days', config: { hours: 48 } },
      { id: 's3', type: 'condition', name: 'Logged in since?', config: { event: 'user_login', branch: 'yes/no' } },
      { id: 's4', type: 'email', name: 'Personal check-in (No)', config: { subject: 'Can we help? Quick 5-min call', delay: 0 }, sent: 180, opened: 72, clicked: 24 },
      { id: 's5', type: 'email', name: 'Value reminder (Yes)', config: { subject: 'Welcome back — your latest insights are ready', delay: 0 }, sent: 122, opened: 73, clicked: 14 },
    ],
    recipients: 302, openRate: 42.9, clickRate: 8.3, conversionRate: 6.2, revenueGenerated: 14200,
    unsubscribeRate: 1.2, lastSentDate: '2026-02-22', createdDate: '2025-08-01', updatedDate: '2026-02-01',
  },
  {
    id: 'flow_3', name: 'Expansion Nudge', description: 'Targets users hitting plan limits with contextual upgrade messaging.',
    trigger: 'User enters "Expansion Ready" state', triggerType: 'lifecycle_change', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'You\'re outgrowing your plan', config: { subject: 'You\'re using {{usagePercent}}% of your {{limitType}} — here\'s what\'s next', delay: 0 }, sent: 156, opened: 102, clicked: 48 },
      { id: 's2', type: 'delay', name: 'Wait 3 days', config: { hours: 72 } },
      { id: 's3', type: 'email', name: 'Upgrade benefits', config: { subject: 'Teams like {{accountName}} get {{benefit}} on the next tier', delay: 0 }, sent: 143, opened: 88, clicked: 32 },
    ],
    recipients: 156, openRate: 65.2, clickRate: 20.5, conversionRate: 14.1, revenueGenerated: 24500,
    unsubscribeRate: 0.3, lastSentDate: '2026-02-21', createdDate: '2025-09-15', updatedDate: '2026-01-20',
  },
  {
    id: 'flow_4', name: 'Feature Adoption — Analytics', description: 'Educates users on Analytics features they haven\'t explored yet.',
    trigger: 'User activated but not using Analytics', triggerType: 'event', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'Discover Analytics', config: { subject: 'You\'re missing the most powerful feature in your plan', delay: 0 }, sent: 420, opened: 252, clicked: 92 },
      { id: 's2', type: 'delay', name: 'Wait 5 days', config: { hours: 120 } },
      { id: 's3', type: 'email', name: 'Analytics tips', config: { subject: '3 reports that changed how our top customers operate', delay: 0 }, sent: 380, opened: 198, clicked: 65 },
    ],
    recipients: 420, openRate: 52.8, clickRate: 18.4, conversionRate: 8.6, revenueGenerated: 3200,
    unsubscribeRate: 0.5, lastSentDate: '2026-02-20', createdDate: '2025-11-01', updatedDate: '2026-02-05',
  },
  {
    id: 'flow_5', name: 'Onboarding Checklist Reminder', description: 'Reminds users who started setup but didn\'t finish.',
    trigger: 'Setup started but not completed (48h)', triggerType: 'event', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'Finish setup', config: { subject: 'You\'re {{stepsRemaining}} steps from done', delay: 0 }, sent: 890, opened: 490, clicked: 198 },
      { id: 's2', type: 'delay', name: 'Wait 2 days', config: { hours: 48 } },
      { id: 's3', type: 'email', name: 'Need help?', config: { subject: 'Stuck? Our team can set you up in 15 minutes', delay: 0 }, sent: 450, opened: 225, clicked: 90 },
    ],
    recipients: 890, openRate: 51.0, clickRate: 15.2, conversionRate: 11.8, revenueGenerated: 5100,
    unsubscribeRate: 0.6, lastSentDate: '2026-02-23', createdDate: '2025-07-20', updatedDate: '2026-01-15',
  },
  {
    id: 'flow_6', name: 'Win-Back Campaign', description: 'Re-engages churned users with special offers.',
    trigger: 'User churned (30+ days inactive)', triggerType: 'lifecycle_change', status: 'Active',
    steps: [
      { id: 's1', type: 'email', name: 'We\'ve improved', config: { subject: 'A lot has changed — come see what\'s new', delay: 0 }, sent: 85, opened: 28, clicked: 8 },
      { id: 's2', type: 'delay', name: 'Wait 7 days', config: { hours: 168 } },
      { id: 's3', type: 'email', name: 'Special offer', config: { subject: '50% off for 3 months — welcome back offer', delay: 0 }, sent: 72, opened: 22, clicked: 12 },
    ],
    recipients: 85, openRate: 32.9, clickRate: 11.8, conversionRate: 8.2, revenueGenerated: 2800,
    unsubscribeRate: 2.1, lastSentDate: '2026-02-18', createdDate: '2025-10-01', updatedDate: '2026-02-10',
  },
  {
    id: 'flow_7', name: 'NPS Follow-up', description: 'Follows up on NPS responses with targeted messaging.',
    trigger: 'NPS survey completed', triggerType: 'event', status: 'Paused',
    steps: [
      { id: 's1', type: 'condition', name: 'NPS Score?', config: { field: 'nps_score', operator: 'gte', value: 8 } },
      { id: 's2', type: 'email', name: 'Thank promoters', config: { subject: 'Thank you! Would you share your experience?', delay: 0 }, sent: 120, opened: 96, clicked: 42 },
      { id: 's3', type: 'email', name: 'Address detractors', config: { subject: 'We hear you — let\'s make this right', delay: 0 }, sent: 35, opened: 24, clicked: 12 },
    ],
    recipients: 155, openRate: 77.4, clickRate: 34.8, conversionRate: 0, revenueGenerated: 0,
    unsubscribeRate: 0.2, lastSentDate: '2026-01-30', createdDate: '2025-12-01', updatedDate: '2026-01-30',
  },
  {
    id: 'flow_8', name: 'Contract Renewal Reminder', description: 'Sends renewal reminders 60, 30, and 7 days before contract end.',
    trigger: 'Contract renewal approaching', triggerType: 'schedule', status: 'Draft',
    steps: [
      { id: 's1', type: 'email', name: '60-day reminder', config: { subject: 'Your renewal is coming up — let\'s review your plan', daysBefore: 60 } },
      { id: 's2', type: 'delay', name: 'Wait 30 days', config: { hours: 720 } },
      { id: 's3', type: 'email', name: '30-day reminder', config: { subject: '30 days until renewal — any questions?', daysBefore: 30 } },
      { id: 's4', type: 'delay', name: 'Wait 23 days', config: { hours: 552 } },
      { id: 's5', type: 'email', name: '7-day reminder', config: { subject: 'Renewing in 7 days — confirm or update your plan', daysBefore: 7 } },
    ],
    recipients: 0, openRate: 0, clickRate: 0, conversionRate: 0, revenueGenerated: 0,
    unsubscribeRate: 0, createdDate: '2026-02-20', updatedDate: '2026-02-20',
  },
];

// ── Revenue Data (Waterfall) ───────────────────────────────────────────────

export const revenueData: RevenueData[] = [
  { month: 'Sep 2025', newMrr: 4200, expansionMrr: 1800, contractionMrr: 400, churnMrr: 1200, reactivationMrr: 300, netTotal: 32000 },
  { month: 'Oct 2025', newMrr: 5100, expansionMrr: 2200, contractionMrr: 350, churnMrr: 900, reactivationMrr: 450, netTotal: 38500 },
  { month: 'Nov 2025', newMrr: 4800, expansionMrr: 3100, contractionMrr: 500, churnMrr: 800, reactivationMrr: 200, netTotal: 45300 },
  { month: 'Dec 2025', newMrr: 3900, expansionMrr: 2800, contractionMrr: 600, churnMrr: 1100, reactivationMrr: 350, netTotal: 50650 },
  { month: 'Jan 2026', newMrr: 5500, expansionMrr: 3400, contractionMrr: 450, churnMrr: 950, reactivationMrr: 500, netTotal: 58650 },
  { month: 'Feb 2026', newMrr: 6200, expansionMrr: 4100, contractionMrr: 300, churnMrr: 700, reactivationMrr: 600, netTotal: 68550 },
];

export const revenueWaterfall: RevenueWaterfall[] = [
  { month: 'Sep 2025', startingMrr: 27300, newBusiness: 4200, expansion: 1800, contraction: -400, churn: -1200, reactivation: 300, endingMrr: 32000 },
  { month: 'Oct 2025', startingMrr: 32000, newBusiness: 5100, expansion: 2200, contraction: -350, churn: -900, reactivation: 450, endingMrr: 38500 },
  { month: 'Nov 2025', startingMrr: 38500, newBusiness: 4800, expansion: 3100, contraction: -500, churn: -800, reactivation: 200, endingMrr: 45300 },
  { month: 'Dec 2025', startingMrr: 45300, newBusiness: 3900, expansion: 2800, contraction: -600, churn: -1100, reactivation: 350, endingMrr: 50650 },
  { month: 'Jan 2026', startingMrr: 50650, newBusiness: 5500, expansion: 3400, contraction: -450, churn: -950, reactivation: 500, endingMrr: 58650 },
  { month: 'Feb 2026', startingMrr: 58650, newBusiness: 6200, expansion: 4100, contraction: -300, churn: -700, reactivation: 600, endingMrr: 68550 },
];

// ── Activation Data ────────────────────────────────────────────────────────

export const activationData: ActivationData[] = [
  { date: 'Mon', signups: 52, completedSetup: 42, reachedAha: 30, activated: 24, converted: 18 },
  { date: 'Tue', signups: 68, completedSetup: 55, reachedAha: 40, activated: 35, converted: 22 },
  { date: 'Wed', signups: 74, completedSetup: 60, reachedAha: 48, activated: 42, converted: 28 },
  { date: 'Thu', signups: 61, completedSetup: 48, reachedAha: 38, activated: 30, converted: 20 },
  { date: 'Fri', signups: 85, completedSetup: 70, reachedAha: 55, activated: 48, converted: 35 },
  { date: 'Sat', signups: 42, completedSetup: 34, reachedAha: 26, activated: 22, converted: 15 },
  { date: 'Sun', signups: 38, completedSetup: 30, reachedAha: 24, activated: 20, converted: 12 },
];

export const activationMilestones: ActivationMilestone[] = [
  { id: 'ms_1', name: 'Account Created', description: 'User completes signup form', completionRate: 100, avgTimeToComplete: '0m', dropoffRate: 0 },
  { id: 'ms_2', name: 'SDK Installed', description: 'First event received from SDK', completionRate: 78.4, avgTimeToComplete: '2h 15m', dropoffRate: 21.6 },
  { id: 'ms_3', name: 'First Flow Created', description: 'User creates their first email flow', completionRate: 56.2, avgTimeToComplete: '1d 4h', dropoffRate: 22.2 },
  { id: 'ms_4', name: 'First Email Sent', description: 'User sends first email through a flow', completionRate: 42.8, avgTimeToComplete: '2d 8h', dropoffRate: 13.4 },
  { id: 'ms_5', name: 'Dashboard Insights Viewed', description: 'User views lifecycle analytics dashboard', completionRate: 68.1, avgTimeToComplete: '4h 30m', dropoffRate: 10.3 },
  { id: 'ms_6', name: 'Aha Moment', description: 'User creates second flow or views revenue attribution', completionRate: 34.6, avgTimeToComplete: '3d 12h', dropoffRate: 8.2 },
];

// ── Retention Cohorts ──────────────────────────────────────────────────────

export const retentionCohorts: RetentionCohort[] = [
  { cohort: 'Aug 2025', size: 120, retention: [100, 82, 74, 68, 62, 58, 55] },
  { cohort: 'Sep 2025', size: 145, retention: [100, 85, 78, 72, 66, 61] },
  { cohort: 'Oct 2025', size: 168, retention: [100, 88, 80, 75, 70] },
  { cohort: 'Nov 2025', size: 192, retention: [100, 86, 79, 73] },
  { cohort: 'Dec 2025', size: 210, retention: [100, 89, 82] },
  { cohort: 'Jan 2026', size: 238, retention: [100, 91] },
  { cohort: 'Feb 2026', size: 265, retention: [100] },
];

// ── Deliverability Data ────────────────────────────────────────────────────

export const deliverabilityData: DeliverabilityData[] = [
  { date: '2026-02-17', sent: 10200, delivered: 10120, opened: 5900, clicked: 1250, bounced: 65, spam: 8, unsubscribed: 12 },
  { date: '2026-02-18', sent: 10800, delivered: 10710, opened: 6200, clicked: 1380, bounced: 72, spam: 10, unsubscribed: 15 },
  { date: '2026-02-19', sent: 11400, delivered: 11320, opened: 6800, clicked: 1520, bounced: 58, spam: 6, unsubscribed: 18 },
  { date: '2026-02-20', sent: 10600, delivered: 10540, opened: 6100, clicked: 1290, bounced: 48, spam: 5, unsubscribed: 10 },
  { date: '2026-02-21', sent: 11800, delivered: 11720, opened: 7100, clicked: 1680, bounced: 62, spam: 9, unsubscribed: 14 },
  { date: '2026-02-22', sent: 12200, delivered: 12120, opened: 7400, clicked: 1750, bounced: 55, spam: 7, unsubscribed: 11 },
  { date: '2026-02-23', sent: 11500, delivered: 11430, opened: 7000, clicked: 1600, bounced: 52, spam: 6, unsubscribed: 13 },
];

export const sendingDomains: SendingDomain[] = [
  { id: 'dom_1', domain: 'mail.lifecycleos.com', status: 'verified', dkimVerified: true, spfVerified: true, dmarcVerified: true, addedDate: '2025-06-01', lastChecked: '2026-02-23' },
  { id: 'dom_2', domain: 'notifications.lifecycleos.com', status: 'verified', dkimVerified: true, spfVerified: true, dmarcVerified: false, addedDate: '2025-08-15', lastChecked: '2026-02-23' },
  { id: 'dom_3', domain: 'transactional.lifecycleos.com', status: 'pending', dkimVerified: true, spfVerified: false, dmarcVerified: false, addedDate: '2026-02-20', lastChecked: '2026-02-23' },
];

export const ipWarmingStatus: IPWarmingStatus[] = [
  { ip: '198.51.100.10', phase: 8, totalPhases: 8, dailyLimit: 100000, currentDailySent: 11500, startDate: '2025-06-01', estimatedCompletionDate: '2025-08-01', reputation: 98 },
  { ip: '198.51.100.11', phase: 5, totalPhases: 8, dailyLimit: 25000, currentDailySent: 8200, startDate: '2025-12-15', estimatedCompletionDate: '2026-04-15', reputation: 92 },
];

// ── Expansion Opportunities ────────────────────────────────────────────────

export const expansionOpportunities: ExpansionOpportunity[] = [
  {
    id: 'exp_1', accountId: 'acc_3', accountName: 'Synergy Corp',
    signal: 'seat_cap', signalDescription: 'Using 48 of 50 seats (96%)',
    currentPlan: 'Enterprise', suggestedPlan: 'Enterprise',
    currentMrr: 4990, potentialMrr: 7490, upliftMrr: 2500,
    confidence: 95, status: 'contacted',
    identifiedDate: '2026-02-10', lastActionDate: '2026-02-18',
  },
  {
    id: 'exp_2', accountId: 'acc_7', accountName: 'CloudPeak Systems',
    signal: 'api_throttle', signalDescription: 'Hit API rate limit 5x this week (42k/50k)',
    currentPlan: 'Business', suggestedPlan: 'Enterprise',
    currentMrr: 3490, potentialMrr: 4990, upliftMrr: 1500,
    confidence: 88, status: 'identified',
    identifiedDate: '2026-02-20',
  },
  {
    id: 'exp_3', accountId: 'acc_2', accountName: 'Solutions LLC',
    signal: 'heavy_usage', signalDescription: 'Power users using 6 of 6 premium features',
    currentPlan: 'Business', suggestedPlan: 'Enterprise',
    currentMrr: 2840, potentialMrr: 4990, upliftMrr: 2150,
    confidence: 72, status: 'negotiating',
    identifiedDate: '2026-01-15', lastActionDate: '2026-02-22',
  },
  {
    id: 'exp_4', accountId: 'acc_5', accountName: 'Quantum Leap',
    signal: 'seat_cap', signalDescription: 'Using 10 of 10 seats (100%)',
    currentPlan: 'Growth', suggestedPlan: 'Business',
    currentMrr: 999, potentialMrr: 2490, upliftMrr: 1491,
    confidence: 82, status: 'identified',
    identifiedDate: '2026-02-19',
  },
  {
    id: 'exp_5', accountId: 'acc_10', accountName: 'FormFlow',
    signal: 'feature_gate', signalDescription: 'Attempted to access Analytics 12x (not in Starter)',
    currentPlan: 'Starter', suggestedPlan: 'Growth',
    currentMrr: 49, potentialMrr: 149, upliftMrr: 100,
    confidence: 68, status: 'identified',
    identifiedDate: '2026-02-21',
  },
  {
    id: 'exp_6', accountId: 'acc_1', accountName: 'Innovate Inc.',
    signal: 'plan_limit', signalDescription: 'Using 15 of 20 seats — projected to hit limit in 30 days',
    currentPlan: 'Business', suggestedPlan: 'Enterprise',
    currentMrr: 1238, potentialMrr: 2490, upliftMrr: 1252,
    confidence: 55, status: 'identified',
    identifiedDate: '2026-02-22',
  },
];

// ── Activity Feed ──────────────────────────────────────────────────────────

export const activityFeed: ActivityEntry[] = [
  { id: 'act_1', type: 'lifecycle_change', title: 'Lifecycle State Change', description: 'Alex Johnson moved from Activated → At Risk', timestamp: '2026-02-23T09:15:00Z', userId: 'usr_1', accountId: 'acc_1' },
  { id: 'act_2', type: 'flow_triggered', title: 'Flow Triggered', description: 'Churn Prevention flow triggered for Linda Davis', timestamp: '2026-02-23T08:42:00Z', userId: 'usr_6', accountId: 'acc_2' },
  { id: 'act_3', type: 'expansion_signal', title: 'Expansion Signal Detected', description: 'Synergy Corp at 96% seat capacity — expansion opportunity created', timestamp: '2026-02-23T07:30:00Z', accountId: 'acc_3' },
  { id: 'act_4', type: 'risk_alert', title: 'High Risk Alert', description: 'DataWave churn risk score reached 100 — account marked as churned', timestamp: '2026-02-22T16:20:00Z', accountId: 'acc_4' },
  { id: 'act_5', type: 'account_event', title: 'New Account', description: 'NextStep App started trial — Tom Rivera signed up', timestamp: '2026-02-22T14:05:00Z', accountId: 'acc_9' },
  { id: 'act_6', type: 'flow_triggered', title: 'Flow Triggered', description: 'Trial Welcome Series triggered for Tom Rivera', timestamp: '2026-02-22T14:06:00Z', userId: 'usr_11', accountId: 'acc_9' },
  { id: 'act_7', type: 'lifecycle_change', title: 'Lifecycle State Change', description: 'Emma Wilson moved from Churned → Reactivated', timestamp: '2026-02-22T11:30:00Z', userId: 'usr_10', accountId: 'acc_8' },
  { id: 'act_8', type: 'expansion_signal', title: 'Expansion Signal Detected', description: 'CloudPeak Systems hit API rate limit 5x — upgrade opportunity identified', timestamp: '2026-02-20T10:15:00Z', accountId: 'acc_7' },
  { id: 'act_9', type: 'system', title: 'Flow Updated', description: 'Churn Prevention flow updated — new conditional branch added', timestamp: '2026-02-20T09:00:00Z' },
  { id: 'act_10', type: 'flow_triggered', title: 'Flow Triggered', description: 'Expansion Nudge flow triggered for Patricia Williams', timestamp: '2026-02-19T15:45:00Z', userId: 'usr_4', accountId: 'acc_3' },
  { id: 'act_11', type: 'risk_alert', title: 'Risk Alert', description: 'Solutions LLC — Linda Davis risk score increased to 78', timestamp: '2026-02-19T08:20:00Z', userId: 'usr_6', accountId: 'acc_2' },
  { id: 'act_12', type: 'account_event', title: 'Plan Upgrade', description: 'CloudPeak Systems upgraded from Growth to Business', timestamp: '2026-02-18T12:00:00Z', accountId: 'acc_7' },
];

// ── Team & Settings ────────────────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  { id: 'tm_1', name: 'Admin User', email: 'admin@lifecycleos.com', initials: 'AU', role: 'Admin', lastActive: '2026-02-23T10:30:00Z', status: 'active' },
  { id: 'tm_2', name: 'Jane Doe', email: 'jane@lifecycleos.com', initials: 'JD', role: 'Marketer', lastActive: '2026-02-23T09:15:00Z', status: 'active' },
  { id: 'tm_3', name: 'Carlos Mendez', email: 'carlos@lifecycleos.com', initials: 'CM', role: 'Analyst', lastActive: '2026-02-22T16:45:00Z', status: 'active' },
  { id: 'tm_4', name: 'Sarah Chen', email: 'sarah.c@lifecycleos.com', initials: 'SC', role: 'Manager', lastActive: '2026-02-21T14:20:00Z', status: 'active' },
  { id: 'tm_5', name: 'New Hire', email: 'newhire@lifecycleos.com', initials: 'NH', role: 'Viewer', lastActive: '', status: 'invited' },
];

export const webhooks: WebhookConfig[] = [
  { id: 'wh_1', url: 'https://api.slack.com/webhooks/lifecycle-alerts', events: ['lifecycle_change', 'risk_alert'], status: 'active', secret: 'whsec_1a2b3c', createdDate: '2025-09-01', lastTriggered: '2026-02-23T09:15:00Z', successRate: 99.2 },
  { id: 'wh_2', url: 'https://hooks.zapier.com/hooks/catch/123456', events: ['expansion_signal', 'account_event'], status: 'active', secret: 'whsec_4d5e6f', createdDate: '2025-11-15', lastTriggered: '2026-02-22T14:05:00Z', successRate: 97.8 },
  { id: 'wh_3', url: 'https://internal.company.com/api/lifecycle', events: ['flow_triggered'], status: 'failing', secret: 'whsec_7g8h9i', createdDate: '2026-01-10', lastTriggered: '2026-02-20T10:15:00Z', successRate: 42.5 },
];
