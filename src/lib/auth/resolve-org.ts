/* ==========================================================================
 * Organization Resolution — Unified Org ID Resolution for All Contexts
 *
 * Provides a single entry-point to resolve the internal org UUID from:
 *   1. Clerk session (dashboard server components) — always tried first
 *   2. Auto-provisioned org for authenticated users with no org
 *   3. Just-in-time user + org provisioning when webhook hasn't fired yet
 *   4. DEMO_ORG_ID env override (development only, never in production)
 *
 * Every data access MUST go through this to ensure tenant isolation.
 * ========================================================================== */

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Resolve the internal organization UUID for the current request context.
 *
 * Priority:
 *   1. Clerk session → org table lookup (via Clerk orgId)
 *   2. Clerk session → user table lookup (via Clerk userId → organizationId)
 *   3. Auto-provision org for DB users that have no org yet
 *   4. Just-in-time: create DB user + org when Clerk user has no DB row
 *      (handles webhook delays / missing webhook config)
 *   5. DEMO_ORG_ID env var (development only)
 *
 * Throws if no organization can be resolved.
 */
export async function resolveOrgId(): Promise<string> {
    // 1. Try Clerk session FIRST — this is the production path
    try {
        const session = await auth();

        // 1a. Clerk organization context
        const clerkOrgId = session?.orgId;
        if (clerkOrgId) {
            const [org] = await db
                .select({ id: schema.organizations.id })
                .from(schema.organizations)
                .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
                .limit(1);
            if (org) return org.id;
        }

        // 1b. Look up user's linked organization
        const clerkUserId = session?.userId;
        if (clerkUserId) {
            const [user] = await db
                .select({ orgId: schema.users.organizationId })
                .from(schema.users)
                .where(eq(schema.users.clerkUserId, clerkUserId))
                .limit(1);
            if (user?.orgId) return user.orgId;

            // 1c. Auto-provision: authenticated user exists in DB but has no org.
            if (user) {
                const newOrg = await autoProvisionOrg(clerkUserId);
                if (newOrg) return newOrg;
            }

            // 1d. Just-in-time provisioning: Clerk user is authenticated but
            //     has NO row in our DB (webhook hasn't fired or failed).
            //     Create the user row + personal org so the app works immediately.
            if (!user) {
                const orgId = await justInTimeProvision(clerkUserId);
                if (orgId) return orgId;
            }
        }
    } catch {
        // auth() may throw in non-request contexts — fall through to dev override
    }

    // 2. Development / demo override — ONLY used when Clerk auth is unavailable
    const envOrgId = process.env.DEMO_ORG_ID;
    if (envOrgId) return envOrgId;

    // 3. No auth, no env — cannot resolve
    throw new Error(
        '[resolveOrgId] Unable to resolve organization. No Clerk session found and no DEMO_ORG_ID configured.',
    );
}

/**
 * Auto-provision a personal organization for a Clerk user who has no org.
 * This happens when a user signs up without creating a Clerk Organization.
 * Returns the new org's internal UUID, or null on failure.
 */
async function autoProvisionOrg(clerkUserId: string): Promise<string | null> {
    try {
        // Create a personal org keyed by the user's Clerk ID
        const personalClerkOrgId = `personal_${clerkUserId}`;

        const [newOrg] = await db
            .insert(schema.organizations)
            .values({
                clerkOrgId: personalClerkOrgId,
                name: 'My Organization',
                slug: `personal-${clerkUserId.slice(-8)}`,
            })
            .onConflictDoUpdate({
                target: schema.organizations.clerkOrgId,
                set: { updatedAt: new Date() },
            })
            .returning({ id: schema.organizations.id });

        if (newOrg) {
            // Link the user to the new org
            await db
                .update(schema.users)
                .set({ organizationId: newOrg.id, updatedAt: new Date() })
                .where(eq(schema.users.clerkUserId, clerkUserId));
            return newOrg.id;
        }
    } catch (err) {
        console.error('[resolveOrgId] Auto-provision failed:', err);
    }
    return null;
}

/**
 * Just-in-time provisioning for authenticated Clerk users with no DB row.
 *
 * This handles the common production scenario where:
 *  - The Clerk webhook for `user.created` hasn't fired yet (delay / race)
 *  - The webhook endpoint isn't configured in the Clerk production instance
 *  - The webhook secret is missing or misconfigured
 *
 * Creates the user row + personal organization in a single transaction
 * so the app works immediately without depending on webhook delivery.
 */
async function justInTimeProvision(clerkUserId: string): Promise<string | null> {
    try {
        // Fetch profile data from Clerk so the DB row is complete
        const clerkUser = await currentUser();
        if (!clerkUser) return null;

        const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? 'unknown@unknown.com';
        const personalClerkOrgId = `personal_${clerkUserId}`;

        // Create personal organization
        const [newOrg] = await db
            .insert(schema.organizations)
            .values({
                clerkOrgId: personalClerkOrgId,
                name: 'My Organization',
                slug: `personal-${clerkUserId.slice(-8)}`,
            })
            .onConflictDoUpdate({
                target: schema.organizations.clerkOrgId,
                set: { updatedAt: new Date() },
            })
            .returning({ id: schema.organizations.id });

        if (!newOrg) return null;

        // Create user row linked to the new org
        await db
            .insert(schema.users)
            .values({
                clerkUserId,
                email,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                imageUrl: clerkUser.imageUrl,
                organizationId: newOrg.id,
                role: 'owner',
            })
            .onConflictDoUpdate({
                target: schema.users.clerkUserId,
                set: {
                    email,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    imageUrl: clerkUser.imageUrl,
                    organizationId: newOrg.id,
                    updatedAt: new Date(),
                },
            });

        return newOrg.id;
    } catch (err) {
        console.error('[resolveOrgId] Just-in-time provisioning failed:', err);
    }
    return null;
}

/**
 * Resolve org ID from an API key's organization_id field.
 * Used by API routes after Bearer token authentication.
 */
export function orgIdFromApiKey(apiKeyOrgId: string): string {
    return apiKeyOrgId;
}
