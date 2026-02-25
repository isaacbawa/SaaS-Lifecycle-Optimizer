/* ═══════════════════════════════════════════════════════════════════════
 * Segmentation Engine — Real-Time Audience Segment Evaluation
 *
 * Evaluates segment filter rules against live tracked user and account
 * data sourced from the SDK.  Supports all property types including
 * JSONB custom properties.
 *
 * The engine:
 *  1. Takes a segment's filters + logic (AND / OR)
 *  2. Fetches all tracked users for the org
 *  3. Evaluates each user against the filter rules
 *  4. Updates segment memberships (enter/exit)
 *  5. Returns matched user IDs
 *
 * Designed for real-time evaluation on event ingestion: when an SDK
 * event arrives, the engine re-evaluates all active segments for the
 * affected user.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { SegmentFilter } from '@/lib/db/schema';

/* ── Available User Fields (real SDK properties) ─────────────────────── */

export const USER_FIELDS = [
    { key: 'lifecycleState', label: 'Lifecycle State', type: 'enum', source: 'user' as const, options: ['Lead', 'Trial', 'Activated', 'PowerUser', 'ExpansionReady', 'AtRisk', 'Churned', 'Reactivated'] },
    { key: 'email', label: 'Email', type: 'string', source: 'user' as const },
    { key: 'name', label: 'Name', type: 'string', source: 'user' as const },
    { key: 'plan', label: 'Plan', type: 'string', source: 'user' as const },
    { key: 'mrr', label: 'MRR ($)', type: 'number', source: 'user' as const },
    { key: 'churnRiskScore', label: 'Churn Risk Score', type: 'number', source: 'user' as const },
    { key: 'expansionScore', label: 'Expansion Score', type: 'number', source: 'user' as const },
    { key: 'loginFrequency7d', label: 'Logins (7d)', type: 'number', source: 'user' as const },
    { key: 'loginFrequency30d', label: 'Logins (30d)', type: 'number', source: 'user' as const },
    { key: 'sessionDepthMinutes', label: 'Session Depth (min)', type: 'number', source: 'user' as const },
    { key: 'npsScore', label: 'NPS Score', type: 'number', source: 'user' as const },
    { key: 'seatCount', label: 'Seat Count', type: 'number', source: 'user' as const },
    { key: 'seatLimit', label: 'Seat Limit', type: 'number', source: 'user' as const },
    { key: 'apiCalls30d', label: 'API Calls (30d)', type: 'number', source: 'user' as const },
    { key: 'apiLimit', label: 'API Limit', type: 'number', source: 'user' as const },
    { key: 'supportTickets30d', label: 'Support Tickets (30d)', type: 'number', source: 'user' as const },
    { key: 'supportEscalations', label: 'Support Escalations', type: 'number', source: 'user' as const },
    { key: 'daysUntilRenewal', label: 'Days Until Renewal', type: 'number', source: 'user' as const },
    { key: 'tags', label: 'Tags', type: 'array', source: 'user' as const },
] as const;

export const ACCOUNT_FIELDS = [
    { key: 'name', label: 'Account Name', type: 'string', source: 'account' as const },
    { key: 'domain', label: 'Domain', type: 'string', source: 'account' as const },
    { key: 'industry', label: 'Industry', type: 'string', source: 'account' as const },
    { key: 'plan', label: 'Account Plan', type: 'string', source: 'account' as const },
    { key: 'mrr', label: 'Account MRR ($)', type: 'number', source: 'account' as const },
    { key: 'arr', label: 'Account ARR ($)', type: 'number', source: 'account' as const },
    { key: 'userCount', label: 'User Count', type: 'number', source: 'account' as const },
    { key: 'health', label: 'Account Health', type: 'enum', source: 'account' as const, options: ['Good', 'Fair', 'Poor'] },
    { key: 'churnRiskScore', label: 'Account Churn Risk', type: 'number', source: 'account' as const },
    { key: 'expansionScore', label: 'Account Expansion Score', type: 'number', source: 'account' as const },
    { key: 'tags', label: 'Account Tags', type: 'array', source: 'account' as const },
] as const;

export const ALL_FIELDS = [...USER_FIELDS, ...ACCOUNT_FIELDS];

/* ── Value Resolver ──────────────────────────────────────────────────── */

/**
 * Resolve a field value from a user row or account row.
 * Supports nested properties via dot notation in the `properties` JSONB.
 */
