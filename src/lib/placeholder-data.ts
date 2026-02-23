export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  account: {
    id: string;
    name: string;
  };
  lifecycleState: 'Trial' | 'Activated' | 'AtRisk' | 'ExpansionReady' | 'Churned';
  mrr: number;
  lastLoginDaysAgo: number;
  loginFrequencyLast7Days: number;
  featureUsageLast30Days: string[];
  plan: string;
};

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
