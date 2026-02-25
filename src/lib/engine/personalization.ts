/* ═══════════════════════════════════════════════════════════════════════
 * Personalization Engine — Real-Time Content Personalization
 *
 * Resolves personalized content for a user based on:
 *  1. Variable mappings → pull live SDK user/account properties
 *  2. Conditional content blocks → show/hide based on segment rules
 *  3. Template rendering → replace {{variables}} in email/content
 *
 * Integrates with the Segmentation Engine for rule evaluation and
 * pulls real-time data from tracked users/accounts in the DB.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { SegmentFilter, PersonalizationVariant, VariableMapping } from '@/lib/db/schema';
import { evaluateSegmentFilters } from './segmentation';

/* ── Available Variable Sources ──────────────────────────────────────── */

export const VARIABLE_SOURCES = {
    user: [
        { key: 'name', label: 'User Name' },
        { key: 'email', label: 'User Email' },
        { key: 'lifecycleState', label: 'Lifecycle State' },
        { key: 'plan', label: 'User Plan' },
        { key: 'mrr', label: 'User MRR' },
        { key: 'churnRiskScore', label: 'Churn Risk Score' },
        { key: 'expansionScore', label: 'Expansion Score' },
        { key: 'loginFrequency7d', label: 'Logins (7d)' },
        { key: 'loginFrequency30d', label: 'Logins (30d)' },
        { key: 'sessionDepthMinutes', label: 'Session Depth (min)' },
        { key: 'npsScore', label: 'NPS Score' },
        { key: 'seatCount', label: 'Seat Count' },
        { key: 'seatLimit', label: 'Seat Limit' },
        { key: 'apiCalls30d', label: 'API Calls (30d)' },
        { key: 'supportTickets30d', label: 'Support Tickets (30d)' },
        { key: 'daysUntilRenewal', label: 'Days Until Renewal' },
    ],
    account: [
        { key: 'name', label: 'Account Name' },
        { key: 'domain', label: 'Account Domain' },
        { key: 'industry', label: 'Industry' },
        { key: 'plan', label: 'Account Plan' },
        { key: 'mrr', label: 'Account MRR' },
        { key: 'arr', label: 'Account ARR' },
        { key: 'userCount', label: 'User Count' },
        { key: 'health', label: 'Account Health' },
        { key: 'churnRiskScore', label: 'Account Churn Risk' },
        { key: 'expansionScore', label: 'Account Expansion Score' },
    ],
    custom: [
        { key: 'current_date', label: 'Current Date' },
        { key: 'app_name', label: 'App Name' },
        { key: 'support_email', label: 'Support Email' },
    ],
} as const;

/* ── Transforms ──────────────────────────────────────────────────────── */

type TransformFn = (value: string, param?: string) => string;

const TRANSFORMS: Record<string, TransformFn> = {
    uppercase: (v) => v.toUpperCase(),
    lowercase: (v) => v.toLowerCase(),
    capitalize: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    truncate: (v, p) => {
        const len = parseInt(p ?? '50', 10);
        return v.length > len ? v.slice(0, len) + '...' : v;
    },
    number_format: (v) => {
        const num = parseFloat(v);
        return isNaN(num) ? v : num.toLocaleString('en-US');
    },
};

/* ── Variable Resolution ─────────────────────────────────────────────── */

/**
 * Resolve a value from user/account data based on source + field path.
 * Supports nested JSONB properties via dot notation.
 */
export function resolveVariableValue(
    mapping: VariableMapping,
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
    customVars?: Record<string, string>,
): string {
    let rawValue: unknown;

    switch (mapping.source) {
        case 'user':
            rawValue = resolveNestedValue(user, mapping.sourceField);
            break;
        case 'account':
            rawValue = account ? resolveNestedValue(account, mapping.sourceField) : undefined;
            break;
        case 'event':
            rawValue = undefined; // resolved at send-time from event properties
            break;
        case 'custom':
            rawValue = customVars?.[mapping.sourceField];
            if (rawValue === undefined) {
                // Built-in custom variables
                if (mapping.sourceField === 'current_date') rawValue = new Date().toLocaleDateString();
                if (mapping.sourceField === 'app_name') rawValue = 'LifecycleOS';
            }
            break;
    }

    // Apply fallback
    let value = rawValue !== undefined && rawValue !== null && rawValue !== ''
        ? String(rawValue)
        : mapping.fallback;

    // Apply transform
    if (mapping.transform && TRANSFORMS[mapping.transform]) {
        value = TRANSFORMS[mapping.transform](value, mapping.transformParam);
    }

    return value;
}

