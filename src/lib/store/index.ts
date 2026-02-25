/* ==========================================================================
 * In-Memory Data Store — Production-Grade Interface Layer
 *
 * Provides a thread-safe (single-process), typed data store that backs all
 * API routes.  Every store method is async so the interface is drop-in
 * replaceable with PostgreSQL / ClickHouse / Redis without changing any
 * call-sites.
 *
 * On server start the store is seeded with placeholder data so the
 * dashboard works immediately.  SDK ingest endpoints mutate state in
 * real-time — the effects are visible across the entire app.
 * ========================================================================== */

import type {
  User,
  Account,
  EmailFlow,
  RevenueData,
  ActivationData,
  ActivationMilestone,
  RetentionCohort,
  DeliverabilityData,
  SendingDomain,
  IPWarmingStatus,
  ExpansionOpportunity,
  RevenueWaterfall,
  ActivityEntry,
  TeamMember,
  WebhookConfig,
  FlowDefinition,
  FlowEnrollment,
  FlowBuilderStatus,
} from '@/lib/definitions';
import type { StoredEvent, ApiKeyRecord } from '@/lib/sdk/types';

/* ── Secure Random Helpers ───────────────────────────────────────────── */

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function secureRandomString(length: number): string {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CHARSET[v % CHARSET.length]).join('');
}

/* ── Limits ──────────────────────────────────────────────────────────── */

const MAX_EVENTS = 50_000; // Cap to prevent unbounded memory growth
const MAX_ACTIVITY = 2_000;

import {
  users as seedUsers,
  accounts as seedAccounts,
  emailFlows as seedFlows,
  revenueData as seedRevenue,
  revenueWaterfall as seedWaterfall,
  activationData as seedActivation,
  activationMilestones as seedMilestones,
  retentionCohorts as seedCohorts,
  deliverabilityData as seedDeliverability,
  sendingDomains as seedDomains,
  ipWarmingStatus as seedIPWarming,
  expansionOpportunities as seedExpansion,
  activityFeed as seedActivity,
  teamMembers as seedTeam,
  webhooks as seedWebhooks,
} from '@/lib/placeholder-data';
import { seedFlowDefinitions } from '@/lib/seed-flows';

/* ── ID Generator ───────────────────────────────────────────────────── */

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/* ── Store Class ────────────────────────────────────────────────────── */

class DataStore {
  /* ── Collections ─────────────────────────────────────────────────── */
  private users: Map<string, User> = new Map();
  private accounts: Map<string, Account> = new Map();
  private emailFlows: Map<string, EmailFlow> = new Map();
  private events: StoredEvent[] = [];
  private eventMessageIds: Set<string> = new Set(); // Deduplication index
  private revenueData: RevenueData[] = [];
  private revenueWaterfall: RevenueWaterfall[] = [];
  private activationData: ActivationData[] = [];
  private activationMilestones: ActivationMilestone[] = [];
  private retentionCohorts: RetentionCohort[] = [];
  private deliverabilityData: DeliverabilityData[] = [];
  private sendingDomains: Map<string, SendingDomain> = new Map();
  private ipWarmingStatus: IPWarmingStatus[] = [];
  private expansionOpportunities: Map<string, ExpansionOpportunity> = new Map();
  private activityFeed: ActivityEntry[] = [];
  private teamMembers: Map<string, TeamMember> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private apiKeys: Map<string, ApiKeyRecord> = new Map();
  private flowDefinitions: Map<string, FlowDefinition> = new Map();
  private flowEnrollments: Map<string, FlowEnrollment> = new Map();

  constructor() {
    this.seed();
  }

  /* ── Seed ──────────────────────────────────────────────────────── */

  private seed(): void {
    seedUsers.forEach((u) => this.users.set(u.id, { ...u }));
    seedAccounts.forEach((a) => this.accounts.set(a.id, { ...a }));
    seedFlows.forEach((f) => this.emailFlows.set(f.id, { ...f }));
    this.revenueData = [...seedRevenue];
    this.revenueWaterfall = [...seedWaterfall];
    this.activationData = [...seedActivation];
    this.activationMilestones = [...seedMilestones];
    this.retentionCohorts = [...seedCohorts];
    this.deliverabilityData = [...seedDeliverability];
    seedDomains.forEach((d) => this.sendingDomains.set(d.id, { ...d }));
    this.ipWarmingStatus = [...seedIPWarming];
    seedExpansion.forEach((e) => this.expansionOpportunities.set(e.id, { ...e }));
    this.activityFeed = [...seedActivity];
    seedTeam.forEach((t) => this.teamMembers.set(t.id, { ...t }));
    seedWebhooks.forEach((w) => this.webhooks.set(w.id, { ...w }));
    seedFlowDefinitions.forEach((fd) => this.flowDefinitions.set(fd.id, JSON.parse(JSON.stringify(fd))));

    // Seed default API keys
    const now = new Date().toISOString();
    this.apiKeys.set('lcos_live_a1b2c3d4e5f6g7h8i9j0', {
      id: 'key_1',
      key: 'lcos_live_a1b2c3d4e5f6g7h8i9j0',
      name: 'Production Key',
      environment: 'production',
      createdAt: '2025-06-01T00:00:00Z',
      lastUsedAt: now,
      scopes: ['identify', 'track', 'group', 'read', 'write'],
    });
    this.apiKeys.set('lcos_test_x9y8w7v6u5t4s3r2q1p0', {
      id: 'key_2',
      key: 'lcos_test_x9y8w7v6u5t4s3r2q1p0',
      name: 'Test / Development Key',
      environment: 'development',
      createdAt: '2025-06-01T00:00:00Z',
      lastUsedAt: now,
      scopes: ['identify', 'track', 'group', 'read', 'write'],
    });
  }

