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

export type ChurnRiskAnalysisOutput = {
  riskScore: number;
  explanation: string;
  recommendations: string[];
};

export type Account = {
  id: string;
  name: string;
  logo: string;
  mrr: number;
  userCount: number;
  health: 'Good' | 'Fair' | 'Poor';
  plan: 'Basic' | 'Pro' | 'Business' | 'Enterprise';
};

export type EmailFlow = {
  id: string;
  name: string;
  trigger: string;
  status: 'Active' | 'Draft' | 'Paused';
  recipients: number;
  openRate: number;
  clickRate: number;
  revenueGenerated: number;
};

export type RevenueData = {
  month: string;
  total: number;
};

export type ActivationData = {
  date: string;
  activated: number;
  trial: number;
};

export type DeliverabilityData = {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
};
