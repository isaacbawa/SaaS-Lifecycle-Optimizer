'use server';
/**
 * @fileOverview A Genkit flow for analyzing user and account behavior to predict churn risk.
 *
 * - churnRiskAnalysis - A function that calculates a churn risk score and provides explanations and recommendations.
 * - ChurnRiskAnalysisInput - The input type for the churnRiskAnalysis function.
 * - ChurnRiskAnalysisOutput - The return type for the churnRiskAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChurnRiskAnalysisInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user.'),
  accountId: z.string().describe('The unique identifier for the account.'),
  usageStats: z.object({
    loginFrequencyLast7Days: z.number().describe('Number of logins in the last 7 days.').optional(),
    featureUsageLast30Days: z.array(z.string()).describe('List of unique features used in the last 30 days.').optional(),
    sessionDepthAverage: z.number().describe('Average number of actions performed per session.').optional(),
    lastLoginDaysAgo: z.number().describe('Number of days since the last login.').optional(),
    totalFeaturesAvailable: z.number().describe('Total number of features available in the current plan.').optional(),
  }).describe('Aggregated usage statistics for the user/account.'),
  subscriptionDetails: z.object({
    planType: z.string().describe('The current subscription plan type (e.g., Basic, Pro, Enterprise).'),
    mrr: z.number().describe('Monthly Recurring Revenue for the account.'),
    isTrialing: z.boolean().describe('True if the account is currently in a trial period.'),
    daysUntilRenewal: z.number().describe('Number of days remaining until the subscription renews or trial ends.').optional(),
    hasPaymentIssues: z.boolean().describe('True if there have been recent payment failures or issues.').optional(),
  }).describe('Details about the current subscription.'),
  accountDetails: z.object({
    numberOfUsers: z.number().describe('Total number of users associated with the account.').optional(),
    seatsUsed: z.number().describe('Number of active seats currently used in the account.').optional(),
    seatsAvailable: z.number().describe('Total number of seats available in the account plan.').optional(),
  }).describe('Details about the overall account.'),
  previousRiskScore: z.number().min(0).max(100).describe('The previous churn risk score for context, if available.').optional(),
});
export type ChurnRiskAnalysisInput = z.infer<typeof ChurnRiskAnalysisInputSchema>;

const ChurnRiskAnalysisOutputSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A churn risk score between 0 (low risk) and 100 (high risk).'),
  explanation: z.string().describe('A natural language explanation of the key factors contributing to the churn risk score.'),
  recommendations: z.array(z.string()).describe('A list of actionable recommendations to mitigate the identified churn risks.'),
});
export type ChurnRiskAnalysisOutput = z.infer<typeof ChurnRiskAnalysisOutputSchema>;

const churnRiskAnalysisPrompt = ai.definePrompt({
  name: 'churnRiskAnalysisPrompt',
  input: { schema: ChurnRiskAnalysisInputSchema },
  output: { schema: ChurnRiskAnalysisOutputSchema },
  prompt: `You are an expert SaaS lifecycle manager and churn prevention specialist. Your task is to analyze user and account behavior data to determine a churn risk score, provide a clear explanation of the contributing factors, and suggest actionable recommendations.

Analyze the following data carefully:

User ID: {{{userId}}}
Account ID: {{{accountId}}}

Usage Statistics:
- Login Frequency Last 7 Days: {{{usageStats.loginFrequencyLast7Days}}}
- Features Used Last 30 Days: {{#if usageStats.featureUsageLast30Days}}{{#each usageStats.featureUsageLast30Days}}- {{{this}}}{{/each}}{{else}}None recorded{{/if}}
- Average Session Depth: {{{usageStats.sessionDepthAverage}}}
- Last Login Days Ago: {{{usageStats.lastLoginDaysAgo}}}
- Total Features Available: {{{usageStats.totalFeaturesAvailable}}}

Subscription Details:
- Plan Type: {{{subscriptionDetails.planType}}}
- MRR: {{{subscriptionDetails.mrr}}}
- Is Trialing: {{{subscriptionDetails.isTrialing}}}
- Days Until Renewal/Trial End: {{{subscriptionDetails.daysUntilRenewal}}}
- Has Payment Issues: {{{subscriptionDetails.hasPaymentIssues}}}

Account Details:
- Number of Users: {{{accountDetails.numberOfUsers}}}
- Seats Used: {{{accountDetails.seatsUsed}}}
- Seats Available: {{{accountDetails.seatsAvailable}}}

{{#if previousRiskScore}}
Previous Churn Risk Score: {{{previousRiskScore}}}
{{/if}}

Based on this information, provide:
1. A churn risk score (0-100, where 100 is highest risk).
2. A natural language explanation of the key factors driving this score.
3. A list of specific, actionable recommendations to prevent churn.

Consider factors such as:
- Declining engagement (login frequency, session depth, last login).
- Lack of feature adoption or exploration relative to available features.
- Upcoming trial expiration or subscription renewal.
- Payment issues.
- Underutilization of seats in multi-user accounts.
- Comparison to previous risk scores if provided.`,
});

const churnRiskAnalysisFlow = ai.defineFlow(
  {
    name: 'churnRiskAnalysisFlow',
    inputSchema: ChurnRiskAnalysisInputSchema,
    outputSchema: ChurnRiskAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await churnRiskAnalysisPrompt(input);
    if (!output) {
      throw new Error('Failed to generate churn risk analysis.');
    }
    return output;
  }
);

export async function churnRiskAnalysis(input: ChurnRiskAnalysisInput): Promise<ChurnRiskAnalysisOutput> {
  return churnRiskAnalysisFlow(input);
}
