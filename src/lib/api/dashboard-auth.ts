/* ==========================================================================
 * Dashboard API Authentication — Clerk Session Guard for Internal Routes
 *
 * Internal dashboard API routes (segments, email-templates, campaigns, etc.)
 * are same-origin only and should verify the user has an active Clerk session.
 *
 * This module provides a single `requireDashboardAuth()` function that:
 *   1. Checks for an active Clerk session via `auth()`
 *   2. Resolves the internal org UUID from Clerk's org/user ID
 *   3. Auto-provisions an org for new users who don't have one yet
 *   4. Returns the orgId or a 401/403 response
 *
 * Usage:
 *   const authResult = await requireDashboardAuth();
 *   if (!authResult.success) return authResult.response;
 *   const { orgId } = authResult;
 * ========================================================================== */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface DashboardAuthSuccess {
    success: true;
    orgId: string;
    userId: string;
}

export interface DashboardAuthFailure {
    success: false;
    response: NextResponse;
}

export type DashboardAuthResult = DashboardAuthSuccess | DashboardAuthFailure;

/**
 * Require a valid Clerk session for dashboard API routes.
 *
 * Returns the resolved internal org UUID or a JSON error response.
 * DEMO_ORG_ID is only used as a development fallback when Clerk is unavailable.
 */
export async function requireDashboardAuth(): Promise<DashboardAuthResult> {
    // 1. Check Clerk session — this is the PRODUCTION path
    let session: Awaited<ReturnType<typeof auth>>;
    try {
        session = await auth();
    } catch {
        // Clerk unavailable — fall through to dev override
        const demoOrgId = process.env.DEMO_ORG_ID;
        if (demoOrgId) {
            return { success: true, orgId: demoOrgId, userId: 'demo-user' };
        }
        return {
            success: false,
            response: NextResponse.json(
                { success: false, error: 'Authentication service unavailable' },
                { status: 500 },
            ),
        };
    }

    if (!session?.userId) {
        // No Clerk session — check dev override
        const demoOrgId = process.env.DEMO_ORG_ID;
        if (demoOrgId) {
            return { success: true, orgId: demoOrgId, userId: 'demo-user' };
        }
        return {
            success: false,
            response: NextResponse.json(
                { success: false, error: 'Authentication required. Please sign in.' },
                { status: 401 },
            ),
        };
    }

    // 2. Resolve internal org ID from Clerk session
    let orgId: string | null = null;

    // 2a. Try Clerk org ID first
    if (session.orgId) {
        const [org] = await db
            .select({ id: schema.organizations.id })
            .from(schema.organizations)
            .where(eq(schema.organizations.clerkOrgId, session.orgId))
            .limit(1);
        orgId = org?.id ?? null;
    }

    // 2b. Fallback: look up org via user record
    if (!orgId) {
        const [user] = await db
            .select({ orgId: schema.users.organizationId })
            .from(schema.users)
            .where(eq(schema.users.clerkUserId, session.userId))
            .limit(1);
        orgId = user?.orgId ?? null;

        // 2c. Auto-provision: authenticated user exists but has no org
        if (!orgId && user) {
            orgId = await autoProvisionOrg(session.userId);
        }
    }

    if (!orgId) {
        return {
            success: false,
            response: NextResponse.json(
                { success: false, error: 'No organization found for your account. Please contact support.' },
                { status: 403 },
            ),
        };
    }

    return { success: true, orgId, userId: session.userId };
}

/**
 * Auto-provision a personal organization for a Clerk user with no org.
 */
async function autoProvisionOrg(clerkUserId: string): Promise<string | null> {
    try {
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
            await db
                .update(schema.users)
                .set({ organizationId: newOrg.id, updatedAt: new Date() })
                .where(eq(schema.users.clerkUserId, clerkUserId));
            return newOrg.id;
        }
    } catch (err) {
        console.error('[requireDashboardAuth] Auto-provision failed:', err);
    }
    return null;
}
