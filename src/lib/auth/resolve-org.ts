/* ==========================================================================
 * Organization Resolution — Unified Org ID Resolution for All Contexts
 *
 * Provides a single entry-point to resolve the internal org UUID from:
 *   1. Clerk session (dashboard server components)
 *   2. API key record (SDK/API routes)
 *   3. Environment override (DEMO_ORG_ID for development)
 *   4. First-org fallback (single-tenant self-hosted mode)
 *
 * Every data access MUST go through this to ensure tenant isolation.
 * ========================================================================== */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Resolve the internal organization UUID for the current request context.
 *
 * For dashboard (server components):
 *   Uses Clerk `auth()` → orgId → looks up our DB org table.
 *
 * Falls back to:
 *   1. DEMO_ORG_ID env var (development)
 *   2. First organization in the DB (single-tenant self-hosted)
 */
export async function resolveOrgId(): Promise<string> {
    // 1. Check env override (dev / demo)
    const envOrgId = process.env.DEMO_ORG_ID;
    if (envOrgId) return envOrgId;

    // 2. Try Clerk session
    try {
        const session = await auth();
        const clerkOrgId = session?.orgId;
        if (clerkOrgId) {
            const [org] = await db
                .select({ id: schema.organizations.id })
                .from(schema.organizations)
                .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
                .limit(1);
            if (org) return org.id;
        }

        // If no org in Clerk session but user is authenticated,
        // try to find their org via the users table
        const clerkUserId = session?.userId;
        if (clerkUserId) {
            const [user] = await db
                .select({ orgId: schema.users.organizationId })
                .from(schema.users)
                .where(eq(schema.users.clerkUserId, clerkUserId))
                .limit(1);
            if (user?.orgId) return user.orgId;
        }
    } catch {
        // auth() may throw in non-request contexts — fall through
    }

    // 3. Fallback: first organization (single-tenant / self-hosted)
    const [org] = await db
        .select({ id: schema.organizations.id })
        .from(schema.organizations)
        .limit(1);
    return org?.id ?? '';
}

/**
 * Resolve org ID from an API key's organization_id field.
 * Used by API routes after Bearer token authentication.
 */
export function orgIdFromApiKey(apiKeyOrgId: string): string {
    return apiKeyOrgId;
}
