/* ==========================================================================
 * Database Seed Script
 *
 * Populates the Neon PostgreSQL database with demonstration data for
 * development and testing. Run with:
 *
 *   npx tsx src/lib/db/seed.ts
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env.local
 *   - Schema pushed via `npx drizzle-kit push`
 * ========================================================================== */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in .env.local');
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
    console.log('Seeding database...\n');

    /* ── 1. Create demo organization ─────────────────────────────────── */
    console.log('  Creating demo organization...');
    const [org] = await db
        .insert(schema.organizations)
        .values({
            clerkOrgId: 'org_demo_lifecycleos',
            name: 'LifecycleOS Demo',
            slug: 'lifecycleos-demo',
            plan: 'Business',
            monthlyEventQuota: 1_000_000,
            onboardingCompleted: true,
        })
        .onConflictDoNothing({ target: schema.organizations.clerkOrgId })
        .returning();

    if (!org) {
        console.log('  Demo org already exists, fetching...');
        const [existing] = await db
            .select()
            .from(schema.organizations)
            .where(eq(schema.organizations.clerkOrgId, 'org_demo_lifecycleos'))
            ;
        if (!existing) {
            console.error('  Failed to find or create demo org');
            process.exit(1);
        }
        Object.assign(org ?? {}, existing);
    }

    const orgId = org!.id;
    console.log(`  Org ID: ${orgId}\n`);

    /* ── 2. Create demo tracked accounts ─────────────────────────────── */
    console.log('  Creating tracked accounts...');
    const accountData = [
        { externalId: 'acct_acme', name: 'Acme Corp', domain: 'acme.com', industry: 'Technology', plan: 'Business', mrr: 4900, arr: 58800, userCount: 48, health: 'Good' as const, churnRiskScore: 12, expansionScore: 78 },
        { externalId: 'acct_globex', name: 'Globex Industries', domain: 'globex.io', industry: 'Manufacturing', plan: 'Enterprise', mrr: 12000, arr: 144000, userCount: 120, health: 'Good' as const, churnRiskScore: 8, expansionScore: 85 },
        { externalId: 'acct_initech', name: 'Initech Solutions', domain: 'initech.dev', industry: 'SaaS', plan: 'Growth', mrr: 2400, arr: 28800, userCount: 15, health: 'Fair' as const, churnRiskScore: 45, expansionScore: 32 },
        { externalId: 'acct_massive', name: 'Massive Dynamic', domain: 'massive.co', industry: 'Biotech', plan: 'Enterprise', mrr: 18500, arr: 222000, userCount: 200, health: 'Good' as const, churnRiskScore: 5, expansionScore: 90 },
        { externalId: 'acct_hooli', name: 'Hooli Inc', domain: 'hooli.com', industry: 'Technology', plan: 'Starter', mrr: 490, arr: 5880, userCount: 3, health: 'Poor' as const, churnRiskScore: 72, expansionScore: 10 },
    ];

    for (const acct of accountData) {
        await db
            .insert(schema.trackedAccounts)
            .values({ ...acct, organizationId: orgId })
            .onConflictDoNothing();
    }
    console.log(`  Created ${accountData.length} accounts\n`);

    /* ── 3. Create demo tracked users ────────────────────────────────── */
    console.log('  Creating tracked users...');
    const states: (typeof schema.lifecycleStateEnum.enumValues[number])[] = [
        'Lead', 'Trial', 'Activated', 'PowerUser',
        'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated',
    ];

    const names = [
        'Alice Chen', 'Bob Martinez', 'Carol Johnson', 'David Kim',
        'Eva Williams', 'Frank Brown', 'Grace Lee', 'Henry Davis',
        'Iris Taylor', 'Jack Anderson', 'Kate Wilson', 'Leo Thomas',
        'Mia Jackson', 'Noah White', 'Olivia Harris', 'Peter Clark',
    ];

    for (let i = 0; i < names.length; i++) {
        const [first, last] = names[i].split(' ');
        const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
        const state = states[i % states.length];

        await db
            .insert(schema.trackedUsers)
            .values({
                organizationId: orgId,
                externalId: `user_${first.toLowerCase()}_${last.toLowerCase()}`,
                email,
                name: names[i],
                lifecycleState: state,
                mrr: Math.floor(Math.random() * 500) + 50,
                plan: ['Starter', 'Growth', 'Business'][Math.floor(Math.random() * 3)],
                loginFrequency7d: Math.floor(Math.random() * 7),
                loginFrequency30d: Math.floor(Math.random() * 30),
                sessionDepthMinutes: Math.round(Math.random() * 45 * 10) / 10,
                churnRiskScore: Math.round(Math.random() * 100),
                expansionScore: Math.round(Math.random() * 100),
                npsScore: Math.floor(Math.random() * 11),
            })
            .onConflictDoNothing();
    }
    console.log(`  Created ${names.length} tracked users\n`);

    /* ── 4. Create sample flow definitions ───────────────────────────── */
    console.log('  Creating flow definitions...');
    const flows = [
        { name: 'Trial Onboarding', description: 'Guide new trial users through activation milestones', status: 'active' as const },
        { name: 'Churn Prevention', description: 'Re-engage at-risk users before they churn', status: 'active' as const },
        { name: 'Expansion Nudge', description: 'Surface upgrade prompts when usage hits thresholds', status: 'draft' as const },
        { name: 'Win-Back Campaign', description: 'Re-activate churned users with targeted offers', status: 'paused' as const },
        { name: 'NPS Follow-Up', description: 'Automated follow-up based on NPS survey responses', status: 'active' as const },
    ];

    for (const flow of flows) {
        await db
            .insert(schema.flowDefinitions)
            .values({
                organizationId: orgId,
                name: flow.name,
                description: flow.description,
                status: flow.status,
                nodes: [],
                edges: [],
            })
            .onConflictDoNothing();
    }
    console.log(`  Created ${flows.length} flow definitions\n`);

    /* ── 5. Activity log entries ─────────────────────────────────────── */
    console.log('  Creating activity log entries...');
    const activities = [
        { type: 'lifecycle_change', title: 'Alice Chen moved to PowerUser' },
        { type: 'expansion_signal', title: 'Acme Corp hit 90% seat utilization' },
        { type: 'churn_risk', title: 'Hooli Inc churn risk increased to 72%' },
        { type: 'flow_completed', title: 'Trial Onboarding completed for Bob Martinez' },
        { type: 'revenue_change', title: 'Globex Industries expanded to Enterprise plan' },
    ];

    for (const act of activities) {
        await db
            .insert(schema.activityLog)
            .values({
                organizationId: orgId,
                type: act.type,
                title: act.title,
            });
    }
    console.log(`  Created ${activities.length} activity entries\n`);

    /* ── 6. Revenue records ──────────────────────────────────────────── */
    console.log('  Creating revenue records...');
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    for (const month of months) {
        await db.insert(schema.revenueRecords).values([
            { organizationId: orgId, month, movementType: 'new', amount: Math.floor(Math.random() * 5000) + 2000 },
            { organizationId: orgId, month, movementType: 'expansion', amount: Math.floor(Math.random() * 3000) + 1000 },
            { organizationId: orgId, month, movementType: 'contraction', amount: -(Math.floor(Math.random() * 1000) + 200) },
            { organizationId: orgId, month, movementType: 'churn', amount: -(Math.floor(Math.random() * 2000) + 500) },
        ]);
    }
    console.log(`  Created revenue records for ${months.length} months\n`);

    console.log('Seed complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
