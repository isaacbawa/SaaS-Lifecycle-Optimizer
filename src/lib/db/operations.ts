/* ==========================================================================
 * Database Operations Layer — LifecycleOS
 *
 * Type-safe query functions using Drizzle ORM against Neon PostgreSQL.
 * Mirrors the interface of the in-memory store so call-sites can migrate
 * incrementally.
 *
 * All functions accept organizationId for tenant isolation.
 * ========================================================================== */

import { eq, and, desc, asc, gte, lte, sql, count, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

/* ═══════════════════════════════════════════════════════════════════════
 * Type helpers — Infer row types from schema
 * ═══════════════════════════════════════════════════════════════════════ */

export type Organization = typeof schema.organizations.$inferSelect;
export type OrganizationInsert = typeof schema.organizations.$inferInsert;

export type DbUser = typeof schema.users.$inferSelect;
export type DbUserInsert = typeof schema.users.$inferInsert;

export type TrackedAccount = typeof schema.trackedAccounts.$inferSelect;
export type TrackedAccountInsert = typeof schema.trackedAccounts.$inferInsert;

export type TrackedUser = typeof schema.trackedUsers.$inferSelect;
export type TrackedUserInsert = typeof schema.trackedUsers.$inferInsert;

export type Event = typeof schema.events.$inferSelect;
export type EventInsert = typeof schema.events.$inferInsert;

export type ApiKey = typeof schema.apiKeys.$inferSelect;
export type ApiKeyInsert = typeof schema.apiKeys.$inferInsert;

export type FlowDef = typeof schema.flowDefinitions.$inferSelect;
export type FlowDefInsert = typeof schema.flowDefinitions.$inferInsert;

export type FlowEnroll = typeof schema.flowEnrollments.$inferSelect;
export type FlowEnrollInsert = typeof schema.flowEnrollments.$inferInsert;

export type Webhook = typeof schema.webhooks.$inferSelect;
export type WebhookInsert = typeof schema.webhooks.$inferInsert;

export type WebhookDelivery = typeof schema.webhookDeliveries.$inferSelect;

export type ExpansionOpp = typeof schema.expansionOpportunities.$inferSelect;
export type ExpansionOppInsert = typeof schema.expansionOpportunities.$inferInsert;

export type ActivityLogEntry = typeof schema.activityLog.$inferSelect;
export type ActivityLogInsert = typeof schema.activityLog.$inferInsert;

export type RevenueRecord = typeof schema.revenueRecords.$inferSelect;
export type RevenueRecordInsert = typeof schema.revenueRecords.$inferInsert;

export type DeliverabilityMetric = typeof schema.deliverabilityMetrics.$inferSelect;
export type SendingDomain = typeof schema.sendingDomains.$inferSelect;

/* ═══════════════════════════════════════════════════════════════════════
 * Organizations
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getOrganizationByClerkId(clerkOrgId: string) {
    const [org] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.clerkOrgId, clerkOrgId))
        .limit(1);
    return org ?? null;
}

export async function upsertOrganization(data: OrganizationInsert) {
    const [org] = await db
        .insert(schema.organizations)
        .values(data)
        .onConflictDoUpdate({
            target: schema.organizations.clerkOrgId,
            set: {
                name: data.name,
                slug: data.slug,
                imageUrl: data.imageUrl,
                updatedAt: new Date(),
            },
        })
        .returning();
    return org;
}

export async function updateOrganization(id: string, updates: Partial<OrganizationInsert>) {
    const [org] = await db
        .update(schema.organizations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.organizations.id, id))
        .returning();
    return org ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Users (dashboard users synced from Clerk)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getUserByClerkId(clerkUserId: string) {
    const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkUserId, clerkUserId))
        .limit(1);
    return user ?? null;
}

export async function upsertUser(data: DbUserInsert) {
    const [user] = await db
        .insert(schema.users)
        .values(data)
        .onConflictDoUpdate({
            target: schema.users.clerkUserId,
            set: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                imageUrl: data.imageUrl,
                organizationId: data.organizationId,
                lastSignInAt: data.lastSignInAt,
                updatedAt: new Date(),
            },
        })
        .returning();
    return user;
}

export async function getOrganizationUsers(orgId: string) {
    return db
        .select()
        .from(schema.users)
        .where(eq(schema.users.organizationId, orgId))
        .orderBy(asc(schema.users.createdAt));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Accounts (customer's B2B accounts)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getTrackedAccount(orgId: string, id: string) {
    const [account] = await db
        .select()
        .from(schema.trackedAccounts)
        .where(and(
            eq(schema.trackedAccounts.organizationId, orgId),
            eq(schema.trackedAccounts.id, id),
        ))
        .limit(1);
    return account ?? null;
}

export async function getTrackedAccountByExternalId(orgId: string, externalId: string) {
    const [account] = await db
        .select()
        .from(schema.trackedAccounts)
        .where(and(
            eq(schema.trackedAccounts.organizationId, orgId),
            eq(schema.trackedAccounts.externalId, externalId),
        ))
        .limit(1);
    return account ?? null;
}

export async function getAllTrackedAccounts(orgId: string, options?: {
    health?: 'Good' | 'Fair' | 'Poor';
    limit?: number;
    offset?: number;
}) {
    let query = db
        .select()
        .from(schema.trackedAccounts)
        .where(
            options?.health
                ? and(
                    eq(schema.trackedAccounts.organizationId, orgId),
                    eq(schema.trackedAccounts.health, options.health),
                )
                : eq(schema.trackedAccounts.organizationId, orgId),
        )
        .orderBy(desc(schema.trackedAccounts.updatedAt))
        .$dynamic();

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    return query;
}

export async function upsertTrackedAccount(orgId: string, data: Omit<TrackedAccountInsert, 'organizationId'>) {
    const [account] = await db
        .insert(schema.trackedAccounts)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: [schema.trackedAccounts.organizationId, schema.trackedAccounts.externalId],
            set: {
                name: data.name,
                domain: data.domain,
                industry: data.industry,
                plan: data.plan,
                mrr: data.mrr,
                arr: data.arr,
                userCount: data.userCount,
                health: data.health,
                churnRiskScore: data.churnRiskScore,
                expansionScore: data.expansionScore,
                lifecycleDistribution: data.lifecycleDistribution,
                primaryContact: data.primaryContact,
                primaryContactEmail: data.primaryContactEmail,
                lastActivityAt: data.lastActivityAt,
                tags: data.tags,
                properties: data.properties,
                updatedAt: new Date(),
            },
        })
        .returning();
    return account;
}

export async function getTrackedAccountCount(orgId: string) {
    const [result] = await db
        .select({ count: count() })
        .from(schema.trackedAccounts)
        .where(eq(schema.trackedAccounts.organizationId, orgId));
    return result?.count ?? 0;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Users (end-users within accounts)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getTrackedUser(orgId: string, id: string) {
    const [user] = await db
        .select()
        .from(schema.trackedUsers)
        .where(and(
            eq(schema.trackedUsers.organizationId, orgId),
            eq(schema.trackedUsers.id, id),
        ))
        .limit(1);
    return user ?? null;
}

export async function getTrackedUserByExternalId(orgId: string, externalId: string) {
    const [user] = await db
        .select()
        .from(schema.trackedUsers)
        .where(and(
            eq(schema.trackedUsers.organizationId, orgId),
            eq(schema.trackedUsers.externalId, externalId),
        ))
        .limit(1);
    return user ?? null;
}

export async function getAllTrackedUsers(orgId: string, options?: {
    accountId?: string;
    lifecycleState?: string;
    limit?: number;
    offset?: number;
}) {
    const conditions = [eq(schema.trackedUsers.organizationId, orgId)];

    if (options?.accountId) {
        conditions.push(eq(schema.trackedUsers.accountId, options.accountId));
    }
    if (options?.lifecycleState) {
        conditions.push(
            eq(schema.trackedUsers.lifecycleState, options.lifecycleState as typeof schema.trackedUsers.lifecycleState.enumValues[number]),
        );
    }

    let query = db
        .select()
        .from(schema.trackedUsers)
        .where(and(...conditions))
        .orderBy(desc(schema.trackedUsers.updatedAt))
        .$dynamic();

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.offset(options.offset);

    return query;
}

export async function upsertTrackedUser(orgId: string, data: Omit<TrackedUserInsert, 'organizationId'>) {
    const [user] = await db
        .insert(schema.trackedUsers)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: [schema.trackedUsers.organizationId, schema.trackedUsers.externalId],
            set: {
                email: data.email,
                name: data.name,
                accountId: data.accountId,
                lifecycleState: data.lifecycleState,
                previousState: data.previousState,
                stateChangedAt: data.stateChangedAt,
                mrr: data.mrr,
                plan: data.plan,
                lastLoginAt: data.lastLoginAt,
                loginFrequency7d: data.loginFrequency7d,
                loginFrequency30d: data.loginFrequency30d,
                featureUsage30d: data.featureUsage30d,
                sessionDepthMinutes: data.sessionDepthMinutes,
                churnRiskScore: data.churnRiskScore,
                expansionScore: data.expansionScore,
                npsScore: data.npsScore,
                tags: data.tags,
                properties: data.properties,
                updatedAt: new Date(),
            },
        })
        .returning();
    return user;
}

/**
 * Partial update of a tracked user by internal UUID.
 * Only updates the provided fields — does NOT overwrite unset fields.
 * Used by the event pipeline for targeted field updates (e.g. lifecycleState, churnRiskScore).
 */
export async function updateTrackedUser(
    orgId: string,
    id: string,
    updates: Partial<Omit<TrackedUserInsert, 'organizationId' | 'externalId'>>,
) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) set[key] = value;
    }
    const [user] = await db
        .update(schema.trackedUsers)
        .set(set)
        .where(and(
            eq(schema.trackedUsers.organizationId, orgId),
            eq(schema.trackedUsers.id, id),
        ))
        .returning();
    return user ?? null;
}

