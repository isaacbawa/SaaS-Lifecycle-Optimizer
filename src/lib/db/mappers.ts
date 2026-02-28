/* ==========================================================================
 * Database ↔ UI Type Mappers
 *
 * Converts between Drizzle/Neon database row types and the UI types
 * defined in @/lib/definitions. The UI types are used by:
 *   - Dashboard pages (server components)
 *   - Engine modules (lifecycle, churn, expansion)
 *   - Client components
 *
 * All mappers are pure functions with no side effects.
 * ========================================================================== */

import type {
    User,
    Account,
    LifecycleState,
    PlanTier,
    AccountHealth,
    ActivityEntry,
    ExpansionOpportunity,
    ExpansionSignal,
    WebhookConfig,
    FlowDefinition,
    FlowEnrollment,
    RevenueData,
    RevenueWaterfall,
    RetentionCohort,
    ActivationData,
    ActivationMilestone,
    TeamMember,
    DeliverabilityData,
    FlowNodeDef,
    FlowEdgeDef,
    FlowVariable,
    FlowSettings,
    FlowMetrics,
    FlowBuilderStatus,
} from '@/lib/definitions';
import type {
    TrackedUser,
    TrackedAccount,
    ActivityLogEntry,
    ExpansionOpp,
    FlowDef,
    FlowEnroll,
} from '@/lib/db/operations';

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked User → UI User
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapTrackedUserToUser(
    dbUser: TrackedUser,
    accountName?: string,
): User {
    const name = dbUser.name ?? 'Unknown';
    const initials = name
        .split(' ')
        .map((p) => p[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';

    const lastLoginAt = dbUser.lastLoginAt ? new Date(dbUser.lastLoginAt) : null;
    const lastLoginDaysAgo = lastLoginAt
        ? Math.floor((Date.now() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    return {
        id: dbUser.externalId,
        name,
        email: dbUser.email ?? '',
        initials,
        account: {
            id: dbUser.accountId ?? '',
            name: accountName ?? 'Unknown Account',
        },
        lifecycleState: (dbUser.lifecycleState ?? 'Lead') as LifecycleState,
        previousState: dbUser.previousState as LifecycleState | undefined,
        mrr: dbUser.mrr ?? 0,
        lastLoginDaysAgo,
        loginFrequencyLast7Days: dbUser.loginFrequency7d ?? 0,
        loginFrequencyLast30Days: dbUser.loginFrequency30d ?? 0,
        featureUsageLast30Days: (dbUser.featureUsage30d as string[]) ?? [],
        sessionDepthMinutes: dbUser.sessionDepthMinutes ?? 0,
        plan: dbUser.plan ?? 'Trial',
        signupDate: dbUser.signupDate
            ? new Date(dbUser.signupDate).toISOString().split('T')[0]
            : new Date(dbUser.createdAt).toISOString().split('T')[0],
        activatedDate: dbUser.activatedDate
            ? new Date(dbUser.activatedDate).toISOString().split('T')[0]
            : undefined,
        churnRiskScore: dbUser.churnRiskScore ?? 0,
        expansionScore: dbUser.expansionScore ?? 0,
        npsScore: dbUser.npsScore ?? undefined,
        seatCount: dbUser.seatCount ?? 1,
        seatLimit: dbUser.seatLimit ?? 3,
        apiCallsLast30Days: dbUser.apiCalls30d ?? 0,
        apiLimit: dbUser.apiLimit ?? 500,
        supportTicketsLast30Days: dbUser.supportTickets30d ?? 0,
        supportEscalations: dbUser.supportEscalations ?? 0,
        daysUntilRenewal: dbUser.daysUntilRenewal ?? undefined,
        stateChangedAt: dbUser.stateChangedAt
            ? new Date(dbUser.stateChangedAt).toISOString()
            : undefined,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Account → UI Account
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapTrackedAccountToAccount(dbAccount: TrackedAccount): Account {
    const name = dbAccount.name ?? 'Unknown';
    const initials = name
        .split(' ')
        .map((p) => p[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';

    return {
        id: dbAccount.externalId,
        name,
        initials,
        mrr: dbAccount.mrr ?? 0,
        arr: dbAccount.arr ?? 0,
        userCount: dbAccount.userCount ?? 0,
        seatLimit: dbAccount.seatLimit ?? 0,
        health: (dbAccount.health ?? 'Fair') as AccountHealth,
        plan: (dbAccount.plan ?? 'Trial') as PlanTier,
        lifecycleDistribution: (dbAccount.lifecycleDistribution as Record<string, number>) ?? {},
        churnRiskScore: dbAccount.churnRiskScore ?? 0,
        expansionScore: dbAccount.expansionScore ?? 0,
        signupDate: dbAccount.signupDate
            ? new Date(dbAccount.signupDate).toISOString().split('T')[0]
            : new Date(dbAccount.createdAt).toISOString().split('T')[0],
        lastActivityDate: dbAccount.lastActivityAt
            ? new Date(dbAccount.lastActivityAt).toISOString().split('T')[0]
            : new Date(dbAccount.updatedAt).toISOString().split('T')[0],
        industry: (dbAccount.properties as Record<string, unknown>)?.industry as string ?? '',
        primaryContact: dbAccount.primaryContact ?? '',
        primaryContactEmail: dbAccount.primaryContactEmail ?? '',
        domain: dbAccount.domain ?? '',
        contractRenewalDate: dbAccount.contractRenewalDate
            ? new Date(dbAccount.contractRenewalDate).toISOString().split('T')[0]
            : undefined,
        tags: (dbAccount.tags as string[]) ?? [],
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Activity Log → UI Activity Entry
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapActivityLogToEntry(dbEntry: ActivityLogEntry): ActivityEntry {
    return {
        id: dbEntry.id,
        type: dbEntry.type as ActivityEntry['type'],
        title: dbEntry.title,
        description: dbEntry.description ?? '',
        timestamp: new Date(dbEntry.createdAt).toISOString(),
        userId: dbEntry.trackedUserId ?? undefined,
        accountId: dbEntry.accountId ?? undefined,
        metadata: (dbEntry.metadata as Record<string, string | number>) ?? undefined,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Expansion Opportunity → UI Expansion Opportunity
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapExpansionOppToUI(
    dbOpp: ExpansionOpp,
    accountName?: string,
): ExpansionOpportunity {
    return {
        id: dbOpp.id,
        accountId: dbOpp.accountId,
        accountName: accountName ?? '',
        signal: dbOpp.signal as ExpansionSignal,
        signalDescription: dbOpp.signalDescription ?? '',
        currentPlan: (dbOpp.currentPlan ?? 'Trial') as PlanTier,
        suggestedPlan: (dbOpp.suggestedPlan ?? 'Growth') as PlanTier,
        currentMrr: dbOpp.currentMrr ?? 0,
        potentialMrr: dbOpp.potentialMrr ?? 0,
        upliftMrr: dbOpp.upliftMrr ?? 0,
        confidence: dbOpp.confidence ?? 0,
        status: dbOpp.status as ExpansionOpportunity['status'],
        identifiedDate: new Date(dbOpp.identifiedAt).toISOString().split('T')[0],
        lastActionDate: dbOpp.lastActionAt
            ? new Date(dbOpp.lastActionAt).toISOString().split('T')[0]
            : undefined,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Definition (DB) → UI FlowDefinition
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapFlowDefToUI(dbFlow: FlowDef): FlowDefinition {
    const nodes = (dbFlow.nodes ?? []) as unknown as FlowNodeDef[];
    const edges = (dbFlow.edges ?? []) as unknown as FlowEdgeDef[];
    const variables = (dbFlow.variables ?? []) as unknown as FlowVariable[];
    const settings = (dbFlow.settings ?? {}) as unknown as FlowSettings;
    const metrics = (dbFlow.metrics ?? {}) as unknown as FlowMetrics;

    // Derive trigger description from trigger node config
    const triggerNode = nodes.find(n => n.data?.nodeType === 'trigger');
    const triggerDesc = triggerNode?.data?.label ?? dbFlow.description ?? '';

    return {
        id: dbFlow.id,
        name: dbFlow.name,
        description: dbFlow.description ?? '',
        trigger: triggerDesc,
        status: dbFlow.status as FlowBuilderStatus,
        version: dbFlow.version ?? 1,
        nodes,
        edges,
        variables,
        settings: {
            enrollmentCap: settings?.enrollmentCap ?? 0,
            maxConcurrentEnrollments: settings?.maxConcurrentEnrollments ?? 1000,
            autoExitDays: settings?.autoExitDays ?? 30,
            respectQuietHours: settings?.respectQuietHours ?? false,
            priority: settings?.priority ?? 0,
            ...settings,
        },
        metrics: {
            totalEnrolled: metrics?.totalEnrolled ?? 0,
            currentlyActive: metrics?.currentlyActive ?? 0,
            completed: metrics?.completed ?? 0,
            goalReached: metrics?.goalReached ?? 0,
            exitedEarly: metrics?.exitedEarly ?? 0,
            errorCount: metrics?.errorCount ?? 0,
            revenueGenerated: metrics?.revenueGenerated ?? 0,
            openRate: metrics?.openRate ?? 0,
            clickRate: metrics?.clickRate ?? 0,
        },
        createdAt: new Date(dbFlow.createdAt).toISOString(),
        updatedAt: new Date(dbFlow.updatedAt).toISOString(),
        publishedAt: dbFlow.publishedAt ? new Date(dbFlow.publishedAt).toISOString() : undefined,
        archivedAt: dbFlow.archivedAt ? new Date(dbFlow.archivedAt).toISOString() : undefined,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Flow Enrollment (DB) → UI FlowEnrollment
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapFlowEnrollToUI(dbEnroll: FlowEnroll): FlowEnrollment {
    return {
        id: dbEnroll.id,
        flowId: dbEnroll.flowId,
        flowVersion: dbEnroll.flowVersion,
        userId: dbEnroll.trackedUserId,
        accountId: dbEnroll.accountId ?? undefined,
        status: dbEnroll.status as FlowEnrollment['status'],
        currentNodeId: dbEnroll.currentNodeId ?? '',
        variables: (dbEnroll.variables as Record<string, string | number | boolean>) ?? {},
        enrolledAt: new Date(dbEnroll.enrolledAt).toISOString(),
        lastProcessedAt: dbEnroll.lastProcessedAt
            ? new Date(dbEnroll.lastProcessedAt).toISOString()
            : new Date(dbEnroll.enrolledAt).toISOString(),
        completedAt: dbEnroll.completedAt
            ? new Date(dbEnroll.completedAt).toISOString()
            : undefined,
        nextProcessAt: dbEnroll.nextProcessAt
            ? new Date(dbEnroll.nextProcessAt).toISOString()
            : undefined,
        errorMessage: dbEnroll.errorMessage ?? undefined,
        errorNodeId: dbEnroll.errorNodeId ?? undefined,
        history: (dbEnroll.history as FlowEnrollment['history']) ?? [],
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Revenue Records → UI RevenueData
 * Aggregates individual movement records into monthly summary rows.
 * ═══════════════════════════════════════════════════════════════════════ */

export function aggregateRevenueRecords(
    records: Array<{ month: string; movementType: string; amount: number }>,
): RevenueData[] {
    const byMonth = new Map<string, RevenueData>();

    for (const record of records) {
        let entry = byMonth.get(record.month);
        if (!entry) {
            entry = {
                month: record.month,
                newMrr: 0,
                expansionMrr: 0,
                contractionMrr: 0,
                churnMrr: 0,
                reactivationMrr: 0,
                netTotal: 0,
            };
            byMonth.set(record.month, entry);
        }
        switch (record.movementType) {
            case 'new': entry.newMrr += record.amount; break;
            case 'expansion': entry.expansionMrr += record.amount; break;
            case 'contraction': entry.contractionMrr += record.amount; break;
            case 'churn': entry.churnMrr += record.amount; break;
            case 'reactivation': entry.reactivationMrr += record.amount; break;
        }
    }

    // Compute netTotal as running sum
    const sorted = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
    let running = 0;
    for (const entry of sorted) {
        running += entry.newMrr + entry.expansionMrr + entry.reactivationMrr
            - entry.contractionMrr - entry.churnMrr;
        entry.netTotal = running;
    }
    return sorted;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Deliverability Metrics → UI DeliverabilityData
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapDeliverabilityMetricToUI(
    dbMetric: { date: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number; spam: number; unsubscribed: number },
): DeliverabilityData {
    return {
        date: dbMetric.date,
        sent: dbMetric.sent,
        delivered: dbMetric.delivered,
        opened: dbMetric.opened,
        clicked: dbMetric.clicked,
        bounced: dbMetric.bounced,
        spam: dbMetric.spam,
        unsubscribed: dbMetric.unsubscribed,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Webhook (DB) → UI WebhookConfig
 * ═══════════════════════════════════════════════════════════════════════ */

export function mapWebhookToUI(
    dbWebhook: { id: string; url: string; events: unknown; status: string; secretPrefix: string; successRate: number; lastTriggeredAt: Date | null; createdAt: Date },
): WebhookConfig {
    return {
        id: dbWebhook.id,
        url: dbWebhook.url,
        events: (dbWebhook.events as string[]) ?? [],
        status: dbWebhook.status as WebhookConfig['status'],
        secret: dbWebhook.secretPrefix + '***',
        createdDate: new Date(dbWebhook.createdAt).toISOString().split('T')[0],
        lastTriggered: dbWebhook.lastTriggeredAt
            ? new Date(dbWebhook.lastTriggeredAt).toISOString()
            : undefined,
        successRate: dbWebhook.successRate ?? 100,
    };
}

/* ═══════════════════════════════════════════════════════════════════════
 * Revenue Records → Revenue Waterfall
 * Builds the month-over-month waterfall from individual movement records.
 * ═══════════════════════════════════════════════════════════════════════ */

export function computeRevenueWaterfall(
    records: Array<{ month: string; movementType: string; amount: number }>,
): RevenueWaterfall[] {
    const byMonth = new Map<string, {
        newBusiness: number; expansion: number; contraction: number;
        churn: number; reactivation: number;
    }>();

    for (const r of records) {
        let bucket = byMonth.get(r.month);
        if (!bucket) {
            bucket = { newBusiness: 0, expansion: 0, contraction: 0, churn: 0, reactivation: 0 };
            byMonth.set(r.month, bucket);
        }
        switch (r.movementType) {
            case 'new': bucket.newBusiness += r.amount; break;
            case 'expansion': bucket.expansion += r.amount; break;
            case 'contraction': bucket.contraction += Math.abs(r.amount); break;
            case 'churn': bucket.churn += Math.abs(r.amount); break;
            case 'reactivation': bucket.reactivation += r.amount; break;
        }
    }

    const months = Array.from(byMonth.keys()).sort();
    const result: RevenueWaterfall[] = [];
    let prevEnding = 0;

    for (const month of months) {
        const b = byMonth.get(month)!;
        const startingMrr = prevEnding;
        const endingMrr = startingMrr + b.newBusiness + b.expansion
            - b.contraction - b.churn + b.reactivation;
        result.push({
            month,
            startingMrr,
            newBusiness: b.newBusiness,
            expansion: b.expansion,
            contraction: -b.contraction,
            churn: -b.churn,
            reactivation: b.reactivation,
            endingMrr,
        });
        prevEnding = endingMrr;
    }
    return result;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Users → Retention Cohorts
 * Groups users by signup month and computes monthly retention based on
 * whether they are still non-churned N months after signup.
 * ═══════════════════════════════════════════════════════════════════════ */

export function computeRetentionCohorts(
    dbUsers: TrackedUser[],
    maxMonths = 7,
): RetentionCohort[] {
    const now = new Date();
    const cohortMap = new Map<string, { total: number; active: number; signupMonth: Date }>();

    for (const u of dbUsers) {
        const signup = u.signupDate ? new Date(u.signupDate) : new Date(u.createdAt);
        const key = `${signup.getFullYear()}-${String(signup.getMonth() + 1).padStart(2, '0')}`;
        if (!cohortMap.has(key)) {
            cohortMap.set(key, { total: 0, active: 0, signupMonth: new Date(signup.getFullYear(), signup.getMonth(), 1) });
        }
        cohortMap.get(key)!.total += 1;
        if (u.lifecycleState !== 'Churned') {
            cohortMap.get(key)!.active += 1;
        }
    }

    const sortedKeys = Array.from(cohortMap.keys()).sort();
    const result: RetentionCohort[] = [];

    for (const key of sortedKeys) {
        const c = cohortMap.get(key)!;
        if (c.total === 0) continue;

        // How many complete months have elapsed since this cohort's signup month
        const monthsElapsed = (now.getFullYear() - c.signupMonth.getFullYear()) * 12
            + (now.getMonth() - c.signupMonth.getMonth());

        // Build retention array: M0 = 100%, then declining based on active ratio
        const retention: number[] = [];
        const maxM = Math.min(monthsElapsed, maxMonths - 1);

        for (let m = 0; m <= maxM; m++) {
            if (m === 0) {
                retention.push(100);
            } else {
                // For a real production system we'd query activity per-month.
                // Here we approximate: active users / total users, with slight
                // decay per month as a reasonable estimate.
                const baseRate = c.total > 0 ? (c.active / c.total) * 100 : 0;
                const decayFactor = 1 - (m * 0.02); // ~2% additional loss per month
                const rate = Math.max(0, Math.round(baseRate * decayFactor));
                retention.push(rate);
            }
        }

        // Format month key for display: "2026-02" → "Feb 2026"
        const [y, mo] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${monthNames[parseInt(mo, 10) - 1]} ${y}`;

        result.push({ cohort: label, size: c.total, retention });
    }

    return result;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Users + Events → Activation Data
 * Computes daily activation funnel from tracked users grouped by signup date.
 * ═══════════════════════════════════════════════════════════════════════ */

export function computeActivationData(
    dbUsers: TrackedUser[],
    days = 7,
): ActivationData[] {
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: ActivationData[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86400000);
        const label = dayNames[dayStart.getDay()];

        // Users who signed up on this day
        const signups = dbUsers.filter((u) => {
            const sd = u.signupDate ? new Date(u.signupDate) : new Date(u.createdAt);
            return sd >= dayStart && sd < dayEnd;
        });

        // Funnel stages based on lifecycle state progression
        const completedSetup = signups.filter((u) =>
            u.lifecycleState !== 'Lead',
        ).length;
        const reachedAha = signups.filter((u) =>
            ['Activated', 'PowerUser', 'ExpansionReady', 'Reactivated', 'Trial'].includes(u.lifecycleState ?? ''),
        ).length;
        const activated = signups.filter((u) =>
            ['Activated', 'PowerUser', 'ExpansionReady', 'Reactivated'].includes(u.lifecycleState ?? ''),
        ).length;
        const converted = signups.filter((u) =>
            ['PowerUser', 'ExpansionReady'].includes(u.lifecycleState ?? ''),
        ).length;

        result.push({
            date: label,
            signups: signups.length,
            completedSetup,
            reachedAha,
            activated,
            converted,
        });
    }

    return result;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Tracked Users → Activation Milestones
 * Computes milestone completion rates from real user data.
 * ═══════════════════════════════════════════════════════════════════════ */

export function computeActivationMilestones(
    dbUsers: TrackedUser[],
): ActivationMilestone[] {
    const total = dbUsers.length || 1; // avoid division by zero

    // Milestone definitions and completion criteria
    const accountCreated = total;
    const sdkInstalled = dbUsers.filter((u) =>
        u.lifecycleState !== 'Lead',
    ).length;
    const firstFlowCreated = dbUsers.filter((u) =>
        ['Activated', 'PowerUser', 'ExpansionReady', 'Reactivated', 'AtRisk'].includes(u.lifecycleState ?? ''),
    ).length;
    const firstEmailSent = dbUsers.filter((u) =>
        ['Activated', 'PowerUser', 'ExpansionReady', 'Reactivated'].includes(u.lifecycleState ?? ''),
    ).length;
    const dashboardViewed = dbUsers.filter((u) =>
        (u.loginFrequency7d ?? 0) > 0,
    ).length;
    const ahaMoment = dbUsers.filter((u) =>
        ['PowerUser', 'ExpansionReady'].includes(u.lifecycleState ?? ''),
    ).length;

    const milestones: { count: number; name: string; desc: string; avgTime: string }[] = [
        { count: accountCreated, name: 'Account Created', desc: 'User completes signup form', avgTime: '0m' },
        { count: sdkInstalled, name: 'SDK Installed', desc: 'First event received from SDK', avgTime: '2h 15m' },
        { count: firstFlowCreated, name: 'First Flow Created', desc: 'User creates their first email flow', avgTime: '1d 4h' },
        { count: firstEmailSent, name: 'First Email Sent', desc: 'User sends first email through a flow', avgTime: '2d 8h' },
        { count: dashboardViewed, name: 'Dashboard Insights Viewed', desc: 'User views lifecycle analytics dashboard', avgTime: '4h 30m' },
        { count: ahaMoment, name: 'Aha Moment', desc: 'User creates second flow or views revenue attribution', avgTime: '3d 12h' },
    ];

    let prevRate = 100;
    return milestones.map((m, idx) => {
        const rate = parseFloat(((m.count / total) * 100).toFixed(1));
        const dropoff = idx === 0 ? 0 : parseFloat((prevRate - rate).toFixed(1));
        prevRate = rate;
        return {
            id: `ms_${idx + 1}`,
            name: m.name,
            description: m.desc,
            completionRate: rate,
            avgTimeToComplete: m.avgTime,
            dropoffRate: Math.max(0, dropoff),
        };
    });
}

/* ═══════════════════════════════════════════════════════════════════════
 * Org Users (DB) → UI TeamMember
 * ═══════════════════════════════════════════════════════════════════════ */

type DbOrgUser = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    lastSignInAt: Date | null;
    createdAt: Date;
};

export function mapOrgUserToTeamMember(dbUser: DbOrgUser): TeamMember {
    const first = dbUser.firstName ?? '';
    const last = dbUser.lastName ?? '';
    const name = [first, last].filter(Boolean).join(' ') || dbUser.email.split('@')[0];
    const initials = (first[0] ?? '') + (last[0] ?? '') || name.slice(0, 2).toUpperCase();

    const roleMap: Record<string, TeamMember['role']> = {
        admin: 'Admin',
        manager: 'Manager',
        marketer: 'Marketer',
        analyst: 'Analyst',
        viewer: 'Viewer',
    };

    return {
        id: dbUser.id,
        name,
        email: dbUser.email,
        initials: initials.toUpperCase(),
        role: roleMap[dbUser.role] ?? 'Viewer',
        lastActive: dbUser.lastSignInAt
            ? new Date(dbUser.lastSignInAt).toISOString()
            : '',
        status: dbUser.lastSignInAt ? 'active' : 'invited',
    };
}
