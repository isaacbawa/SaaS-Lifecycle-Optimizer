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
