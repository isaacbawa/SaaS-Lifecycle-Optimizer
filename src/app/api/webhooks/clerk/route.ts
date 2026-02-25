/* ==========================================================================
 * Clerk Webhook Route — /api/webhooks/clerk
 *
 * Receives user and organization lifecycle events from Clerk via Svix.
 * Syncs data to the Neon PostgreSQL database so our app's user/org
 * records stay in lockstep with Clerk.
 *
 * Events handled:
 *  • user.created / user.updated / user.deleted
 *  • organization.created / organization.updated / organization.deleted
 *  • organizationMembership.created / organizationMembership.updated
 * ========================================================================== */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/* ── Types for Clerk webhook payloads ────────────────────────────────── */

interface ClerkUserData {
    id: string;
    email_addresses: Array<{
        id: string;
        email_address: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    last_sign_in_at: number | null;
    created_at: number;
    updated_at: number;
    organization_memberships?: Array<{
        organization: {
            id: string;
        };
        role: string;
    }>;
}

interface ClerkOrgData {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
    members_count?: number;
}

interface ClerkMembershipData {
    id: string;
    organization: {
        id: string;
    };
    public_user_data: {
        user_id: string;
    };
    role: string;
    created_at: number;
    updated_at: number;
}

/* ═══════════════════════════════════════════════════════════════════════
 * POST /api/webhooks/clerk
 * ═══════════════════════════════════════════════════════════════════════ */

export async function POST(request: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error('[clerk-webhook] Missing CLERK_WEBHOOK_SECRET');
        return NextResponse.json(
            { error: 'Server misconfiguration' },
            { status: 500 },
        );
    }

    /* ── Verify signature via Svix ──────────────────────────────────── */
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json(
            { error: 'Missing Svix headers' },
            { status: 400 },
        );
    }

    const body = await request.text();

    let event: { type: string; data: unknown };
    try {
        const wh = new Webhook(WEBHOOK_SECRET);
        event = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as { type: string; data: unknown };
    } catch (err) {
        console.error('[clerk-webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    /* ── Route by event type ────────────────────────────────────────── */
    try {
        switch (event.type) {
            /* ── Organization Events ─────────────────────────────────────── */
            case 'organization.created':
            case 'organization.updated': {
                const org = event.data as ClerkOrgData;
                await db
                    .insert(schema.organizations)
                    .values({
                        clerkOrgId: org.id,
                        name: org.name,
                        slug: org.slug,
                        imageUrl: org.image_url,
                    })
                    .onConflictDoUpdate({
                        target: schema.organizations.clerkOrgId,
                        set: {
                            name: org.name,
                            slug: org.slug,
                            imageUrl: org.image_url,
                            updatedAt: new Date(),
                        },
                    });
                break;
            }

            case 'organization.deleted': {
                const org = event.data as ClerkOrgData;
                await db
                    .delete(schema.organizations)
                    .where(eq(schema.organizations.clerkOrgId, org.id));
                break;
            }

            /* ── User Events ─────────────────────────────────────────────── */
            case 'user.created':
            case 'user.updated': {
                const user = event.data as ClerkUserData;
                const primaryEmail =
                    user.email_addresses?.[0]?.email_address ?? 'unknown@unknown.com';

                // Find org membership (if any)
                let organizationId: string | null = null;
                if (user.organization_memberships?.length) {
                    const clerkOrgId = user.organization_memberships[0].organization.id;
                    const [org] = await db
                        .select({ id: schema.organizations.id })
                        .from(schema.organizations)
                        .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
                        .limit(1);
                    if (org) organizationId = org.id;
                }

                // Map Clerk role to our enum
                const clerkRole = user.organization_memberships?.[0]?.role ?? 'member';
                const roleMap: Record<string, 'owner' | 'admin' | 'manager' | 'marketer' | 'analyst' | 'viewer'> = {
                    org_admin: 'admin',
                    admin: 'admin',
                    org_member: 'viewer',
                    member: 'viewer',
                };
                const role = roleMap[clerkRole] ?? 'viewer';

                await db
                    .insert(schema.users)
                    .values({
                        clerkUserId: user.id,
                        email: primaryEmail,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        imageUrl: user.image_url,
                        organizationId,
                        role,
                        lastSignInAt: user.last_sign_in_at
                            ? new Date(user.last_sign_in_at)
                            : null,
                    })
                    .onConflictDoUpdate({
                        target: schema.users.clerkUserId,
                        set: {
                            email: primaryEmail,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            imageUrl: user.image_url,
                            organizationId,
                            role,
                            lastSignInAt: user.last_sign_in_at
                                ? new Date(user.last_sign_in_at)
                                : null,
                            updatedAt: new Date(),
                        },
                    });
                break;
            }

            case 'user.deleted': {
                const user = event.data as ClerkUserData;
                await db
                    .delete(schema.users)
                    .where(eq(schema.users.clerkUserId, user.id));
                break;
            }

            /* ── Membership Events ───────────────────────────────────────── */
            case 'organizationMembership.created':
            case 'organizationMembership.updated': {
                const membership = event.data as ClerkMembershipData;
                const clerkUserId = membership.public_user_data.user_id;
                const clerkOrgId = membership.organization.id;

                // Resolve org ID
                const [org] = await db
                    .select({ id: schema.organizations.id })
                    .from(schema.organizations)
                    .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
                    .limit(1);

                if (org) {
                    const roleMap: Record<string, 'owner' | 'admin' | 'manager' | 'marketer' | 'analyst' | 'viewer'> = {
                        org_admin: 'admin',
                        admin: 'admin',
                        org_member: 'viewer',
                        member: 'viewer',
                    };
                    const role = roleMap[membership.role] ?? 'viewer';

                    await db
                        .update(schema.users)
                        .set({
                            organizationId: org.id,
                            role,
                            updatedAt: new Date(),
                        })
                        .where(eq(schema.users.clerkUserId, clerkUserId));
                }
                break;
            }

            default:
                // Unknown event type — log and accept
                console.log(`[clerk-webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (err) {
        console.error(`[clerk-webhook] Error processing ${event.type}:`, err);
        return NextResponse.json(
            { error: 'Internal processing error' },
            { status: 500 },
        );
    }
}