  /* ── API Keys ─────────────────────────────────────────────────── */

  async validateApiKey(key: string): Promise<ApiKeyRecord | null> {
    const record = this.apiKeys.get(key);
    if (!record || record.revokedAt) return null;
    return record;
  }

  /** Update last-used timestamp (called after successful auth) */
  async touchApiKey(keyId: string): Promise<void> {
    for (const record of this.apiKeys.values()) {
      if (record.id === keyId) {
        record.lastUsedAt = new Date().toISOString();
        break;
      }
    }
  }

  /** Get a single key record by ID */
  async getApiKeyById(keyId: string): Promise<ApiKeyRecord | undefined> {
    for (const record of this.apiKeys.values()) {
      if (record.id === keyId) return record;
    }
    return undefined;
  }

  async getApiKeys(): Promise<ApiKeyRecord[]> {
    return Array.from(this.apiKeys.values()).filter((k) => !k.revokedAt);
  }

  async createApiKey(name: string, environment: ApiKeyRecord['environment'], scopes?: string[]): Promise<ApiKeyRecord> {
    const prefixMap: Record<string, string> = { production: 'lcos_live_', staging: 'lcos_stg_', development: 'lcos_test_' };
    const prefix = prefixMap[environment] ?? 'lcos_test_';
    const key = prefix + secureRandomString(24);

    const record: ApiKeyRecord = {
      id: nextId('key'),
      key,
      name,
      environment,
      createdAt: new Date().toISOString(),
      scopes: scopes ?? ['identify', 'track', 'group', 'read', 'write'],
    };

    this.apiKeys.set(key, record);
    return record;
  }

  /** Generate a cryptographically secure webhook secret */
  generateWebhookSecret(): string {
    return 'whsec_' + secureRandomString(32);
  }