export function resolveFieldValue(
    filter: SegmentFilter,
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
): unknown {
    const { field, fieldSource } = filter;
    const source = fieldSource === 'account' ? (account ?? {}) : user;

    // Direct column field
    if (field in source) return source[field];

    // Nested in properties JSONB  (e.g. "properties.company_size")
    if (field.startsWith('properties.')) {
        const path = field.slice(11);
        const props = source.properties as Record<string, unknown> | undefined;
        if (!props) return undefined;
        return path.split('.').reduce<unknown>((obj, key) => {
            if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
            return undefined;
        }, props);
    }

    // Tags array field
    if (field === 'tags') {
        return source.tags;
    }

    // Feature usage array
    if (field === 'featureUsage30d') {
        return source.featureUsage30d;
    }

    return undefined;
}

/* ── Rule Evaluation ─────────────────────────────────────────────────── */

/**
 * Evaluate a single filter rule against a resolved value.
 */
export function evaluateRule(filter: SegmentFilter, value: unknown): boolean {
    const { operator } = filter;

    // is_set / is_not_set — work on any type
    if (operator === 'is_set') return value !== undefined && value !== null && value !== '';
    if (operator === 'is_not_set') return value === undefined || value === null || value === '';

    // For array operators on tags/feature arrays
    if (operator === 'contains' && Array.isArray(value)) {
        return value.some((v) => String(v).toLowerCase().includes(String(filter.value).toLowerCase()));
    }
    if (operator === 'not_contains' && Array.isArray(value)) {
        return !value.some((v) => String(v).toLowerCase().includes(String(filter.value).toLowerCase()));
    }

    // in_list / not_in_list
    if (operator === 'in_list') {
        const list = filter.values ?? [];
        return list.some((v) => String(v).toLowerCase() === String(value).toLowerCase());
    }
    if (operator === 'not_in_list') {
        const list = filter.values ?? [];
        return !list.some((v) => String(v).toLowerCase() === String(value).toLowerCase());
    }

    // between (number range)
    if (operator === 'between') {
        const vals = filter.values ?? [];
        if (vals.length >= 2) {
            const num = Number(value);
            return num >= Number(vals[0]) && num <= Number(vals[1]);
        }
        return false;
    }

    // String operators
    const strValue = String(value ?? '').toLowerCase();
    const filterStr = String(filter.value ?? '').toLowerCase();

    switch (operator) {
        case 'equals':
            if (typeof value === 'number') return value === Number(filter.value);
            if (typeof value === 'boolean') return value === (filter.value === 'true' || filter.value === true);
            return strValue === filterStr;

        case 'not_equals':
            if (typeof value === 'number') return value !== Number(filter.value);
            return strValue !== filterStr;

        case 'contains':
            return strValue.includes(filterStr);

        case 'not_contains':
            return !strValue.includes(filterStr);

        case 'starts_with':
            return strValue.startsWith(filterStr);

        case 'ends_with':
            return strValue.endsWith(filterStr);

        case 'greater_than':
            return Number(value) > Number(filter.value);

        case 'less_than':
            return Number(value) < Number(filter.value);

        case 'greater_or_equal':
            return Number(value) >= Number(filter.value);

        case 'less_or_equal':
            return Number(value) <= Number(filter.value);

        default:
            return false;
    }
}

/* ── Full Segment Evaluation ─────────────────────────────────────────── */

/**
 * Evaluate all filters for a segment against a user (+account).
 * Returns true if the user matches the segment.
 */
export function evaluateSegmentFilters(
    filters: SegmentFilter[],
    filterLogic: string,
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
): boolean {
    if (filters.length === 0) return true; // empty filter = match all

    const results = filters.map((filter) => {
        const value = resolveFieldValue(filter, user, account);
        return evaluateRule(filter, value);
    });

    return filterLogic === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);
}

/* ── Batch Segment Evaluation ────────────────────────────────────────── */

export interface SegmentEvalResult {
    matched: string[];     // tracked user IDs that match
    entered: string[];     // newly entered user IDs
    exited: string[];      // exited user IDs
    total: number;
}

/**
 * Evaluate a segment against a batch of users.
 * Returns the matched user IDs and enter/exit diffs.
 */
export function evaluateSegmentBatch(
    filters: SegmentFilter[],
    filterLogic: string,
    users: Record<string, unknown>[],
    accounts: Map<string, Record<string, unknown>>,
    existingMemberIds: Set<string>,
): SegmentEvalResult {
    const matched: string[] = [];
    const entered: string[] = [];
    const exited: string[] = [];

    for (const user of users) {
        const userId = user.id as string;
        const accountId = user.accountId as string | undefined;
        const account = accountId ? accounts.get(accountId) : null;

        const isMatch = evaluateSegmentFilters(filters, filterLogic, user, account);

        if (isMatch) {
            matched.push(userId);
            if (!existingMemberIds.has(userId)) {
                entered.push(userId);
            }
        } else if (existingMemberIds.has(userId)) {
            exited.push(userId);
        }
    }

    return { matched, entered, exited, total: users.length };
}
