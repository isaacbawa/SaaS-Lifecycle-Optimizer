'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating personalized, revenue-aware email content
 * for SaaS lifecycle automation.
 *
 * - generateLifecycleEmailContent - A function that generates email copy based on user lifecycle state,
 *   product events, and flow objective.
 * - GenerateLifecycleEmailContentInput - The input type for the generateLifecycleEmailContent function.
 * - GenerateLifecycleEmailContentOutput - The return type for the generateLifecycleEmailContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLifecycleEmailContentInputSchema = z.object({
  lifecycleState: z
    .string()
    .describe('The current lifecycle state of the user/account (e.g., "Trial", "At Risk", "Expansion Ready", "Activated").'),
  flowObjective: z
    .string()
    .describe('The primary objective of the email flow (e.g., "Increase trial-to-paid conversion", "Prevent churn", "Drive expansion revenue", "Encourage feature adoption").'),
  recentProductEvents: z
    .array(z.string())
    .describe('A list of recent, relevant product events for the user/account (e.g., "User signed up 3 days ago", "Feature X used 5 times", "Subscription updated to Pro plan", "Login frequency declined").'),
  accountDetails: z
    .object({
      accountName: z.string().optional().describe('The name of the company/account.'),
      planType: z.string().optional().describe('The current subscription plan (e.g., "Free Trial", "Basic", "Pro", "Enterprise").'),
      mrr: z.number().optional().describe('The current Monthly Recurring Revenue for the account, if applicable.'),
      lastActivityDate: z.string().optional().describe('The date of the last recorded activity for the account/user.'),
    })
    .optional()
    .describe('Optional details about the account for personalization.'),
  userDetails: z
    .object({
      userName: z.string().optional().describe('The name of the specific user.'),
      userRole: z.string().optional().describe('The role of the user within the account.'),
      lastLoginDate: z.string().optional().describe('The date of the user\'s last login.'),
    })
    .optional()
    .describe('Optional details about the specific user for personalization.'),
});
export type GenerateLifecycleEmailContentInput = z.infer<typeof GenerateLifecycleEmailContentInputSchema>;

const GenerateLifecycleEmailContentOutputSchema = z.object({
  subject: z.string().describe('A compelling and revenue-aware email subject line.'),
  body: z.string().describe('The personalized and objective-driven email body content.'),
});
export type GenerateLifecycleEmailContentOutput = z.infer<typeof GenerateLifecycleEmailContentOutputSchema>;

export async function generateLifecycleEmailContent(
  input: GenerateLifecycleEmailContentInput
): Promise<GenerateLifecycleEmailContentOutput> {
  return generateLifecycleEmailContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lifecycleEmailContentPrompt',
  input: { schema: GenerateLifecycleEmailContentInputSchema },
  output: { schema: GenerateLifecycleEmailContentOutputSchema },
  prompt: `You are an expert SaaS lifecycle email marketer specializing in driving revenue through personalized, event-driven communication. Your goal is to help SaaS companies increase activation, reduce churn, and drive expansion.\n\nGenerate a subject line and a body for an email based on the provided lifecycle state, flow objective, and recent product events. The email should be highly personalized and revenue-aware, directly addressing the flow's objective for a user/account in the specified lifecycle state.\n\nIncorporate insights from recent product events to make the content relevant and actionable. Use the provided account and user details for personalization. Focus on a single, clear call to action related to the objective. The tone should be professional, helpful, and value-driven, avoiding generic marketing fluff. Assume the email will be sent from the SaaS product's team.\n\n---\nLifecycle State: {{{lifecycleState}}}\nFlow Objective: {{{flowObjective}}}\nRecent Product Events:\n{{#each recentProductEvents}}- {{{this}}}\n{{/each}}\n\n{{#if accountDetails}}\nAccount Details:\n  Account Name: {{accountDetails.accountName}}\n  Plan Type: {{accountDetails.planType}}\n  MRR: {{accountDetails.mrr}}\n  Last Activity: {{accountDetails.lastActivityDate}}\n{{/if}}\n\n{{#if userDetails}}\nUser Details:\n  User Name: {{userDetails.userName}}\n  User Role: {{userDetails.userRole}}\n  Last Login: {{userDetails.lastLoginDate}}\n{{/if}}\n---\n\nGenerate the email subject and body in JSON format.\n`,
});

const generateLifecycleEmailContentFlow = ai.defineFlow(
  {
    name: 'generateLifecycleEmailContentFlow',
    inputSchema: GenerateLifecycleEmailContentInputSchema,
    outputSchema: GenerateLifecycleEmailContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