/**
 * Partial update of a tracked user by externalId.
 * Convenience wrapper when you only have the SDK-provided user ID.
 */
export async function updateTrackedUserByExternalId(
    orgId: string,
    externalId: string,
    updates: Partial<Omit<TrackedUserInsert, 'organizationId' | 'externalId'>>,
) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) set[key] = value;
    }
    const [user] = await db
        .update(schema.trackedUsers)
        .set(set)
        .where(and(
            eq(schema.trackedUsers.organizationId, orgId),
            eq(schema.trackedUsers.externalId, externalId),
        ))
        .returning();
    return user ?? null;
}

export async function getTrackedUserCount(orgId: string) {
    const [result] = await db
        .select({ count: count() })
        .from(schema.trackedUsers)
        .where(eq(schema.trackedUsers.organizationId, orgId));
    return result?.count ?? 0;
}

export async function getLifecycleDistribution(orgId: string) {
    const result = await db
        .select({
            state: schema.trackedUsers.lifecycleState,
            count: count(),
        })
        .from(schema.trackedUsers)
        .where(eq(schema.trackedUsers.organizationId, orgId))
        .groupBy(schema.trackedUsers.lifecycleState);

    const distribution: Record<string, number> = {
        Lead: 0, Trial: 0, Activated: 0, PowerUser: 0,
        ExpansionReady: 0, AtRisk: 0, Churned: 0, Reactivated: 0,
    };
    for (const row of result) {
        if (row.state) distribution[row.state] = Number(row.count);
    }
    return distribution;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Events
 * ═══════════════════════════════════════════════════════════════════════ */

export async function ingestEvent(orgId: string, data: Omit<EventInsert, 'organizationId'>) {
    const [event] = await db
        .insert(schema.events)
        .values({ ...data, organizationId: orgId })
        .onConflictDoNothing({
            target: [schema.events.organizationId, schema.events.messageId],
        })
        .returning();
    return event ?? null;
}

export async function ingestEvents(orgId: string, batch: Omit<EventInsert, 'organizationId'>[]) {
    if (batch.length === 0) return { ingested: 0, duplicates: 0 };

    const values = batch.map((e) => ({ ...e, organizationId: orgId }));
    const inserted = await db
        .insert(schema.events)
        .values(values)
        .onConflictDoNothing({
            target: [schema.events.organizationId, schema.events.messageId],
        })
        .returning({ id: schema.events.id });

    return {
        ingested: inserted.length,
        duplicates: batch.length - inserted.length,
    };
}

export async function getEvents(orgId: string, filters?: {
    trackedUserId?: string;
    accountId?: string;
    name?: string;
    after?: Date;
    limit?: number;
}) {
    const conditions = [eq(schema.events.organizationId, orgId)];

    if (filters?.trackedUserId) {
        conditions.push(eq(schema.events.trackedUserId, filters.trackedUserId));
    }
    if (filters?.accountId) {
        conditions.push(eq(schema.events.accountId, filters.accountId));
    }
    if (filters?.name) {
        conditions.push(eq(schema.events.name, filters.name));
    }
    if (filters?.after) {
        conditions.push(gte(schema.events.receivedAt, filters.after));
    }

    return db
        .select()
        .from(schema.events)
        .where(and(...conditions))
        .orderBy(desc(schema.events.receivedAt))
        .limit(filters?.limit ?? 100);
}

export async function getEventCount(orgId: string, filters?: { name?: string }) {
    const conditions = [eq(schema.events.organizationId, orgId)];
    if (filters?.name) {
        conditions.push(eq(schema.events.name, filters.name));
    }
    const [result] = await db
        .select({ count: count() })
        .from(schema.events)
        .where(and(...conditions));
    return result?.count ?? 0;
}

/* ═══════════════════════════════════════════════════════════════════════
 * API Keys
 * ═══════════════════════════════════════════════════════════════════════ */

export async function validateApiKey(keyHash: string) {
    const [key] = await db
        .select()
        .from(schema.apiKeys)
        .where(and(
            eq(schema.apiKeys.keyHash, keyHash),
            eq(schema.apiKeys.revoked, false),
        ))
        .limit(1);
    return key ?? null;
}

export async function getApiKeysByOrg(orgId: string) {
    return db
        .select()
        .from(schema.apiKeys)
        .where(and(
            eq(schema.apiKeys.organizationId, orgId),
            eq(schema.apiKeys.revoked, false),
        ))
        .orderBy(desc(schema.apiKeys.createdAt));
}

export async function createApiKey(data: ApiKeyInsert) {
    const [key] = await db
        .insert(schema.apiKeys)
        .values(data)
        .returning();
    return key;
}

export async function revokeApiKey(orgId: string, keyId: string) {
    const [key] = await db
        .update(schema.apiKeys)
        .set({ revoked: true, revokedAt: new Date() })
        .where(and(
            eq(schema.apiKeys.id, keyId),
            eq(schema.apiKeys.organizationId, orgId),
        ))
        .returning();
    return key ?? null;
}

export async function touchApiKeyUsage(keyId: string) {
    await db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, keyId));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Definitions
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getFlowDefinition(orgId: string, id: string) {
    const [flow] = await db
        .select()
        .from(schema.flowDefinitions)
        .where(and(
            eq(schema.flowDefinitions.organizationId, orgId),
            eq(schema.flowDefinitions.id, id),
        ))
        .limit(1);
    return flow ?? null;
}

