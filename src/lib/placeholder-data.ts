import type { User, Account, EmailFlow, RevenueData, ActivationData, DeliverabilityData } from '@/lib/definitions';

export const users: User[] = [
  {
    id: 'usr_1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    avatar: 'https://picsum.photos/seed/1/40/40',
    account: { id: 'acc_1', name: 'Innovate Inc.' },
    lifecycleState: 'AtRisk',
    mrr: 99,
    lastLoginDaysAgo: 15,
    loginFrequencyLast7Days: 1,
    featureUsageLast30Days: ['Dashboard', 'Reports'],
    plan: 'Pro',
  },
  {
    id: 'usr_2',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    avatar: 'https://picsum.photos/seed/2/40/40',
    account: { id: 'acc_2', name: 'Solutions LLC' },
    lifecycleState: 'Activated',
    mrr: 249,
    lastLoginDaysAgo: 1,
    loginFrequencyLast7Days: 7,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Exports', 'Integrations'],
    plan: 'Business',
  },
  {
    id: 'usr_3',
    name: 'James Smith',
    email: 'james.s@example.com',
    avatar: 'https://picsum.photos/seed/3/40/40',
    account: { id: 'acc_1', name: 'Innovate Inc.' },
    lifecycleState: 'Trial',
    mrr: 0,
    lastLoginDaysAgo: 2,
    loginFrequencyLast7Days: 5,
    featureUsageLast30Days: ['Dashboard'],
    plan: 'Trial',
  },
  {
    id: 'usr_4',
    name: 'Patricia Williams',
    email: 'pat.w@example.com',
    avatar: 'https://picsum.photos/seed/4/40/40',
    account: { id: 'acc_3', name: 'Synergy Corp' },
    lifecycleState: 'ExpansionReady',
    mrr: 499,
    lastLoginDaysAgo: 0,
    loginFrequencyLast7Days: 10,
    featureUsageLast30Days: ['Dashboard', 'Reports', 'Analytics', 'Exports', 'API Access', 'SSO'],
    plan: 'Enterprise',
  },
  {
    id: 'usr_5',
    name: 'Robert Brown',
    email: 'rob.b@example.com',
    avatar: 'https://picsum.photos/seed/5/40/40',
    account: { id: 'acc_4', name: 'DataWave' },
    lifecycleState: 'Churned',
    mrr: 49,
    lastLoginDaysAgo: 45,
    loginFrequencyLast7Days: 0,
    featureUsageLast30Days: [],
    plan: 'Basic',
  },
  {
    id: 'usr_6',
    name: 'Linda Davis',
    email: 'linda.d@example.com',
    avatar: 'https://picsum.photos/seed/6/40/40',
    account: { id: 'acc_2', name: 'Solutions LLC' },
    lifecycleState: 'AtRisk',
    mrr: 249,
    lastLoginDaysAgo: 22,
    loginFrequencyLast7Days: 0,
    featureUsageLast30Days: ['Dashboard', 'Reports'],
    plan: 'Business',
  },
];

export const accounts: Account[] = [
  { id: 'acc_1', name: 'Innovate Inc.', logo: 'https://picsum.photos/seed/a1/40/40', mrr: 1238, userCount: 15, health: 'Good', plan: 'Business' },
  { id: 'acc_2', name: 'Solutions LLC', logo: 'https://picsum.photos/seed/a2/40/40', mrr: 2840, userCount: 32, health: 'Good', plan: 'Business' },
  { id: 'acc_3', name: 'Synergy Corp', logo: 'https://picsum.photos/seed/a3/40/40', mrr: 499, userCount: 5, health: 'Fair', plan: 'Enterprise' },
  { id: 'acc_4', name: 'DataWave', logo: 'https://picsum.photos/seed/a4/40/40', mrr: 49, userCount: 1, health: 'Poor', plan: 'Basic' },
  { id: 'acc_5', name: 'Quantum Leap', logo: 'https://picsum.photos/seed/a5/40/40', mrr: 999, userCount: 10, health: 'Good', plan: 'Pro' },
  { id: 'acc_6', name: 'Apex Digital', logo: 'https://picsum.photos/seed/a6/40/40', mrr: 0, userCount: 3, health: 'Fair', plan: 'Pro' },
];

export const emailFlows: EmailFlow[] = [
  { id: 'flow_1', name: 'Trial Welcome Series', trigger: 'User starts trial', status: 'Active', recipients: 1204, openRate: 58.4, clickRate: 12.1, revenueGenerated: 3450 },
  { id: 'flow_2', name: 'Churn Prevention', trigger: 'User enters "At Risk" state', status: 'Active', recipients: 302, openRate: 42.9, clickRate: 8.3, revenueGenerated: 1200 },
  { id: 'flow_3', name: 'Expansion Nudge', trigger: 'User enters "Expansion Ready" state', status: 'Active', recipients: 156, openRate: 65.2, clickRate: 20.5, revenueGenerated: 8500 },
  { id: 'flow_4', name: 'New Feature Announcement', trigger: 'Manual', status: 'Draft', recipients: 0, openRate: 0, clickRate: 0, revenueGenerated: 0 },
  { id: 'flow_5', name: 'Onboarding Checklist', trigger: 'User activated', status: 'Paused', recipients: 2310, openRate: 51.0, clickRate: 15.2, revenueGenerated: 0 },
];

export const revenueData: RevenueData[] = [
  { month: 'Jan', total: 32000 },
  { month: 'Feb', total: 35000 },
  { month: 'Mar', total: 37000 },
  { month: 'Apr', total: 41000 },
  { month: 'May', total: 45231 },
  { month: 'Jun', total: 48000 },
];

export const activationData: ActivationData[] = [
  { date: 'Mon', trial: 50, activated: 30 },
  { date: 'Tue', trial: 65, activated: 40 },
  { date: 'Wed', trial: 70, activated: 55 },
  { date: 'Thu', trial: 60, activated: 45 },
  { date: 'Fri', trial: 80, activated: 60 },
  { date: 'Sat', trial: 90, activated: 75 },
  { date: 'Sun', trial: 85, activated: 65 },
];

export const deliverabilityData: DeliverabilityData[] = [
  { date: '2024-05-01', sent: 10000, delivered: 9950, opened: 5800, clicked: 1200, bounced: 50, spam: 5 },
  { date: '2024-05-02', sent: 10500, delivered: 10440, opened: 6100, clicked: 1300, bounced: 60, spam: 7 },
  { date: '2024-05-03', sent: 10200, delivered: 10150, opened: 5900, clicked: 1250, bounced: 50, spam: 4 },
  { date: '2024-05-04', sent: 11000, delivered: 10930, opened: 6500, clicked: 1400, bounced: 70, spam: 8 },
  { date: '2024-05-05', sent: 10800, delivered: 10720, opened: 6300, clicked: 1350, bounced: 80, spam: 6 },
  { date: '2024-05-06', sent: 11200, delivered: 11140, opened: 6700, clicked: 1500, bounced: 60, spam: 5 },
  { date: '2024-05-07', sent: 11500, delivered: 11430, opened: 7000, clicked: 1600, bounced: 70, spam: 9 },
];