function resolveNestedValue(obj: Record<string, unknown>, path: string): unknown {
    // Handle direct fields first
    if (path in obj) return obj[path];

    // Handle properties.* paths
    if (path.startsWith('properties.')) {
        const nestedPath = path.slice(11);
        const props = obj.properties as Record<string, unknown> | undefined;
        if (!props) return undefined;
        return nestedPath.split('.').reduce<unknown>((current, key) => {
            if (current && typeof current === 'object') return (current as Record<string, unknown>)[key];
            return undefined;
        }, props);
    }

    // Try dot-separated nested path
    return path.split('.').reduce<unknown>((current, key) => {
        if (current && typeof current === 'object') return (current as Record<string, unknown>)[key];
        return undefined;
    }, obj);
}

/* ── Template Rendering ──────────────────────────────────────────────── */

/**
 * Resolve all {{variable}} placeholders in a template string.
 * Uses variable mappings to pull live data from user/account.
 */
export function renderTemplate(
    template: string,
    mappings: VariableMapping[],
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
    customVars?: Record<string, string>,
): string {
    // Build a resolved variable bag from mappings
    const resolvedVars: Record<string, string> = {};
    for (const mapping of mappings) {
        resolvedVars[mapping.variableKey] = resolveVariableValue(mapping, user, account, customVars);
    }

    // Also include direct user/account properties as {{user.name}}, {{account.plan}} etc.
    if (user) {
        for (const [key, val] of Object.entries(user)) {
            if (val !== null && val !== undefined && typeof val !== 'object') {
                resolvedVars[`user.${key}`] = String(val);
            }
        }
    }
    if (account) {
        for (const [key, val] of Object.entries(account)) {
            if (val !== null && val !== undefined && typeof val !== 'object') {
                resolvedVars[`account.${key}`] = String(val);
            }
        }
    }

    // Replace placeholders
    return template.replace(/\{\{(.+?)\}\}/g, (match, key: string) => {
        const k = key.trim();
        if (k in resolvedVars) return resolvedVars[k];
        return match; // leave unresolved
    });
}

/* ── Conditional Block Evaluation ────────────────────────────────────── */

export interface ConditionalBlockDef {
    id: string;
    name: string;
    htmlContent: string;
    rules: SegmentFilter[];
    ruleLogic: 'AND' | 'OR';
}

/**
 * Evaluate conditional content blocks and return only the blocks
 * whose rules match the user.
 */
export function evaluateConditionalBlocks(
    blocks: ConditionalBlockDef[],
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
): ConditionalBlockDef[] {
    return blocks.filter((block) =>
        evaluateSegmentFilters(block.rules, block.ruleLogic, user, account),
    );
}

/* ── Personalization Rule Evaluation ─────────────────────────────────── */

export interface ResolvedPersonalization {
    ruleId: string;
    ruleName: string;
    variants: Array<{
        slotKey: string;
        content: string;  // rendered with variables
        contentType: 'text' | 'html' | 'json';
    }>;
    resolvedVariables: Record<string, string>;
}

/**
 * Evaluate a personalization rule against a user and return resolved variants.
 */