export async function getAllFlowDefinitions(orgId: string, status?: string) {
    const conditions = [eq(schema.flowDefinitions.organizationId, orgId)];
    if (status) {
        conditions.push(
            eq(schema.flowDefinitions.status, status as typeof schema.flowDefinitions.status.enumValues[number]),
        );
    }
    return db
        .select()
        .from(schema.flowDefinitions)
        .where(and(...conditions))
        .orderBy(desc(schema.flowDefinitions.updatedAt));
}

export async function upsertFlowDefinition(orgId: string, data: Omit<FlowDefInsert, 'organizationId'>) {
    const [flow] = await db
        .insert(schema.flowDefinitions)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: schema.flowDefinitions.id,
            set: {
                name: data.name,
                description: data.description,
                status: data.status,
                nodes: data.nodes,
                edges: data.edges,
                variables: data.variables,
                settings: data.settings,
                metrics: data.metrics,
                updatedAt: new Date(),
                publishedAt: data.publishedAt,
            },
        })
        .returning();
    return flow;
}

export async function deleteFlowDefinition(orgId: string, id: string) {
    const result = await db
        .delete(schema.flowDefinitions)
        .where(and(
            eq(schema.flowDefinitions.organizationId, orgId),
            eq(schema.flowDefinitions.id, id),
        ))
        .returning({ id: schema.flowDefinitions.id });
    return result.length > 0;
}

