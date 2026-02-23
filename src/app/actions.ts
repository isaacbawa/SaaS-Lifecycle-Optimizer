'use server';

import {
  churnRiskAnalysis,
  ChurnRiskAnalysisInput,
} from '@/ai/flows/churn-risk-analysis-flow';
import type { User } from '@/lib/placeholder-data';

export async function runChurnAnalysis(user: User) {
  const input: ChurnRiskAnalysisInput = {
    userId: user.id,
    accountId: user.account.id,
    usageStats: {
      lastLoginDaysAgo: user.lastLoginDaysAgo,
      loginFrequencyLast7Days: user.loginFrequencyLast7Days,
      featureUsageLast30Days: user.featureUsageLast30Days,
      sessionDepthAverage: Math.floor(Math.random() * 20) + 1, // Mock data
      totalFeaturesAvailable: 10, // Mock data
    },
    subscriptionDetails: {
      planType: user.plan,
      mrr: user.mrr,
      isTrialing: user.lifecycleState === 'Trial',
      daysUntilRenewal: Math.floor(Math.random() * 30), // Mock data
      hasPaymentIssues: user.lifecycleState === 'AtRisk' && Math.random() > 0.5, // Mock data
    },
    accountDetails: {
      numberOfUsers: Math.floor(Math.random() * 10) + 1, // Mock data
      seatsAvailable: 10, // Mock data
      seatsUsed: Math.floor(Math.random() * 10), // Mock data
    },
  };

  try {
    // Adding a delay to simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await churnRiskAnalysis(input);
    return result;
  } catch (error) {
    console.error('Error running churn analysis:', error);
    // In a real app, you'd return a structured error object
    return {
      riskScore: 0,
      explanation: 'An error occurred during analysis. Please try again.',
      recommendations: [],
    };
  }
}