export function resolvePersonalizationRule(
    rule: {
        id: string;
        name: string;
        filters: SegmentFilter[];
        filterLogic: string;
        variants: PersonalizationVariant[];
        variableMappings: VariableMapping[];
    },
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
    customVars?: Record<string, string>,
): ResolvedPersonalization | null {
    // Check if user matches the rule's filters
    if (!evaluateSegmentFilters(rule.filters, rule.filterLogic, user, account)) {
        return null;
    }

    // Resolve variable mappings
    const resolvedVars: Record<string, string> = {};
    for (const mapping of rule.variableMappings) {
        resolvedVars[mapping.variableKey] = resolveVariableValue(mapping, user, account, customVars);
    }

    // Render each variant's content with the resolved variables
    const renderedVariants = rule.variants.map((variant) => ({
        slotKey: variant.slotKey,
        content: renderTemplate(variant.content, rule.variableMappings, user, account, customVars),
        contentType: variant.contentType,
    }));

    return {
        ruleId: rule.id,
        ruleName: rule.name,
        variants: renderedVariants,
        resolvedVariables: resolvedVars,
    };
}

/**
 * Evaluate all active personalization rules for a user,
 * returning the first matching rule per slot key (priority-ordered).
 */
export function resolveAllPersonalizations(
    rules: Array<{
        id: string;
        name: string;
        priority: number;
        filters: SegmentFilter[];
        filterLogic: string;
        variants: PersonalizationVariant[];
        variableMappings: VariableMapping[];
    }>,
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
    customVars?: Record<string, string>,
): Map<string, ResolvedPersonalization> {
    // Rules should already be sorted by priority desc
    const slotMap = new Map<string, ResolvedPersonalization>();

    for (const rule of rules) {
        const result = resolvePersonalizationRule(rule, user, account, customVars);
        if (!result) continue;

        for (const variant of result.variants) {
            // First match per slot wins (highest priority)
            if (!slotMap.has(variant.slotKey)) {
                slotMap.set(variant.slotKey, result);
            }
        }
    }

    return slotMap;
}

/* ── Email Personalization ───────────────────────────────────────────── */

/**
 * Personalize an email template for a specific user.
 * Resolves variables, evaluates conditional blocks, and returns
 * the final subject + body.
 */
export function personalizeEmail(
    template: {
        subject: string;
        bodyHtml: string;
        bodyText?: string;
        variables: Array<{ key: string; label: string; source: string; fallback: string }>;
        conditionalBlocks?: ConditionalBlockDef[];
    },
    variableMappings: VariableMapping[],
    user: Record<string, unknown>,
    account?: Record<string, unknown> | null,
    customVars?: Record<string, string>,
): {
    subject: string;
    bodyHtml: string;
    bodyText: string;
    resolvedVariables: Record<string, string>;
} {
    // Build variable bag from mappings + template variables
    const allMappings: VariableMapping[] = [
        ...variableMappings,
        ...template.variables
            .filter((v) => !variableMappings.some((m) => m.variableKey === v.key))
            .map((v) => ({
                variableKey: v.key,
                source: v.source as VariableMapping['source'],
                sourceField: v.key.includes('.') ? v.key.split('.').slice(1).join('.') : v.key,
                fallback: v.fallback,
            })),
    ];

    const resolvedVars: Record<string, string> = {};
    for (const m of allMappings) {
        resolvedVars[m.variableKey] = resolveVariableValue(m, user, account, customVars);
    }

    // Render subject and bodies
    const subject = renderTemplate(template.subject, allMappings, user, account, customVars);
    let bodyHtml = renderTemplate(template.bodyHtml, allMappings, user, account, customVars);
    const bodyText = renderTemplate(template.bodyText ?? '', allMappings, user, account, customVars);

    // Process conditional blocks: inject matching block content
    if (template.conditionalBlocks && template.conditionalBlocks.length > 0) {
        const matchingBlocks = evaluateConditionalBlocks(template.conditionalBlocks, user, account);
        for (const block of matchingBlocks) {
            const renderedContent = renderTemplate(block.htmlContent, allMappings, user, account, customVars);
            bodyHtml = bodyHtml.replace(`{{block:${block.id}}}`, renderedContent);
        }
        // Remove unmatched block placeholders
        bodyHtml = bodyHtml.replace(/\{\{block:[^}]+\}\}/g, '');
    }

    return { subject, bodyHtml, bodyText, resolvedVariables: resolvedVars };
}