export async function duplicateFlowDefinition(orgId: string, id: string) {
    const [original] = await db
        .select()
        .from(schema.flowDefinitions)
        .where(and(
            eq(schema.flowDefinitions.organizationId, orgId),
            eq(schema.flowDefinitions.id, id),
        ))
        .limit(1);
    if (!original) return null;

    const now = new Date();
    const [copy] = await db
        .insert(schema.flowDefinitions)
        .values({
            organizationId: orgId,
            name: `${original.name} (Copy)`,
            description: original.description,
            status: 'draft',
            version: 1,
            nodes: original.nodes,
            edges: original.edges,
            variables: original.variables,
            settings: original.settings,
            metrics: {},
            createdAt: now,
            updatedAt: now,
        })
        .returning();
    return copy;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Enrollments
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getFlowEnrollments(orgId: string, flowId: string, status?: string) {
    const conditions = [
        eq(schema.flowEnrollments.organizationId, orgId),
        eq(schema.flowEnrollments.flowId, flowId),
    ];
    if (status) {
        conditions.push(
            eq(schema.flowEnrollments.status, status as typeof schema.flowEnrollments.status.enumValues[number]),
        );
    }
    return db
        .select()
        .from(schema.flowEnrollments)
        .where(and(...conditions))
        .orderBy(desc(schema.flowEnrollments.enrolledAt));
}

export async function getUserEnrollments(orgId: string, trackedUserId: string) {
    return db
        .select()
        .from(schema.flowEnrollments)
        .where(and(
            eq(schema.flowEnrollments.organizationId, orgId),
            eq(schema.flowEnrollments.trackedUserId, trackedUserId),
        ))
        .orderBy(desc(schema.flowEnrollments.enrolledAt));
}

export async function upsertEnrollment(data: FlowEnrollInsert) {
    const [enrollment] = await db
        .insert(schema.flowEnrollments)
        .values(data)
        .onConflictDoUpdate({
            target: schema.flowEnrollments.id,
            set: {
                status: data.status,
                currentNodeId: data.currentNodeId,
                variables: data.variables,
                lastProcessedAt: data.lastProcessedAt,
                completedAt: data.completedAt,
                nextProcessAt: data.nextProcessAt,
                errorMessage: data.errorMessage,
                errorNodeId: data.errorNodeId,
                history: data.history,
            },
        })
        .returning();
    return enrollment;
}

export async function getActiveEnrollmentsDue() {
    return db
        .select()
        .from(schema.flowEnrollments)
        .where(and(
            eq(schema.flowEnrollments.status, 'active'),
            lte(schema.flowEnrollments.nextProcessAt, new Date()),
        ))
        .limit(500);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Webhooks
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getWebhooks(orgId: string) {
    return db
        .select()
        .from(schema.webhooks)
        .where(eq(schema.webhooks.organizationId, orgId))
        .orderBy(desc(schema.webhooks.createdAt));
}

export async function getWebhook(orgId: string, id: string) {
    const [webhook] = await db
        .select()
        .from(schema.webhooks)
        .where(and(
            eq(schema.webhooks.organizationId, orgId),
            eq(schema.webhooks.id, id),
        ))
        .limit(1);
    return webhook ?? null;
}

export async function upsertWebhook(orgId: string, data: Omit<WebhookInsert, 'organizationId'>) {
    const [webhook] = await db
        .insert(schema.webhooks)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: schema.webhooks.id,
            set: {
                url: data.url,
                events: data.events,
                status: data.status,
                updatedAt: new Date(),
            },
        })
        .returning();
    return webhook;
}

export async function deleteWebhook(orgId: string, id: string) {
    const result = await db
        .delete(schema.webhooks)
        .where(and(
            eq(schema.webhooks.organizationId, orgId),
            eq(schema.webhooks.id, id),
        ))
        .returning({ id: schema.webhooks.id });
    return result.length > 0;
}

/**
 * Targeted webhook status update for the delivery system.
 * Only updates status, successRate, lastTriggeredAt, failCount.
 */
export async function updateWebhookDeliveryStatus(
    id: string,
    updates: {
        status?: 'active' | 'failing' | 'inactive';
        successRate?: number;
        lastTriggeredAt?: Date;
        failCount?: number;
    },
) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.status !== undefined) set.status = updates.status;
    if (updates.successRate !== undefined) set.successRate = updates.successRate;
    if (updates.lastTriggeredAt !== undefined) set.lastTriggeredAt = updates.lastTriggeredAt;
    if (updates.failCount !== undefined) set.failCount = updates.failCount;
    const [webhook] = await db
        .update(schema.webhooks)
        .set(set)
        .where(eq(schema.webhooks.id, id))
        .returning();
    return webhook ?? null;
}

