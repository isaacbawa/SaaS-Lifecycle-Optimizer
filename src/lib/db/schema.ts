/* ==========================================================================
 * Database Schema — LifecycleOS SaaS Infrastructure Platform
 *
 * Neon Serverless PostgreSQL + Drizzle ORM
 *
 * Design principles:
 *  1. Multi-tenant via organization_id (maps to Clerk org)
 *  2. Every table that belongs to a tenant has organization_id + index
 *  3. JSONB for flexible/dynamic data (event properties, node configs)
 *  4. Timestamps on every table (created_at, updated_at)
 *  5. Soft-delete where appropriate (archived_at)
 *  6. Proper indexes for all query patterns
 * ========================================================================== */

import {
    pgTable,
    text,
    varchar,
    integer,
    bigint,
    boolean,
    timestamp,
    jsonb,
    real,
    index,
    uniqueIndex,
    uuid,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ═══════════════════════════════════════════════════════════════════════
 * Enums
 * ═══════════════════════════════════════════════════════════════════════ */

export const lifecycleStateEnum = pgEnum('lifecycle_state', [
    'Lead', 'Trial', 'Activated', 'PowerUser',
    'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated',
]);

export const accountHealthEnum = pgEnum('account_health', ['Good', 'Fair', 'Poor']);

export const planTierEnum = pgEnum('plan_tier', [
    'Trial', 'Starter', 'Growth', 'Business', 'Enterprise',
]);

export const riskTierEnum = pgEnum('risk_tier', ['Low', 'Medium', 'High', 'Critical']);

export const teamRoleEnum = pgEnum('team_role', [
    'owner', 'admin', 'manager', 'marketer', 'analyst', 'viewer',
]);

export const flowStatusEnum = pgEnum('flow_status', [
    'draft', 'active', 'paused', 'archived', 'error',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
    'active', 'paused', 'completed', 'exited', 'error',
]);

export const apiKeyScopeEnum = pgEnum('api_key_scope', [
    'identify', 'track', 'group', 'read', 'write', 'admin',
]);

export const webhookStatusEnum = pgEnum('webhook_status', [
    'active', 'inactive', 'failing',
]);

export const expansionSignalEnum = pgEnum('expansion_signal', [
    'seat_cap', 'plan_limit', 'heavy_usage', 'api_throttle', 'feature_gate',
]);

export const expansionStatusEnum = pgEnum('expansion_status', [
    'identified', 'contacted', 'negotiating', 'converted', 'declined',
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Organization (Clerk-synced B2B tenant)
 * ═══════════════════════════════════════════════════════════════════════ */

export const organizations = pgTable('organizations', {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkOrgId: varchar('clerk_org_id', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }),
    imageUrl: text('image_url'),
    plan: planTierEnum('plan').default('Trial').notNull(),
    /** Monthly event quota based on plan */
    monthlyEventQuota: integer('monthly_event_quota').default(10000).notNull(),
    /** Current period usage */
    currentPeriodEvents: integer('current_period_events').default(0).notNull(),
    periodResetAt: timestamp('period_reset_at', { withTimezone: true }),
    /** Onboarding state */
    onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ═══════════════════════════════════════════════════════════════════════
 * User (Clerk-synced, belongs to organization)
 * ═══════════════════════════════════════════════════════════════════════ */

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    firstName: varchar('first_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    imageUrl: text('image_url'),
    role: teamRoleEnum('role').default('viewer').notNull(),
    lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('users_org_idx').on(t.organizationId),
    index('users_email_idx').on(t.email),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * End-User Accounts (the B2B *customer's* customers/companies)
 * These are the tracked accounts from SaaS products using our SDK
 * ═══════════════════════════════════════════════════════════════════════ */

export const trackedAccounts = pgTable('tracked_accounts', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    /** External ID from the customer's system */
    externalId: varchar('external_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    domain: varchar('domain', { length: 255 }),
    industry: varchar('industry', { length: 255 }),
    plan: varchar('plan', { length: 100 }),
    mrr: integer('mrr').default(0).notNull(),
    arr: integer('arr').default(0).notNull(),
    userCount: integer('user_count').default(0).notNull(),
    seatLimit: integer('seat_limit').default(0),
    health: accountHealthEnum('health').default('Good').notNull(),
    churnRiskScore: real('churn_risk_score').default(0).notNull(),
    expansionScore: real('expansion_score').default(0).notNull(),
    lifecycleDistribution: jsonb('lifecycle_distribution').$type<Record<string, number>>(),
    primaryContact: varchar('primary_contact', { length: 255 }),
    primaryContactEmail: varchar('primary_contact_email', { length: 320 }),
    contractRenewalDate: timestamp('contract_renewal_date', { withTimezone: true }),
    signupDate: timestamp('signup_date', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    tags: jsonb('tags').$type<string[]>().default([]),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex('tracked_accounts_org_ext_idx').on(t.organizationId, t.externalId),
    index('tracked_accounts_org_idx').on(t.organizationId),
    index('tracked_accounts_health_idx').on(t.organizationId, t.health),
    index('tracked_accounts_churn_idx').on(t.organizationId, t.churnRiskScore),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Users (end-users within tracked accounts)
 * ═══════════════════════════════════════════════════════════════════════ */

export const trackedUsers = pgTable('tracked_users', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => trackedAccounts.id, { onDelete: 'set null' }),
    /** External ID from the customer's system */
    externalId: varchar('external_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }),
    name: varchar('name', { length: 500 }),
    lifecycleState: lifecycleStateEnum('lifecycle_state').default('Lead').notNull(),
    previousState: lifecycleStateEnum('previous_state'),
    stateChangedAt: timestamp('state_changed_at', { withTimezone: true }),
    mrr: integer('mrr').default(0).notNull(),
    plan: varchar('plan', { length: 100 }),
    signupDate: timestamp('signup_date', { withTimezone: true }),
    activatedDate: timestamp('activated_date', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    loginFrequency7d: integer('login_frequency_7d').default(0).notNull(),
    loginFrequency30d: integer('login_frequency_30d').default(0).notNull(),
    featureUsage30d: jsonb('feature_usage_30d').$type<string[]>().default([]),
    sessionDepthMinutes: real('session_depth_minutes').default(0).notNull(),
    churnRiskScore: real('churn_risk_score').default(0).notNull(),
    expansionScore: real('expansion_score').default(0).notNull(),
    npsScore: integer('nps_score'),
    seatCount: integer('seat_count').default(1),
    seatLimit: integer('seat_limit'),
    apiCalls30d: integer('api_calls_30d').default(0),
    apiLimit: integer('api_limit'),
    supportTickets30d: integer('support_tickets_30d').default(0),
    supportEscalations: integer('support_escalations').default(0),
    daysUntilRenewal: integer('days_until_renewal'),
    tags: jsonb('tags').$type<string[]>().default([]),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    uniqueIndex('tracked_users_org_ext_idx').on(t.organizationId, t.externalId),
    index('tracked_users_org_idx').on(t.organizationId),
    index('tracked_users_account_idx').on(t.accountId),
    index('tracked_users_lifecycle_idx').on(t.organizationId, t.lifecycleState),
    index('tracked_users_churn_idx').on(t.organizationId, t.churnRiskScore),
    index('tracked_users_email_idx').on(t.organizationId, t.email),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Events (behavioral data from SDK)
 * ═══════════════════════════════════════════════════════════════════════ */

export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    trackedUserId: uuid('tracked_user_id').references(() => trackedUsers.id, { onDelete: 'set null' }),
    accountId: uuid('account_id').references(() => trackedAccounts.id, { onDelete: 'set null' }),
    /** External user ID for events that arrive before user is created */
    externalUserId: varchar('external_user_id', { length: 255 }),
    /** Event name  e.g. "page_viewed", "feature_used", "plan_changed" */
    name: varchar('name', { length: 255 }).notNull(),
    /** Arbitrary event properties */
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    /** Idempotency key to prevent duplicate processing */
    messageId: varchar('message_id', { length: 255 }),
    /** ISO timestamp from the client SDK */
    clientTimestamp: timestamp('client_timestamp', { withTimezone: true }),
    /** Server receive time */
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    /** Processing state */
    processed: boolean('processed').default(false).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
}, (t) => [
    index('events_org_idx').on(t.organizationId),
    index('events_user_idx').on(t.trackedUserId),
    index('events_name_idx').on(t.organizationId, t.name),
    index('events_received_idx').on(t.organizationId, t.receivedAt),
    uniqueIndex('events_message_id_idx').on(t.organizationId, t.messageId),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * API Keys (for SDK authentication)
 * ═══════════════════════════════════════════════════════════════════════ */

export const apiKeys = pgTable('api_keys', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    /** SHA-256 hash of the actual key (never store plaintext) */
    keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
    /** First 8 chars for display: "lcos_live_a1b2..." → "lcos_liv" */
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
    environment: varchar('environment', { length: 20 }).default('test').notNull(),
    scopes: jsonb('scopes').$type<string[]>().default(['identify', 'track', 'group', 'read']).notNull(),
    /** Rate limit tier override */
    rateLimitTier: varchar('rate_limit_tier', { length: 50 }).default('standard'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revoked: boolean('revoked').default(false).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('api_keys_org_idx').on(t.organizationId),
    index('api_keys_hash_idx').on(t.keyHash),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Definitions (visual automation builder)
 * ═══════════════════════════════════════════════════════════════════════ */

export const flowDefinitions = pgTable('flow_definitions', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description').default(''),
    status: flowStatusEnum('status').default('draft').notNull(),
    version: integer('version').default(1).notNull(),
    /** The full node/edge graph stored as JSONB */
    nodes: jsonb('nodes').$type<unknown[]>().default([]).notNull(),
    edges: jsonb('edges').$type<unknown[]>().default([]).notNull(),
    variables: jsonb('variables').$type<unknown[]>().default([]),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
    metrics: jsonb('metrics').$type<Record<string, number>>().default({
        totalEnrolled: 0, currentlyActive: 0, completed: 0,
        goalReached: 0, exitedEarly: 0, errorCount: 0,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
    index('flows_org_idx').on(t.organizationId),
    index('flows_status_idx').on(t.organizationId, t.status),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Enrollments (per-user execution state)
 * ═══════════════════════════════════════════════════════════════════════ */

export const flowEnrollments = pgTable('flow_enrollments', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    flowId: uuid('flow_id').notNull().references(() => flowDefinitions.id, { onDelete: 'cascade' }),
    trackedUserId: uuid('tracked_user_id').notNull().references(() => trackedUsers.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => trackedAccounts.id),
    flowVersion: integer('flow_version').notNull(),
    status: enrollmentStatusEnum('status').default('active').notNull(),
    currentNodeId: varchar('current_node_id', { length: 255 }),
    variables: jsonb('variables').$type<Record<string, unknown>>().default({}),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    lastProcessedAt: timestamp('last_processed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    nextProcessAt: timestamp('next_process_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    errorNodeId: varchar('error_node_id', { length: 255 }),
    history: jsonb('history').$type<unknown[]>().default([]),
}, (t) => [
    index('enrollments_org_idx').on(t.organizationId),
    index('enrollments_flow_idx').on(t.flowId),
    index('enrollments_user_idx').on(t.trackedUserId),
    index('enrollments_status_idx').on(t.flowId, t.status),
    index('enrollments_next_process_idx').on(t.status, t.nextProcessAt),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Webhooks (outbound notifications)
 * ═══════════════════════════════════════════════════════════════════════ */

export const webhooks = pgTable('webhooks', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    events: jsonb('events').$type<string[]>().default([]).notNull(),
    status: webhookStatusEnum('status').default('active').notNull(),
    secretHash: varchar('secret_hash', { length: 64 }).notNull(),
    secretPrefix: varchar('secret_prefix', { length: 12 }).notNull(),
    successRate: real('success_rate').default(100).notNull(),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    failCount: integer('fail_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('webhooks_org_idx').on(t.organizationId),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Webhook Delivery Log (audit trail)
 * ═══════════════════════════════════════════════════════════════════════ */

export const webhookDeliveries = pgTable('webhook_deliveries', {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 255 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    success: boolean('success').default(false).notNull(),
    attemptCount: integer('attempt_count').default(1).notNull(),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('deliveries_webhook_idx').on(t.webhookId),
    index('deliveries_retry_idx').on(t.success, t.nextRetryAt),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Expansion Opportunities
 * ═══════════════════════════════════════════════════════════════════════ */

export const expansionOpportunities = pgTable('expansion_opportunities', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').notNull().references(() => trackedAccounts.id, { onDelete: 'cascade' }),
    signal: expansionSignalEnum('signal').notNull(),
    signalDescription: text('signal_description'),
    currentPlan: varchar('current_plan', { length: 100 }),
    suggestedPlan: varchar('suggested_plan', { length: 100 }),
    currentMrr: integer('current_mrr').default(0).notNull(),
    potentialMrr: integer('potential_mrr').default(0).notNull(),
    upliftMrr: integer('uplift_mrr').default(0).notNull(),
    confidence: real('confidence').default(0).notNull(),
    status: expansionStatusEnum('status').default('identified').notNull(),
    identifiedAt: timestamp('identified_at', { withTimezone: true }).defaultNow().notNull(),
    lastActionAt: timestamp('last_action_at', { withTimezone: true }),
}, (t) => [
    index('expansion_org_idx').on(t.organizationId),
    index('expansion_account_idx').on(t.accountId),
    index('expansion_status_idx').on(t.organizationId, t.status),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Activity Log (system-wide audit trail)
 * ═══════════════════════════════════════════════════════════════════════ */

export const activityLog = pgTable('activity_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    trackedUserId: uuid('tracked_user_id').references(() => trackedUsers.id, { onDelete: 'set null' }),
    accountId: uuid('account_id').references(() => trackedAccounts.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('activity_org_idx').on(t.organizationId),
    index('activity_type_idx').on(t.organizationId, t.type),
    index('activity_time_idx').on(t.organizationId, t.createdAt),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Revenue Records (MRR movements over time)
 * ═══════════════════════════════════════════════════════════════════════ */

export const revenueRecords = pgTable('revenue_records', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => trackedAccounts.id, { onDelete: 'set null' }),
    month: varchar('month', { length: 7 }).notNull(), // "2026-02"
    movementType: varchar('movement_type', { length: 50 }).notNull(), // new, expansion, contraction, churn, reactivation
    amount: integer('amount').notNull(), // in cents
    previousMrr: integer('previous_mrr').default(0),
    newMrr: integer('new_mrr').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('revenue_org_idx').on(t.organizationId),
    index('revenue_month_idx').on(t.organizationId, t.month),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Email Deliverability Metrics
 * ═══════════════════════════════════════════════════════════════════════ */

export const deliverabilityMetrics = pgTable('deliverability_metrics', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // "2026-02-24"
    sent: integer('sent').default(0).notNull(),
    delivered: integer('delivered').default(0).notNull(),
    opened: integer('opened').default(0).notNull(),
    clicked: integer('clicked').default(0).notNull(),
    bounced: integer('bounced').default(0).notNull(),
    spam: integer('spam').default(0).notNull(),
    unsubscribed: integer('unsubscribed').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('deliverability_org_idx').on(t.organizationId),
    uniqueIndex('deliverability_org_date_idx').on(t.organizationId, t.date),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Sending Domains — Email Authentication & DNS Verification
 * ═══════════════════════════════════════════════════════════════════════ */

export const sendingDomains = pgTable('sending_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    domain: varchar('domain', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    dkimVerified: boolean('dkim_verified').default(false).notNull(),
    spfVerified: boolean('spf_verified').default(false).notNull(),
    dmarcVerified: boolean('dmarc_verified').default(false).notNull(),
    mxVerified: boolean('mx_verified').default(false).notNull(),
    /** DKIM selector used for this domain */
    dkimSelector: varchar('dkim_selector', { length: 100 }).default('lifecycleos'),
    /** Overall authentication score 0-100 */
    authScore: integer('auth_score').default(0).notNull(),
    /** Last full verification result as JSON */
    verificationDetails: jsonb('verification_details').$type<Record<string, unknown>>(),
    /** DNS records the user needs to add (generated by the platform) */
    requiredRecords: jsonb('required_records').$type<Array<{ type: string; host: string; value: string; purpose: string }>>(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
}, (t) => [
    index('domains_org_idx').on(t.organizationId),
    uniqueIndex('domains_org_domain_idx').on(t.organizationId, t.domain),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Segments (real-time audience segmentation)
 * ═══════════════════════════════════════════════════════════════════════ */

export const segmentStatusEnum = pgEnum('segment_status', [
    'active', 'draft', 'archived',
]);

export const segmentTypeEnum = pgEnum('segment_type', [
    'dynamic', 'static', 'computed',
]);

export const segments = pgTable('segments', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description').default(''),
    status: segmentStatusEnum('status').default('draft').notNull(),
    type: segmentTypeEnum('type').default('dynamic').notNull(),
    /** Rule logic: AND/OR at top level */
    filterLogic: varchar('filter_logic', { length: 3 }).default('AND').notNull(),
    /**
     * Array of filter rules. Each rule:
     * { field, operator, value, values, fieldSource }
     * fieldSource: 'user' | 'account' | 'event' | 'computed'
     * field: the actual property path, e.g. "lifecycleState", "properties.industry"
     */
    filters: jsonb('filters').$type<SegmentFilter[]>().default([]).notNull(),
    /** Cached count of users matching this segment (updated on evaluation) */
    matchedUserCount: integer('matched_user_count').default(0).notNull(),
    /** When the segment was last evaluated */
    lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
    /** For static segments: array of tracked user IDs */
    staticUserIds: jsonb('static_user_ids').$type<string[]>().default([]),
    /** Tags for organization */
    tags: jsonb('tags').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('segments_org_idx').on(t.organizationId),
    index('segments_status_idx').on(t.organizationId, t.status),
    uniqueIndex('segments_org_name_idx').on(t.organizationId, t.name),
]);

/** Type for segment filter rules (used in JSONB column) */
export type SegmentFilter = {
    field: string;
    fieldSource: 'user' | 'account' | 'event' | 'computed';
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
    | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
    | 'is_set' | 'is_not_set' | 'in_list' | 'not_in_list' | 'between';
    value?: string | number | boolean;
    values?: (string | number)[];
};

/* ═══════════════════════════════════════════════════════════════════════
 * Segment Memberships (user-segment mapping, cached)
 * ═══════════════════════════════════════════════════════════════════════ */

export const segmentMemberships = pgTable('segment_memberships', {
    id: uuid('id').primaryKey().defaultRandom(),
    segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
    trackedUserId: uuid('tracked_user_id').notNull().references(() => trackedUsers.id, { onDelete: 'cascade' }),
    enteredAt: timestamp('entered_at', { withTimezone: true }).defaultNow().notNull(),
    exitedAt: timestamp('exited_at', { withTimezone: true }),
}, (t) => [
    uniqueIndex('seg_member_unique_idx').on(t.segmentId, t.trackedUserId),
    index('seg_member_segment_idx').on(t.segmentId),
    index('seg_member_user_idx').on(t.trackedUserId),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Email Templates (reusable, with personalization variables)
 * ═══════════════════════════════════════════════════════════════════════ */

export const emailTemplateStatusEnum = pgEnum('email_template_status', [
    'draft', 'active', 'archived',
]);

export const emailTemplates = pgTable('email_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description').default(''),
    status: emailTemplateStatusEnum('status').default('draft').notNull(),
    /** Subject line — supports {{variable}} personalization */
    subject: text('subject').notNull().default(''),
    /** Preview text */
    previewText: text('preview_text').default(''),
    /** HTML body — supports {{variable}} personalization + conditional blocks */
    bodyHtml: text('body_html').notNull().default(''),
    /** Plain text fallback */
    bodyText: text('body_text').default(''),
    /** From name */
    fromName: varchar('from_name', { length: 255 }).default(''),
    /** From email */
    fromEmail: varchar('from_email', { length: 320 }).default(''),
    /** Reply-to email */
    replyTo: varchar('reply_to', { length: 320 }).default(''),
    /** Available personalization variables used in this template */
    variables: jsonb('variables').$type<EmailTemplateVariable[]>().default([]),
    /** Conditional content blocks */
    conditionalBlocks: jsonb('conditional_blocks').$type<ConditionalBlock[]>().default([]),
    /** Category tag */
    category: varchar('category', { length: 100 }).default('general'),
    /** Metrics */
    sendCount: integer('send_count').default(0).notNull(),
    openCount: integer('open_count').default(0).notNull(),
    clickCount: integer('click_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('email_templates_org_idx').on(t.organizationId),
    index('email_templates_status_idx').on(t.organizationId, t.status),
]);

/** Variable definition for email templates */
export type EmailTemplateVariable = {
    key: string;               // e.g. "user.name", "account.plan"
    label: string;             // "User Name"
    source: 'user' | 'account' | 'event' | 'custom';
    fallback: string;          // default if value not available
};

/** Conditional content block — show/hide content based on rules */
export type ConditionalBlock = {
    id: string;
    name: string;
    htmlContent: string;
    rules: SegmentFilter[];
    ruleLogic: 'AND' | 'OR';
};

/* ═══════════════════════════════════════════════════════════════════════
 * Email Campaigns (send emails to segments)
 * ═══════════════════════════════════════════════════════════════════════ */

export const emailCampaignStatusEnum = pgEnum('email_campaign_status', [
    'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled',
]);

export const emailCampaignTypeEnum = pgEnum('email_campaign_type', [
    'one_time', 'triggered', 'recurring',
]);

export const emailCampaigns = pgTable('email_campaigns', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description').default(''),
    status: emailCampaignStatusEnum('status').default('draft').notNull(),
    type: emailCampaignTypeEnum('type').default('one_time').notNull(),
    /** Which template to use */
    templateId: uuid('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
    /** Which segment to target */
    segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
    /** Trigger config for triggered campaigns */
    triggerEvent: varchar('trigger_event', { length: 255 }),
    triggerFilters: jsonb('trigger_filters').$type<SegmentFilter[]>().default([]),
    /** Schedule config */
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    /** Recurring cron expression */
    cronExpression: varchar('cron_expression', { length: 100 }),
    cronTimezone: varchar('cron_timezone', { length: 100 }).default('UTC'),
    /** Sending config */
    fromName: varchar('from_name', { length: 255 }),
    fromEmail: varchar('from_email', { length: 320 }),
    replyTo: varchar('reply_to', { length: 320 }),
    subjectOverride: text('subject_override'),
    /** Metrics (aggregated from sends) */
    totalSent: integer('total_sent').default(0).notNull(),
    totalDelivered: integer('total_delivered').default(0).notNull(),
    totalOpened: integer('total_opened').default(0).notNull(),
    totalClicked: integer('total_clicked').default(0).notNull(),
    totalBounced: integer('total_bounced').default(0).notNull(),
    totalUnsubscribed: integer('total_unsubscribed').default(0).notNull(),
    totalRevenue: integer('total_revenue').default(0).notNull(),
    /** Timestamps */
    sentAt: timestamp('sent_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('email_campaigns_org_idx').on(t.organizationId),
    index('email_campaigns_status_idx').on(t.organizationId, t.status),
    index('email_campaigns_segment_idx').on(t.segmentId),
    index('email_campaigns_template_idx').on(t.templateId),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Email Sends (individual email deliveries to users)
 * ═══════════════════════════════════════════════════════════════════════ */

export const emailSendStatusEnum = pgEnum('email_send_status', [
    'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed',
]);

export const emailSends = pgTable('email_sends', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => emailCampaigns.id, { onDelete: 'set null' }),
    templateId: uuid('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
    trackedUserId: uuid('tracked_user_id').notNull().references(() => trackedUsers.id, { onDelete: 'cascade' }),
    /** Snapshot of the resolved subject and body for this send */
    resolvedSubject: text('resolved_subject'),
    resolvedBodyHtml: text('resolved_body_html'),
    /** Variables resolved at send time */
    resolvedVariables: jsonb('resolved_variables').$type<Record<string, string>>().default({}),
    /** Delivery status */
    status: emailSendStatusEnum('status').default('queued').notNull(),
    /** Email provider message ID */
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    /** Delivery details */
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    /** How many times the user opened */
    openCount: integer('open_count').default(0).notNull(),
    clickCount: integer('click_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('email_sends_org_idx').on(t.organizationId),
    index('email_sends_campaign_idx').on(t.campaignId),
    index('email_sends_user_idx').on(t.trackedUserId),
    index('email_sends_status_idx').on(t.organizationId, t.status),
    index('email_sends_sent_at_idx').on(t.organizationId, t.sentAt),
]);

/* ═══════════════════════════════════════════════════════════════════════
 * Personalization Rules (dynamic content rules for UI/email)
 * ═══════════════════════════════════════════════════════════════════════ */

export const personalizationRuleStatusEnum = pgEnum('personalization_rule_status', [
    'active', 'draft', 'archived',
]);

export const personalizationRules = pgTable('personalization_rules', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description').default(''),
    status: personalizationRuleStatusEnum('status').default('draft').notNull(),
    /** Priority — higher number = evaluated first */
    priority: integer('priority').default(0).notNull(),
    /**
     * Channel: where does this personalization apply?
     * 'email' | 'in_app' | 'webhook' | 'all'
     */
    channel: varchar('channel', { length: 50 }).default('all').notNull(),
    /** Segment filter — which users does this rule apply to? */
    segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
    /** Inline filters (alternative to segment) */
    filters: jsonb('filters').$type<SegmentFilter[]>().default([]),
    filterLogic: varchar('filter_logic', { length: 3 }).default('AND').notNull(),
    /**
     * Content variants: what to inject/replace/show
     * Each variant has a key (slot name), content (HTML/text), and metadata
     */
    variants: jsonb('variants').$type<PersonalizationVariant[]>().default([]).notNull(),
    /**
     * Variable mappings: map user/account/event properties to template variables
     * { variableKey, source, sourceField, fallback, transform }
     */
    variableMappings: jsonb('variable_mappings').$type<VariableMapping[]>().default([]),
    /** Metrics */
    impressionCount: integer('impression_count').default(0).notNull(),
    conversionCount: integer('conversion_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('personalization_org_idx').on(t.organizationId),
    index('personalization_status_idx').on(t.organizationId, t.status),
    index('personalization_segment_idx').on(t.segmentId),
    index('personalization_priority_idx').on(t.organizationId, t.priority),
]);

/** A personalization content variant */
export type PersonalizationVariant = {
    id: string;
    slotKey: string;       // e.g. "hero_heading", "cta_text", "email_greeting"
    content: string;       // the personalized content (supports {{variables}})
    contentType: 'text' | 'html' | 'json';
    metadata?: Record<string, unknown>;
};

/** Maps a template variable to a real-time data source */
export type VariableMapping = {
    variableKey: string;           // the {{variable}} key
    source: 'user' | 'account' | 'event' | 'custom';
    sourceField: string;           // property path, e.g. "name", "properties.company_size"
    fallback: string;              // default if not available
    transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'truncate' | 'number_format';
    transformParam?: string;       // e.g. truncate length
};

/* ═══════════════════════════════════════════════════════════════════════
 * Relations (for Drizzle relational queries)
 * ═══════════════════════════════════════════════════════════════════════ */

export const organizationsRelations = relations(organizations, ({ many }) => ({
    users: many(users),
    trackedAccounts: many(trackedAccounts),
    trackedUsers: many(trackedUsers),
    events: many(events),
    apiKeys: many(apiKeys),
    flowDefinitions: many(flowDefinitions),
    webhooks: many(webhooks),
    expansionOpportunities: many(expansionOpportunities),
    activityLog: many(activityLog),
    revenueRecords: many(revenueRecords),
    segments: many(segments),
    emailTemplates: many(emailTemplates),
    emailCampaigns: many(emailCampaigns),
    personalizationRules: many(personalizationRules),
    integrations: many(integrations),
}));

export const usersRelations = relations(users, ({ one }) => ({
    organization: one(organizations, {
        fields: [users.organizationId],
        references: [organizations.id],
    }),
}));

export const trackedAccountsRelations = relations(trackedAccounts, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [trackedAccounts.organizationId],
        references: [organizations.id],
    }),
    trackedUsers: many(trackedUsers),
    events: many(events),
    enrollments: many(flowEnrollments),
    expansionOpportunities: many(expansionOpportunities),
}));

export const trackedUsersRelations = relations(trackedUsers, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [trackedUsers.organizationId],
        references: [organizations.id],
    }),
    account: one(trackedAccounts, {
        fields: [trackedUsers.accountId],
        references: [trackedAccounts.id],
    }),
    events: many(events),
    enrollments: many(flowEnrollments),
}));

export const eventsRelations = relations(events, ({ one }) => ({
    organization: one(organizations, {
        fields: [events.organizationId],
        references: [organizations.id],
    }),
    trackedUser: one(trackedUsers, {
        fields: [events.trackedUserId],
        references: [trackedUsers.id],
    }),
    account: one(trackedAccounts, {
        fields: [events.accountId],
        references: [trackedAccounts.id],
    }),
}));

export const flowDefinitionsRelations = relations(flowDefinitions, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [flowDefinitions.organizationId],
        references: [organizations.id],
    }),
    enrollments: many(flowEnrollments),
}));

export const flowEnrollmentsRelations = relations(flowEnrollments, ({ one }) => ({
    organization: one(organizations, {
        fields: [flowEnrollments.organizationId],
        references: [organizations.id],
    }),
    flow: one(flowDefinitions, {
        fields: [flowEnrollments.flowId],
        references: [flowDefinitions.id],
    }),
    trackedUser: one(trackedUsers, {
        fields: [flowEnrollments.trackedUserId],
        references: [trackedUsers.id],
    }),
    account: one(trackedAccounts, {
        fields: [flowEnrollments.accountId],
        references: [trackedAccounts.id],
    }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [webhooks.organizationId],
        references: [organizations.id],
    }),
    deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
    webhook: one(webhooks, {
        fields: [webhookDeliveries.webhookId],
        references: [webhooks.id],
    }),
}));

export const expansionOpportunitiesRelations = relations(expansionOpportunities, ({ one }) => ({
    organization: one(organizations, {
        fields: [expansionOpportunities.organizationId],
        references: [organizations.id],
    }),
    account: one(trackedAccounts, {
        fields: [expansionOpportunities.accountId],
        references: [trackedAccounts.id],
    }),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [segments.organizationId],
        references: [organizations.id],
    }),
    memberships: many(segmentMemberships),
    emailCampaigns: many(emailCampaigns),
    personalizationRules: many(personalizationRules),
}));

export const segmentMembershipsRelations = relations(segmentMemberships, ({ one }) => ({
    segment: one(segments, {
        fields: [segmentMemberships.segmentId],
        references: [segments.id],
    }),
    trackedUser: one(trackedUsers, {
        fields: [segmentMemberships.trackedUserId],
        references: [trackedUsers.id],
    }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [emailTemplates.organizationId],
        references: [organizations.id],
    }),
    campaigns: many(emailCampaigns),
    sends: many(emailSends),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [emailCampaigns.organizationId],
        references: [organizations.id],
    }),
    template: one(emailTemplates, {
        fields: [emailCampaigns.templateId],
        references: [emailTemplates.id],
    }),
    segment: one(segments, {
        fields: [emailCampaigns.segmentId],
        references: [segments.id],
    }),
    sends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one }) => ({
    organization: one(organizations, {
        fields: [emailSends.organizationId],
        references: [organizations.id],
    }),
    campaign: one(emailCampaigns, {
        fields: [emailSends.campaignId],
        references: [emailCampaigns.id],
    }),
    template: one(emailTemplates, {
        fields: [emailSends.templateId],
        references: [emailTemplates.id],
    }),
    trackedUser: one(trackedUsers, {
        fields: [emailSends.trackedUserId],
        references: [trackedUsers.id],
    }),
}));

export const personalizationRulesRelations = relations(personalizationRules, ({ one }) => ({
    organization: one(organizations, {
        fields: [personalizationRules.organizationId],
        references: [organizations.id],
    }),
    segment: one(segments, {
        fields: [personalizationRules.segmentId],
        references: [segments.id],
    }),
}));

/* ═══════════════════════════════════════════════════════════════════════
 * Integrations (SaaS product connections)
 *
 * Tracks whether the org has properly connected/configured their SaaS
 * product — SDK installed, events flowing, API keys set up, etc.
 * Flow builder nodes that require live SaaS data will check this.
 * ═══════════════════════════════════════════════════════════════════════ */

export const integrationStatusEnum = pgEnum('integration_status', [
    'connected', 'pending', 'disconnected', 'error',
]);

export const integrationCategoryEnum = pgEnum('integration_category', [
    'sdk', 'email', 'crm', 'analytics', 'payment', 'support', 'custom_webhook',
]);

export const integrations = pgTable('integrations', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    /** Human-readable name e.g. "Production SDK", "Stripe", "HubSpot" */
    name: varchar('name', { length: 255 }).notNull(),
    /** Category of integration */
    category: integrationCategoryEnum('category').notNull(),
    /** Connection status */
    status: integrationStatusEnum('status').default('pending').notNull(),
    /** The provider/service key e.g. "lifecycleos_sdk", "stripe", "hubspot" */
    provider: varchar('provider', { length: 100 }).notNull(),
    /** Config blob (API keys, endpoints, scopes, etc.) — encrypted at rest */
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    /** Capabilities this integration provides */
    capabilities: jsonb('capabilities').$type<string[]>().default([]).notNull(),
    /** Last time we verified the connection is live */
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
    /** Last error message from a failed health check */
    lastError: text('last_error'),
    /** When data was last received from this integration */
    lastDataReceivedAt: timestamp('last_data_received_at', { withTimezone: true }),
    /** Number of events/records received in the last 24h */
    eventsLast24h: integer('events_last_24h').default(0).notNull(),
    /** Whether this is the primary SDK integration */
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index('integrations_org_idx').on(t.organizationId),
    index('integrations_org_status_idx').on(t.organizationId, t.status),
    uniqueIndex('integrations_org_provider_idx').on(t.organizationId, t.provider),
]);

export const integrationsRelations = relations(integrations, ({ one }) => ({
    organization: one(organizations, {
        fields: [integrations.organizationId],
        references: [organizations.id],
    }),
}));

/**
 * Defines which flow node types/actions require which integration capabilities.
 * Used by the flow builder to show warnings when a required integration is missing.
 */
export const INTEGRATION_CAPABILITY_MAP: Record<string, { capability: string; category: string; description: string }> = {
    /* Trigger requirements */
    'trigger:lifecycle_change': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to track lifecycle state changes' },
    'trigger:event_received': { capability: 'event_tracking', category: 'sdk', description: 'SDK must be installed to receive product events' },
    'trigger:segment_entry': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to evaluate segment membership' },
    'trigger:webhook_received': { capability: 'inbound_webhook', category: 'custom_webhook', description: 'An inbound webhook endpoint must be configured' },

    /* Action requirements */
    'action:send_email': { capability: 'email_send', category: 'email', description: 'Email provider must be configured to send emails' },
    'action:send_webhook': { capability: 'outbound_webhook', category: 'custom_webhook', description: 'Webhook URL must be configured' },
    'action:update_user': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to update user properties' },
    'action:add_tag': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to manage user tags' },
    'action:remove_tag': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to manage user tags' },
    'action:api_call': { capability: 'outbound_api', category: 'custom_webhook', description: 'External API endpoint must be configured' },
    'action:send_notification': { capability: 'push_notification', category: 'sdk', description: 'SDK with push notification support must be configured' },

    /* Condition requirements */
    'condition:user_property': { capability: 'user_tracking', category: 'sdk', description: 'SDK must be installed to read user properties' },
    'condition:event_count': { capability: 'event_tracking', category: 'sdk', description: 'SDK must be installed to count user events' },
    'condition:account_property': { capability: 'account_tracking', category: 'sdk', description: 'SDK must be installed with account (group) tracking' },
};
