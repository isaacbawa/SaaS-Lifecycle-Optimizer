'use server';

import type { User, ChurnRiskAnalysisOutput } from '@/lib/definitions';

export async function runChurnAnalysis(
  user: User
): Promise<ChurnRiskAnalysisOutput> {
  // Mock AI analysis
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let riskScore = Math.floor(Math.random() * 20) + 5; // Base risk between 5 and 24
  let explanation =
    'This is a mock analysis based on user data. ';
  const recommendations = [
    'Engage with user through a targeted email campaign.',
    'Offer a discount on their next billing cycle.',
    'Schedule a call to understand their needs better.',
  ];

  if (user.lifecycleState === 'AtRisk') {
    riskScore += 30;
    explanation += 'User is in "At Risk" state. ';
  }
  if (user.lastLoginDaysAgo > 14) {
    riskScore += 25;
    explanation += `User has not logged in for ${user.lastLoginDaysAgo} days. `;
  }
  if (user.loginFrequencyLast7Days < 2) {
    riskScore += 15;
    explanation += 'Low login frequency in the last week. ';
  }
  if (user.featureUsageLast30Days.length < 3) {
    riskScore += 10;
    explanation += 'User is not utilizing many features. ';
  }

  if (user.lifecycleState === 'Churned') {
    riskScore = 100;
    explanation = 'User has already churned.';
    recommendations.splice(
      0,
      recommendations.length,
      'Attempt to win back user with a special offer.'
    );
  }

  riskScore = Math.min(riskScore, 100);
  riskScore = Math.max(riskScore, 0);

  return {
    riskScore: Math.round(riskScore),
    explanation,
    recommendations,
  };
}