export async function recordWebhookDelivery(data: typeof schema.webhookDeliveries.$inferInsert) {
    const [delivery] = await db
        .insert(schema.webhookDeliveries)
        .values(data)
        .returning();
    return delivery;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Expansion Opportunities
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getExpansionOpportunities(orgId: string, status?: string) {
    const conditions = [eq(schema.expansionOpportunities.organizationId, orgId)];
    if (status) {
        conditions.push(
            eq(schema.expansionOpportunities.status, status as typeof schema.expansionOpportunities.status.enumValues[number]),
        );
    }
    return db
        .select()
        .from(schema.expansionOpportunities)
        .where(and(...conditions))
        .orderBy(desc(schema.expansionOpportunities.identifiedAt));
}

export async function upsertExpansionOpportunity(orgId: string, data: Omit<ExpansionOppInsert, 'organizationId'>) {
    const [opp] = await db
        .insert(schema.expansionOpportunities)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: schema.expansionOpportunities.id,
            set: {
                signal: data.signal,
                signalDescription: data.signalDescription,
                currentMrr: data.currentMrr,
                potentialMrr: data.potentialMrr,
                upliftMrr: data.upliftMrr,
                confidence: data.confidence,
                status: data.status,
                lastActionAt: data.lastActionAt,
            },
        })
        .returning();
    return opp;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Activity Log
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getActivityLog(orgId: string, limit = 50) {
    return db
        .select()
        .from(schema.activityLog)
        .where(eq(schema.activityLog.organizationId, orgId))
        .orderBy(desc(schema.activityLog.createdAt))
        .limit(limit);
}