  async revokeApiKey(keyId: string): Promise<boolean> {
    for (const record of this.apiKeys.values()) {
      if (record.id === keyId) {
        record.revokedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  /* ── Users ────────────────────────────────────────────────────── */

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const u of this.users.values()) {
      if (u.email === email) return u;
    }
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async upsertUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  /* ── Accounts ─────────────────────────────────────────────────── */

  async getAccount(id: string): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async upsertAccount(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const existing = this.accounts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.accounts.set(id, updated);
    return updated;
  }

  async getAccountUsers(accountId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (u) => u.account.id === accountId,
    );
  }

  /* ── Events ───────────────────────────────────────────────────── */

  /** Ingest a single event with deduplication by messageId */
  async ingestEvent(event: StoredEvent): Promise<{ stored: boolean; event: StoredEvent }> {
    // Dedup check
    if (event.messageId && this.eventMessageIds.has(event.messageId)) {
      return { stored: false, event };
    }
    if (event.messageId) this.eventMessageIds.add(event.messageId);

    this.events.push(event);

    // Enforce cap: trim oldest events
    if (this.events.length > MAX_EVENTS) {
      const removed = this.events.splice(0, this.events.length - MAX_EVENTS);
      for (const r of removed) {
        if (r.messageId) this.eventMessageIds.delete(r.messageId);
      }
    }

    return { stored: true, event };
  }

  /** Ingest batch of events with deduplication. Returns count of actually stored events. */
  async ingestEvents(events: StoredEvent[]): Promise<{ ingested: number; duplicates: number }> {
    let ingested = 0;
    let duplicates = 0;

    for (const event of events) {
      if (event.messageId && this.eventMessageIds.has(event.messageId)) {
        duplicates++;
        continue;
      }
      if (event.messageId) this.eventMessageIds.add(event.messageId);
      this.events.push(event);
      ingested++;
    }

    // Enforce cap
    if (this.events.length > MAX_EVENTS) {
      const removed = this.events.splice(0, this.events.length - MAX_EVENTS);
      for (const r of removed) {
        if (r.messageId) this.eventMessageIds.delete(r.messageId);
      }
    }

    return { ingested, duplicates };
  }

  async getEvents(filters?: {
    userId?: string;
    accountId?: string;
    event?: string;
    after?: string;
    limit?: number;
  }): Promise<StoredEvent[]> {
    let result = [...this.events];

    if (filters?.userId) {
      result = result.filter((e) => e.userId === filters.userId);
    }
    if (filters?.accountId) {
      result = result.filter((e) => e.accountId === filters.accountId);
    }
    if (filters?.event) {
      result = result.filter((e) => e.event === filters.event);
    }
    if (filters?.after) {
      const afterDate = new Date(filters.after).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() > afterDate);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  async getEventCount(filters?: { userId?: string; event?: string }): Promise<number> {
    let count = this.events.length;
    if (filters?.userId) {
      count = this.events.filter((e) => e.userId === filters.userId).length;
    }
    if (filters?.event) {
      count = this.events.filter((e) => e.event === filters.event).length;
    }
    return count;
  }

  /* ── Email Flows ──────────────────────────────────────────────── */

  async getFlow(id: string): Promise<EmailFlow | undefined> {
    return this.emailFlows.get(id);
  }

  async getAllFlows(): Promise<EmailFlow[]> {
    return Array.from(this.emailFlows.values());
  }

  async upsertFlow(flow: EmailFlow): Promise<EmailFlow> {
    this.emailFlows.set(flow.id, flow);
    return flow;
  }

  /* ── Flow Definitions (Builder) ────────────────────────────────── */

  async getFlowDefinition(id: string): Promise<FlowDefinition | undefined> {
    return this.flowDefinitions.get(id);
  }

  async getAllFlowDefinitions(): Promise<FlowDefinition[]> {
    return Array.from(this.flowDefinitions.values());
  }

  async getFlowDefinitionsByStatus(status: FlowBuilderStatus): Promise<FlowDefinition[]> {
    return Array.from(this.flowDefinitions.values()).filter((f) => f.status === status);
  }

  async upsertFlowDefinition(flow: FlowDefinition): Promise<FlowDefinition> {
    flow.updatedAt = new Date().toISOString();
    this.flowDefinitions.set(flow.id, flow);
    return flow;
  }

  async deleteFlowDefinition(id: string): Promise<boolean> {
    // Also remove all enrollments for this flow
    for (const [eid, enrollment] of this.flowEnrollments.entries()) {
      if (enrollment.flowId === id) this.flowEnrollments.delete(eid);
    }
    return this.flowDefinitions.delete(id);
  }

  async duplicateFlowDefinition(id: string): Promise<FlowDefinition | undefined> {
    const original = this.flowDefinitions.get(id);
    if (!original) return undefined;
    const now = new Date().toISOString();
    const newId = nextId('flow');
    const copy: FlowDefinition = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name} (Copy)`,
      status: 'draft' as FlowBuilderStatus,
      version: 1,
      metrics: { totalEnrolled: 0, currentlyActive: 0, completed: 0, goalReached: 0, exitedEarly: 0, errorCount: 0, revenueGenerated: 0, openRate: 0, clickRate: 0 },
      createdAt: now,
      updatedAt: now,
      publishedAt: undefined,
      archivedAt: undefined,
    };
    this.flowDefinitions.set(newId, copy);
    return copy;
  }

  /* ── Flow Enrollments ──────────────────────────────────────────── */

  async getEnrollment(id: string): Promise<FlowEnrollment | undefined> {
    return this.flowEnrollments.get(id);
  }

  async getFlowEnrollments(flowId: string, status?: FlowEnrollment['status']): Promise<FlowEnrollment[]> {
    let results = Array.from(this.flowEnrollments.values()).filter((e) => e.flowId === flowId);
    if (status) results = results.filter((e) => e.status === status);
    return results;
  }

  async getUserEnrollments(userId: string): Promise<FlowEnrollment[]> {
    return Array.from(this.flowEnrollments.values()).filter((e) => e.userId === userId);
  }

  async upsertEnrollment(enrollment: FlowEnrollment): Promise<FlowEnrollment> {
    this.flowEnrollments.set(enrollment.id, enrollment);
    return enrollment;
  }

  async deleteEnrollment(id: string): Promise<boolean> {
    return this.flowEnrollments.delete(id);
  }

  async getActiveEnrollmentsDue(): Promise<FlowEnrollment[]> {
    const now = Date.now();
    return Array.from(this.flowEnrollments.values()).filter(
      (e) => e.status === 'active' && e.nextProcessAt && new Date(e.nextProcessAt).getTime() <= now,
    );
  }

  /* ── Revenue ──────────────────────────────────────────────────── */

  async getRevenueData(): Promise<RevenueData[]> {
    return [...this.revenueData];
  }

  async getRevenueWaterfall(): Promise<RevenueWaterfall[]> {
    return [...this.revenueWaterfall];
  }

  /* ── Activation ───────────────────────────────────────────────── */

  async getActivationData(): Promise<ActivationData[]> {
    return [...this.activationData];
  }

  async getActivationMilestones(): Promise<ActivationMilestone[]> {
    return [...this.activationMilestones];
  }

  /* ── Retention ────────────────────────────────────────────────── */

  async getRetentionCohorts(): Promise<RetentionCohort[]> {
    return [...this.retentionCohorts];
  }

  /* ── Deliverability ───────────────────────────────────────────── */

  async getDeliverabilityData(): Promise<DeliverabilityData[]> {
    return [...this.deliverabilityData];
  }

  async getSendingDomains(): Promise<SendingDomain[]> {
    return Array.from(this.sendingDomains.values());
  }

  async getIPWarmingStatus(): Promise<IPWarmingStatus[]> {
    return [...this.ipWarmingStatus];
  }

  /* ── Expansion ────────────────────────────────────────────────── */

  async getExpansionOpportunities(): Promise<ExpansionOpportunity[]> {
    return Array.from(this.expansionOpportunities.values());
  }

  async upsertExpansionOpportunity(opp: ExpansionOpportunity): Promise<ExpansionOpportunity> {
    this.expansionOpportunities.set(opp.id, opp);
    return opp;
  }

  /* ── Activity Feed ────────────────────────────────────────────── */

  async getActivityFeed(limit = 50): Promise<ActivityEntry[]> {
    return this.activityFeed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async addActivity(entry: ActivityEntry): Promise<ActivityEntry> {
    this.activityFeed.unshift(entry);
    // Enforce cap
    if (this.activityFeed.length > MAX_ACTIVITY) {
      this.activityFeed.length = MAX_ACTIVITY;
    }
    return entry;
  }

  /* ── Webhooks ─────────────────────────────────────────────────── */

  async getWebhooks(): Promise<WebhookConfig[]> {
    return Array.from(this.webhooks.values());
  }

  async getWebhook(id: string): Promise<WebhookConfig | undefined> {
    return this.webhooks.get(id);
  }

  async upsertWebhook(webhook: WebhookConfig): Promise<WebhookConfig> {
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    return this.webhooks.delete(id);
  }

  /* ── Team ──────────────────────────────────────────────────────── */

  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  /* ── KPI Aggregation ──────────────────────────────────────────── */

  async getKPISummary() {
    const allUsers = Array.from(this.users.values());
    const allAccounts = Array.from(this.accounts.values());

    const distribution = {
      Lead: 0, Trial: 0, Activated: 0, PowerUser: 0,
      ExpansionReady: 0, AtRisk: 0, Churned: 0, Reactivated: 0,
    };
    let totalMrr = 0;
    let totalRisk = 0;
    let totalExpansion = 0;

    for (const u of allUsers) {
      distribution[u.lifecycleState] += 1;
    }

    for (const a of allAccounts) {
      totalMrr += a.mrr;
      totalRisk += a.churnRiskScore;
      totalExpansion += a.expansionScore;
    }

    const latest = this.revenueData.length > 0
      ? this.revenueData[this.revenueData.length - 1]
      : null;

    return {
      totalUsers: allUsers.length,
      totalAccounts: allAccounts.length,
      totalMrr,
      totalArr: totalMrr * 12,
      avgChurnRisk: allAccounts.length > 0 ? Math.round(totalRisk / allAccounts.length) : 0,
      avgExpansionScore: allAccounts.length > 0 ? Math.round(totalExpansion / allAccounts.length) : 0,
      lifecycleDistribution: distribution,
      mrrByMovement: latest
        ? {
          new: latest.newMrr,
          expansion: latest.expansionMrr,
          contraction: latest.contractionMrr,
          churn: latest.churnMrr,
          reactivation: latest.reactivationMrr,
        }
        : { new: 0, expansion: 0, contraction: 0, churn: 0, reactivation: 0 },
    };
  }
}

/* ── Singleton ──────────────────────────────────────────────────────── */

/**
 * Module-level singleton. In Next.js with hot reloading the module may
 * be re-evaluated, so we stash the instance on `globalThis` to survive
 * HMR cycles.
 */

const GLOBAL_KEY = '__lifecycleos_store__' as const;

function getStore(): DataStore {
  const g = globalThis as unknown as Record<string, DataStore>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new DataStore();
  }
  return g[GLOBAL_KEY];
}

export const store = getStore();