export async function addActivityEntry(orgId: string, data: Omit<ActivityLogInsert, 'organizationId'>) {
    const [entry] = await db
        .insert(schema.activityLog)
        .values({ ...data, organizationId: orgId })
        .returning();
    return entry;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Revenue Records
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getRevenueRecords(orgId: string, options?: {
    startMonth?: string;
    endMonth?: string;
}) {
    const conditions = [eq(schema.revenueRecords.organizationId, orgId)];
    if (options?.startMonth) {
        conditions.push(gte(schema.revenueRecords.month, options.startMonth));
    }
    if (options?.endMonth) {
        conditions.push(lte(schema.revenueRecords.month, options.endMonth));
    }
    return db
        .select()
        .from(schema.revenueRecords)
        .where(and(...conditions))
        .orderBy(asc(schema.revenueRecords.month));
}

export async function addRevenueRecord(orgId: string, data: Omit<RevenueRecordInsert, 'organizationId'>) {
    const [record] = await db
        .insert(schema.revenueRecords)
        .values({ ...data, organizationId: orgId })
        .returning();
    return record;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Deliverability Metrics
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getDeliverabilityMetrics(orgId: string, options?: {
    startDate?: string;
    endDate?: string;
}) {
    const conditions = [eq(schema.deliverabilityMetrics.organizationId, orgId)];
    if (options?.startDate) {
        conditions.push(gte(schema.deliverabilityMetrics.date, options.startDate));
    }
    if (options?.endDate) {
        conditions.push(lte(schema.deliverabilityMetrics.date, options.endDate));
    }
    return db
        .select()
        .from(schema.deliverabilityMetrics)
        .where(and(...conditions))
        .orderBy(asc(schema.deliverabilityMetrics.date));
}

export async function upsertDeliverabilityMetric(orgId: string, data: Omit<typeof schema.deliverabilityMetrics.$inferInsert, 'organizationId'>) {
    const [metric] = await db
        .insert(schema.deliverabilityMetrics)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: [schema.deliverabilityMetrics.organizationId, schema.deliverabilityMetrics.date],
            set: {
                sent: data.sent,
                delivered: data.delivered,
                opened: data.opened,
                clicked: data.clicked,
                bounced: data.bounced,
                spam: data.spam,
                unsubscribed: data.unsubscribed,
            },
        })
        .returning();
    return metric;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Sending Domains
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getSendingDomains(orgId: string) {
    return db
        .select()
        .from(schema.sendingDomains)
        .where(eq(schema.sendingDomains.organizationId, orgId))
        .orderBy(desc(schema.sendingDomains.addedAt));
}

export async function getSendingDomain(orgId: string, domainName: string) {
    const [d] = await db
        .select()
        .from(schema.sendingDomains)
        .where(
            and(
                eq(schema.sendingDomains.organizationId, orgId),
                eq(schema.sendingDomains.domain, domainName),
            ),
        )
        .limit(1);
    return d ?? null;
}

export async function getSendingDomainById(orgId: string, id: string) {
    const [d] = await db
        .select()
        .from(schema.sendingDomains)
        .where(
            and(
                eq(schema.sendingDomains.organizationId, orgId),
                eq(schema.sendingDomains.id, id),
            ),
        )
        .limit(1);
    return d ?? null;
}

export async function upsertSendingDomain(orgId: string, data: Omit<typeof schema.sendingDomains.$inferInsert, 'organizationId'>) {
    const [domain] = await db
        .insert(schema.sendingDomains)
        .values({ ...data, organizationId: orgId })
        .onConflictDoUpdate({
            target: [schema.sendingDomains.organizationId, schema.sendingDomains.domain],
            set: {
                status: data.status,
                dkimVerified: data.dkimVerified,
                spfVerified: data.spfVerified,
                dmarcVerified: data.dmarcVerified,
                mxVerified: data.mxVerified,
                authScore: data.authScore,
                dkimSelector: data.dkimSelector,
                verificationDetails: data.verificationDetails,
                requiredRecords: data.requiredRecords,
                lastCheckedAt: data.lastCheckedAt,
            },
        })
        .returning();
    return domain;
}

export async function deleteSendingDomain(orgId: string, id: string) {
    await db
        .delete(schema.sendingDomains)
        .where(
            and(
                eq(schema.sendingDomains.organizationId, orgId),
                eq(schema.sendingDomains.id, id),
            ),
        );
}

/* ═══════════════════════════════════════════════════════════════════════
 * KPI Aggregation (dashboard summary)
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getKPISummary(orgId: string) {
    const [userCountResult, accountCountResult, mrrResult, distribution] = await Promise.all([
        getTrackedUserCount(orgId),
        getTrackedAccountCount(orgId),
        db.select({
            totalMrr: sql<number>`coalesce(sum(${schema.trackedAccounts.mrr}), 0)`,
            avgChurnRisk: sql<number>`coalesce(avg(${schema.trackedAccounts.churnRiskScore}), 0)`,
            avgExpansionScore: sql<number>`coalesce(avg(${schema.trackedAccounts.expansionScore}), 0)`,
        }).from(schema.trackedAccounts).where(eq(schema.trackedAccounts.organizationId, orgId)),
        getLifecycleDistribution(orgId),
    ]);

    const mrr = mrrResult[0];

    return {
        totalUsers: userCountResult,
        totalAccounts: accountCountResult,
        totalMrr: Number(mrr?.totalMrr ?? 0),
        totalArr: Number(mrr?.totalMrr ?? 0) * 12,
        avgChurnRisk: Math.round(Number(mrr?.avgChurnRisk ?? 0)),
        avgExpansionScore: Math.round(Number(mrr?.avgExpansionScore ?? 0)),
        lifecycleDistribution: distribution,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Segments
 * ═══════════════════════════════════════════════════════════════════════ */

export type Segment = typeof schema.segments.$inferSelect;
export type SegmentInsert = typeof schema.segments.$inferInsert;
export type SegmentMembership = typeof schema.segmentMemberships.$inferSelect;

export async function getSegment(orgId: string, id: string) {
    const [seg] = await db
        .select()
        .from(schema.segments)
        .where(and(eq(schema.segments.organizationId, orgId), eq(schema.segments.id, id)))
        .limit(1);
    return seg ?? null;
}

export async function getSegmentByName(orgId: string, name: string) {
    const [seg] = await db
        .select()
        .from(schema.segments)
        .where(and(eq(schema.segments.organizationId, orgId), eq(schema.segments.name, name)))
        .limit(1);
    return seg ?? null;
}

export async function getAllSegments(orgId: string, status?: string) {
    const conditions = [eq(schema.segments.organizationId, orgId)];
    if (status) conditions.push(eq(schema.segments.status, status as 'active' | 'draft' | 'archived'));
    return db.select().from(schema.segments).where(and(...conditions)).orderBy(desc(schema.segments.updatedAt));
}

export async function upsertSegment(orgId: string, data: Omit<SegmentInsert, 'organizationId'>) {
    if (data.id) {
        const [seg] = await db.update(schema.segments)
            .set({ ...data, organizationId: orgId, updatedAt: new Date() })
            .where(and(eq(schema.segments.organizationId, orgId), eq(schema.segments.id, data.id)))
            .returning();
        return seg;
    }
    const [seg] = await db.insert(schema.segments).values({ ...data, organizationId: orgId }).returning();
    return seg;
}

export async function deleteSegment(orgId: string, id: string) {
    const result = await db.delete(schema.segments)
        .where(and(eq(schema.segments.organizationId, orgId), eq(schema.segments.id, id)))
        .returning({ id: schema.segments.id });
    return result.length > 0;
}

export async function getSegmentMembers(segmentId: string, limit = 100) {
    return db.select({ membership: schema.segmentMemberships, user: schema.trackedUsers })
        .from(schema.segmentMemberships)
        .innerJoin(schema.trackedUsers, eq(schema.segmentMemberships.trackedUserId, schema.trackedUsers.id))
        .where(and(eq(schema.segmentMemberships.segmentId, segmentId), isNull(schema.segmentMemberships.exitedAt)))
        .orderBy(desc(schema.segmentMemberships.enteredAt))
        .limit(limit);
}

export async function upsertSegmentMembership(segmentId: string, trackedUserId: string) {
    const [m] = await db.insert(schema.segmentMemberships)
        .values({ segmentId, trackedUserId })
        .onConflictDoNothing({ target: [schema.segmentMemberships.segmentId, schema.segmentMemberships.trackedUserId] })
        .returning();
    return m;
}

export async function removeSegmentMembership(segmentId: string, trackedUserId: string) {
    await db.update(schema.segmentMemberships)
        .set({ exitedAt: new Date() })
        .where(and(eq(schema.segmentMemberships.segmentId, segmentId), eq(schema.segmentMemberships.trackedUserId, trackedUserId), isNull(schema.segmentMemberships.exitedAt)));
}

export async function clearSegmentMemberships(segmentId: string) {
    await db.delete(schema.segmentMemberships).where(eq(schema.segmentMemberships.segmentId, segmentId));
}

export async function updateSegmentCount(segmentId: string, matchedCount: number) {
    await db.update(schema.segments).set({ matchedUserCount: matchedCount, lastEvaluatedAt: new Date() }).where(eq(schema.segments.id, segmentId));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Email Templates
 * ═══════════════════════════════════════════════════════════════════════ */

export type EmailTemplate = typeof schema.emailTemplates.$inferSelect;
export type EmailTemplateInsert = typeof schema.emailTemplates.$inferInsert;

export async function getEmailTemplate(orgId: string, id: string) {
    const [t] = await db.select().from(schema.emailTemplates)
        .where(and(eq(schema.emailTemplates.organizationId, orgId), eq(schema.emailTemplates.id, id))).limit(1);
    return t ?? null;
}

export async function getAllEmailTemplates(orgId: string, status?: string) {
    const conditions = [eq(schema.emailTemplates.organizationId, orgId)];
    if (status) conditions.push(eq(schema.emailTemplates.status, status as 'draft' | 'active' | 'archived'));
    return db.select().from(schema.emailTemplates).where(and(...conditions)).orderBy(desc(schema.emailTemplates.updatedAt));
}

export async function upsertEmailTemplate(orgId: string, data: Omit<EmailTemplateInsert, 'organizationId'>) {
    if (data.id) {
        const [t] = await db.update(schema.emailTemplates)
            .set({ ...data, organizationId: orgId, updatedAt: new Date() })
            .where(and(eq(schema.emailTemplates.organizationId, orgId), eq(schema.emailTemplates.id, data.id)))
            .returning();
        return t;
    }
    const [t] = await db.insert(schema.emailTemplates).values({ ...data, organizationId: orgId }).returning();
    return t;
}

export async function deleteEmailTemplate(orgId: string, id: string) {
    const result = await db.delete(schema.emailTemplates)
        .where(and(eq(schema.emailTemplates.organizationId, orgId), eq(schema.emailTemplates.id, id)))
        .returning({ id: schema.emailTemplates.id });
    return result.length > 0;
}

export async function incrementTemplateSendCount(templateId: string) {
    await db.update(schema.emailTemplates).set({ sendCount: sql`${schema.emailTemplates.sendCount} + 1` }).where(eq(schema.emailTemplates.id, templateId));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Email Campaigns
 * ═══════════════════════════════════════════════════════════════════════ */

export type EmailCampaign = typeof schema.emailCampaigns.$inferSelect;
export type EmailCampaignInsert = typeof schema.emailCampaigns.$inferInsert;

export async function getEmailCampaign(orgId: string, id: string) {
    const [c] = await db.select().from(schema.emailCampaigns)
        .where(and(eq(schema.emailCampaigns.organizationId, orgId), eq(schema.emailCampaigns.id, id))).limit(1);
    return c ?? null;
}

export async function getAllEmailCampaigns(orgId: string, status?: string) {
    const conditions = [eq(schema.emailCampaigns.organizationId, orgId)];
    if (status) conditions.push(eq(schema.emailCampaigns.status, status as 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'));
    return db.select().from(schema.emailCampaigns).where(and(...conditions)).orderBy(desc(schema.emailCampaigns.updatedAt));
}

export async function upsertEmailCampaign(orgId: string, data: Omit<EmailCampaignInsert, 'organizationId'> | (Partial<Omit<EmailCampaignInsert, 'organizationId'>> & { id: string })) {
    if (data.id) {
        const [c] = await db.update(schema.emailCampaigns)
            .set({ ...data, organizationId: orgId, updatedAt: new Date() })
            .where(and(eq(schema.emailCampaigns.organizationId, orgId), eq(schema.emailCampaigns.id, data.id)))
            .returning();
        return c;
    }
    const [c] = await db.insert(schema.emailCampaigns).values({ ...(data as EmailCampaignInsert), organizationId: orgId }).returning();
    return c;
}

export async function deleteEmailCampaign(orgId: string, id: string) {
    const result = await db.delete(schema.emailCampaigns)
        .where(and(eq(schema.emailCampaigns.organizationId, orgId), eq(schema.emailCampaigns.id, id)))
        .returning({ id: schema.emailCampaigns.id });
    return result.length > 0;
}

export async function updateCampaignMetrics(campaignId: string, metrics: Partial<{
    totalSent: number; totalDelivered: number; totalOpened: number;
    totalClicked: number; totalBounced: number; totalUnsubscribed: number; totalRevenue: number;
}>) {
    await db.update(schema.emailCampaigns).set({ ...metrics, updatedAt: new Date() }).where(eq(schema.emailCampaigns.id, campaignId));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Email Sends
 * ═══════════════════════════════════════════════════════════════════════ */

export type EmailSend = typeof schema.emailSends.$inferSelect;
export type EmailSendInsert = typeof schema.emailSends.$inferInsert;

export async function createEmailSend(orgId: string, data: Omit<EmailSendInsert, 'organizationId'>) {
    const [s] = await db.insert(schema.emailSends).values({ ...data, organizationId: orgId }).returning();
    return s;
}

export async function getEmailSends(orgId: string, filters?: {
    campaignId?: string; trackedUserId?: string; status?: string; limit?: number;
}) {
    const conditions = [eq(schema.emailSends.organizationId, orgId)];
    if (filters?.campaignId) conditions.push(eq(schema.emailSends.campaignId, filters.campaignId));
    if (filters?.trackedUserId) conditions.push(eq(schema.emailSends.trackedUserId, filters.trackedUserId));
    if (filters?.status) conditions.push(eq(schema.emailSends.status, filters.status as typeof schema.emailSends.status.enumValues[number]));
    return db.select().from(schema.emailSends).where(and(...conditions)).orderBy(desc(schema.emailSends.createdAt)).limit(filters?.limit ?? 100);
}

export async function updateEmailSendStatus(sendId: string, status: string, details?: {
    providerMessageId?: string; failureReason?: string;
}) {
    const now = new Date();
    const updates: Record<string, unknown> = { status };
    if (details?.providerMessageId) updates.providerMessageId = details.providerMessageId;
    if (details?.failureReason) updates.failureReason = details.failureReason;
    if (status === 'sent') updates.sentAt = now;
    if (status === 'delivered') updates.deliveredAt = now;
    if (status === 'opened') { updates.openedAt = now; updates.openCount = sql`${schema.emailSends.openCount} + 1`; }
    if (status === 'clicked') { updates.clickedAt = now; updates.clickCount = sql`${schema.emailSends.clickCount} + 1`; }
    if (status === 'bounced') updates.bouncedAt = now;
    const [s] = await db.update(schema.emailSends).set(updates).where(eq(schema.emailSends.id, sendId)).returning();
    return s ?? null;
}

export async function getCampaignSendStats(campaignId: string) {
    const result = await db.select({ status: schema.emailSends.status, count: count() })
        .from(schema.emailSends).where(eq(schema.emailSends.campaignId, campaignId)).groupBy(schema.emailSends.status);
    const stats: Record<string, number> = {};
    for (const row of result) stats[row.status] = Number(row.count);
    return stats;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Personalization Rules
 * ═══════════════════════════════════════════════════════════════════════ */

export type PersonalizationRule = typeof schema.personalizationRules.$inferSelect;
export type PersonalizationRuleInsert = typeof schema.personalizationRules.$inferInsert;

export async function getPersonalizationRule(orgId: string, id: string) {
    const [r] = await db.select().from(schema.personalizationRules)
        .where(and(eq(schema.personalizationRules.organizationId, orgId), eq(schema.personalizationRules.id, id))).limit(1);
    return r ?? null;
}

export async function getAllPersonalizationRules(orgId: string, status?: string) {
    const conditions = [eq(schema.personalizationRules.organizationId, orgId)];
    if (status) conditions.push(eq(schema.personalizationRules.status, status as 'active' | 'draft' | 'archived'));
    return db.select().from(schema.personalizationRules).where(and(...conditions)).orderBy(desc(schema.personalizationRules.priority));
}

export async function upsertPersonalizationRule(orgId: string, data: Omit<PersonalizationRuleInsert, 'organizationId'>) {
    if (data.id) {
        const [r] = await db.update(schema.personalizationRules)
            .set({ ...data, organizationId: orgId, updatedAt: new Date() })
            .where(and(eq(schema.personalizationRules.organizationId, orgId), eq(schema.personalizationRules.id, data.id)))
            .returning();
        return r;
    }
    const [r] = await db.insert(schema.personalizationRules).values({ ...data, organizationId: orgId }).returning();
    return r;
}

export async function deletePersonalizationRule(orgId: string, id: string) {
    const result = await db.delete(schema.personalizationRules)
        .where(and(eq(schema.personalizationRules.organizationId, orgId), eq(schema.personalizationRules.id, id)))
        .returning({ id: schema.personalizationRules.id });
    return result.length > 0;
}

export async function incrementPersonalizationImpression(ruleId: string) {
    await db.update(schema.personalizationRules).set({ impressionCount: sql`${schema.personalizationRules.impressionCount} + 1` }).where(eq(schema.personalizationRules.id, ruleId));
}

export async function incrementPersonalizationConversion(ruleId: string) {
    await db.update(schema.personalizationRules).set({ conversionCount: sql`${schema.personalizationRules.conversionCount} + 1` }).where(eq(schema.personalizationRules.id, ruleId));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Integration operations
 * ═══════════════════════════════════════════════════════════════════════ */

export async function getIntegration(orgId: string, id: string) {
    return db.select().from(schema.integrations)
        .where(and(eq(schema.integrations.organizationId, orgId), eq(schema.integrations.id, id)))
        .then(r => r[0] ?? null);
}

export async function getIntegrationByProvider(orgId: string, provider: string) {
    return db.select().from(schema.integrations)
        .where(and(eq(schema.integrations.organizationId, orgId), eq(schema.integrations.provider, provider)))
        .then(r => r[0] ?? null);
}

export async function getAllIntegrations(orgId: string, status?: string) {
    const conditions = [eq(schema.integrations.organizationId, orgId)];
    if (status) conditions.push(eq(schema.integrations.status, status as 'connected' | 'pending' | 'disconnected' | 'error'));
    return db.select().from(schema.integrations).where(and(...conditions)).orderBy(schema.integrations.createdAt);
}

export async function upsertIntegration(orgId: string, data: Record<string, unknown>) {
    if (data.id) {
        const { id, ...rest } = data;
        const [r] = await db.update(schema.integrations)
            .set({ ...rest, updatedAt: new Date() })
            .where(and(eq(schema.integrations.organizationId, orgId), eq(schema.integrations.id, id as string)))
            .returning();
        return r;
    }
    const [r] = await db.insert(schema.integrations).values({ ...data, organizationId: orgId } as typeof schema.integrations.$inferInsert).returning();
    return r;
}

export async function deleteIntegration(orgId: string, id: string) {
    const result = await db.delete(schema.integrations)
        .where(and(eq(schema.integrations.organizationId, orgId), eq(schema.integrations.id, id)))
        .returning({ id: schema.integrations.id });
    return result.length > 0;
}

export async function updateIntegrationStatus(orgId: string, id: string, status: string, error?: string) {
    await db.update(schema.integrations)
        .set({
            status: status as 'connected' | 'pending' | 'disconnected' | 'error',
            lastError: error ?? null,
            lastHealthCheckAt: new Date(),
            updatedAt: new Date(),
        })
        .where(and(eq(schema.integrations.organizationId, orgId), eq(schema.integrations.id, id)));
}

export async function getIntegrationCapabilities(orgId: string): Promise<{ capabilities: string[]; connectedCategories: string[] }> {
    const integrations = await getAllIntegrations(orgId, 'connected');
    const capabilities = new Set<string>();
    const categories = new Set<string>();
    for (const intg of integrations) {
        categories.add(intg.category);
        for (const cap of (intg.capabilities ?? [])) {
            capabilities.add(cap);
        }
    }
    return { capabilities: [...capabilities], connectedCategories: [...categories] };
}
