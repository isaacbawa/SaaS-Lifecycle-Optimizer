/* ═══════════════════════════════════════════════════════════════════════
 * Flow Execution Engine
 *
 * Processes FlowEnrollments through a node graph:
 *  1. Evaluates the current node
 *  2. Executes the node's action / checks its condition
 *  3. Resolves the next edge(s) to follow
 *  4. Advances the enrollment to the next node
 *  5. Records execution history
 *
 * The engine is stateless per invocation — it reads the enrollment's
 * current position, does one "tick", and writes the new position back
 * through the store.
 * ═══════════════════════════════════════════════════════════════════════ */

import type {
    FlowDefinition,
    FlowEnrollment,
    FlowNodeDef,
    FlowEdgeDef,
    FlowNodeData,
    FlowNodeType,
    ConditionRule,
    ConditionLogic,
    EnrollmentHistoryEntry,
    EnrollmentStatus,
    User,
    LifecycleState,
    FlowVariable,
    TriggerNodeConfig,
} from '@/lib/definitions';

/* ── Variable Resolution ─────────────────────────────────────────────── */

/**
 * Resolve `{{variable}}` placeholders in a string using the enrollment's
 * variable bag + live user/account data.
 */
export function resolveTemplate(
    template: string,
    variables: Record<string, string | number | boolean>,
    user?: Partial<User>,
): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, key: string) => {
        const k = key.trim();

        // Check enrollment variables first
        if (k in variables) return String(variables[k]);

        // Check user properties
        if (k.startsWith('user.') && user) {
            const prop = k.slice(5);
            const val = (user as Record<string, unknown>)[prop];
            return val !== undefined ? String(val) : '';
        }

        // Check user.account properties
        if (k.startsWith('account.') && user?.account) {
            const prop = k.slice(8);
            const val = (user.account as Record<string, unknown>)[prop];
            return val !== undefined ? String(val) : '';
        }

        return `{{${k}}}`;  // leave unresolved
    });
}

/**
 * Build the initial variable bag for a new enrollment by resolving
 * each FlowVariable from its source.
 */
export function buildInitialVariables(
    flowVars: FlowVariable[],
    user?: Partial<User>,
    eventProperties?: Record<string, unknown>,
): Record<string, string | number | boolean> {
    const bag: Record<string, string | number | boolean> = {};

    for (const v of flowVars) {
        if (v.source === 'static' || !v.source) {
            bag[v.key] = v.defaultValue ?? '';
        } else if (v.source === 'user_property' && user && v.sourceField) {
            const val = (user as Record<string, unknown>)[v.sourceField];
            bag[v.key] = val !== undefined ? (val as string | number | boolean) : (v.defaultValue ?? '');
        } else if (v.source === 'account_property' && user?.account && v.sourceField) {
            const val = (user.account as Record<string, unknown>)[v.sourceField];
            bag[v.key] = val !== undefined ? (val as string | number | boolean) : (v.defaultValue ?? '');
        } else if (v.source === 'event_property' && eventProperties && v.sourceField) {
            const val = eventProperties[v.sourceField];
            bag[v.key] = val !== undefined ? (val as string | number | boolean) : (v.defaultValue ?? '');
        } else {
            bag[v.key] = v.defaultValue ?? '';
        }
    }

    return bag;
}

/* ── Condition Evaluation ────────────────────────────────────────────── */

function coerceNumber(v: unknown): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

function resolveFieldValue(
    field: string,
    user?: Partial<User>,
    variables?: Record<string, string | number | boolean>,
): unknown {
    if (field.startsWith('user.') && user) {
        return (user as Record<string, unknown>)[field.slice(5)];
    }
    if (field.startsWith('account.') && user?.account) {
        return (user.account as Record<string, unknown>)[field.slice(8)];
    }
    if (field.startsWith('var.') && variables) {
        return variables[field.slice(4)];
    }
    // Fallback: try variables directly
    if (variables && field in variables) return variables[field];
    return undefined;
}

export function evaluateRule(
    rule: ConditionRule,
    user?: Partial<User>,
    variables?: Record<string, string | number | boolean>,
): boolean {
    const actual = resolveFieldValue(rule.field, user, variables);
    const expected = rule.value;

    switch (rule.operator) {
        case 'equals':
            return String(actual) === String(expected);
        case 'not_equals':
            return String(actual) !== String(expected);
        case 'contains':
            return String(actual ?? '').includes(String(expected ?? ''));
        case 'not_contains':
            return !String(actual ?? '').includes(String(expected ?? ''));
        case 'starts_with':
            return String(actual ?? '').startsWith(String(expected ?? ''));
        case 'ends_with':
            return String(actual ?? '').endsWith(String(expected ?? ''));
        case 'greater_than':
            return coerceNumber(actual) > coerceNumber(expected);
        case 'less_than':
            return coerceNumber(actual) < coerceNumber(expected);
        case 'greater_or_equal':
            return coerceNumber(actual) >= coerceNumber(expected);
        case 'less_or_equal':
            return coerceNumber(actual) <= coerceNumber(expected);
        case 'is_set':
            return actual !== undefined && actual !== null && actual !== '';
        case 'is_not_set':
            return actual === undefined || actual === null || actual === '';
        case 'in_list':
            return (rule.values ?? []).map(String).includes(String(actual));
        case 'not_in_list':
            return !(rule.values ?? []).map(String).includes(String(actual));
        case 'matches_regex':
            try {
                return new RegExp(String(expected)).test(String(actual ?? ''));
            } catch {
                return false;
            }
        default:
            return false;
    }
}

export function evaluateCondition(
    logic: ConditionLogic,
    rules: ConditionRule[],
    user?: Partial<User>,
    variables?: Record<string, string | number | boolean>,
): boolean {
    if (rules.length === 0) return true;
    if (logic === 'AND') return rules.every((r) => evaluateRule(r, user, variables));
    return rules.some((r) => evaluateRule(r, user, variables));
}

/* ── A/B Split Determinator ──────────────────────────────────────────── */

/**
 * Deterministically picks a split variant for a given userId so the same
 * user always gets the same variant.
 */
export function pickSplitVariant(
    variants: { id: string; percentage: number }[],
    userId: string,
): string {
    // Simple hash → bucket
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
    }
    const bucket = Math.abs(hash) % 100;
    let cumulative = 0;
    for (const v of variants) {
        cumulative += v.percentage;
        if (bucket < cumulative) return v.id;
    }
    return variants[variants.length - 1]?.id ?? '';
}

/* ── Trigger Matching ────────────────────────────────────────────────── */

export interface TriggerEvent {
    type: 'lifecycle_change' | 'event_received' | 'schedule' | 'manual' | 'segment_entry' | 'webhook_received' | 'date_property';
    /** For lifecycle_change */
    fromState?: LifecycleState;
    toState?: LifecycleState;
    /** For event_received */
    eventName?: string;
    eventProperties?: Record<string, unknown>;
    /** For segment_entry */
    segmentId?: string;
    /** User being evaluated */
    userId: string;
    accountId?: string;
}

/**
 * Check if a TriggerEvent matches a flow's trigger configuration.
 */
export function matchesTrigger(
    config: TriggerNodeConfig,
    event: TriggerEvent,
): boolean {
    if (config.kind !== event.type) return false;

    switch (config.kind) {
        case 'lifecycle_change': {
            const fromMatch = !config.lifecycleFrom?.length || config.lifecycleFrom.includes(event.fromState!);
            const toMatch = !config.lifecycleTo?.length || config.lifecycleTo.includes(event.toState!);
            return fromMatch && toMatch;
        }
        case 'event_received': {
            if (!config.eventName) return true;
            // Support wildcard: "user.*" matches "user.signed_up"
            const pattern = config.eventName.replace(/\*/g, '.*');
            if (!new RegExp(`^${pattern}$`).test(event.eventName ?? '')) return false;
            // Check optional event filters
            if (config.eventFilters?.length) {
                return evaluateCondition('AND', config.eventFilters);
            }
            return true;
        }
        case 'manual':
            return true;
        case 'schedule':
            return true; // cron handling is external
        case 'segment_entry':
            return config.segmentId === event.segmentId;
        case 'webhook_received':
            return true;
        case 'date_property':
            return true; // date evaluation is external
        default:
            return false;
    }
}

/* ── Graph Traversal Helpers ─────────────────────────────────────────── */

export function findNode(flow: FlowDefinition, nodeId: string): FlowNodeDef | undefined {
    return flow.nodes.find((n) => n.id === nodeId);
}

export function findTriggerNode(flow: FlowDefinition): FlowNodeDef | undefined {
    return flow.nodes.find((n) => n.data.nodeType === 'trigger');
}

export function findOutgoingEdges(flow: FlowDefinition, nodeId: string): FlowEdgeDef[] {
    return flow.edges.filter((e) => e.source === nodeId);
}

export function findNextNode(
    flow: FlowDefinition,
    nodeId: string,
    handle?: string,
): FlowNodeDef | undefined {
    const edges = findOutgoingEdges(flow, nodeId);
    const edge = handle
        ? edges.find((e) => e.sourceHandle === handle) ?? edges[0]
        : edges[0];
    if (!edge) return undefined;
    return findNode(flow, edge.target);
}

/* ── Node Tick (one-step execution) ──────────────────────────────────── */

export interface TickContext {
    flow: FlowDefinition;
    enrollment: FlowEnrollment;
    user?: Partial<User>;
}

export interface TickResult {
    /** Updated enrollment after this tick */
    enrollment: FlowEnrollment;
    /** Actions produced (to be dispatched externally) */
    actions: TickAction[];
    /** Whether we should immediately tick again (e.g. after condition) */
    continueImmediately: boolean;
}

export type TickAction =
    | { type: 'send_email'; subject: string; body: string; to: string; fromName?: string; replyTo?: string; templateId?: string }
    | { type: 'send_webhook'; url: string; method: string; headers: Record<string, string>; payload: string }
    | { type: 'update_user'; userId: string; properties: Record<string, string | number | boolean> }
    | { type: 'add_tag'; userId: string; tag: string }
    | { type: 'remove_tag'; userId: string; tag: string }
    | { type: 'create_task'; title: string; assignee?: string; priority?: string }
    | { type: 'api_call'; url: string; method: string; headers: Record<string, string>; body: string; responseVar?: string }
    | { type: 'send_notification'; userId: string; title: string; body: string; channel: string }
    | { type: 'set_variable'; key: string; value: string | number | boolean };

function now(): string {
    return new Date().toISOString();
}

function historyEntry(
    node: FlowNodeDef,
    action: EnrollmentHistoryEntry['action'],
    details?: string,
): EnrollmentHistoryEntry {
    return {
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.nodeType,
        action,
        timestamp: now(),
        details,
    };
}

/**
 * Advance an enrollment by one node. Returns the updated enrollment
 * and any side-effect actions to dispatch.
 */
export function tickEnrollment(ctx: TickContext): TickResult {
    const { flow, enrollment, user } = ctx;
    const node = findNode(flow, enrollment.currentNodeId);

    if (!node) {
        return {
            enrollment: {
                ...enrollment,
                status: 'error' as EnrollmentStatus,
                errorMessage: `Node ${enrollment.currentNodeId} not found in flow`,
                errorNodeId: enrollment.currentNodeId,
                lastProcessedAt: now(),
            },
            actions: [],
            continueImmediately: false,
        };
    }

    const data = node.data;
    const actions: TickAction[] = [];
    let nextHandle: string | undefined;
    let newStatus: EnrollmentStatus = 'active';
    let newVars = { ...enrollment.variables };
    const history = [...enrollment.history];

    switch (data.nodeType) {
        /* ── Trigger ──────────────────────────────────────────── */
        case 'trigger': {
            history.push(historyEntry(node, 'completed', 'Trigger activated'));
            break;
        }

        /* ── Action ───────────────────────────────────────────── */
        case 'action': {
            const cfg = data.actionConfig;
            if (!cfg) {
                history.push(historyEntry(node, 'failed', 'Missing action config'));
                break;
            }
            const resolve = (tpl: string) => resolveTemplate(tpl, newVars, user);

            switch (cfg.kind) {
                case 'send_email':
                    actions.push({
                        type: 'send_email',
                        subject: resolve(cfg.emailSubject ?? ''),
                        body: resolve(cfg.emailBody ?? ''),
                        to: user?.email ?? '',
                        fromName: cfg.emailFromName,
                        replyTo: cfg.emailReplyTo,
                        ...(cfg.emailTemplateId ? { templateId: cfg.emailTemplateId } : {}),
                    });
                    break;
                case 'send_webhook':
                    actions.push({
                        type: 'send_webhook',
                        url: resolve(cfg.webhookUrl ?? ''),
                        method: cfg.webhookMethod ?? 'POST',
                        headers: cfg.webhookHeaders ?? {},
                        payload: resolve(cfg.webhookPayload ?? '{}'),
                    });
                    break;
                case 'update_user':
                    if (cfg.userProperties) {
                        const resolved: Record<string, string | number | boolean> = {};
                        for (const [k, v] of Object.entries(cfg.userProperties)) {
                            resolved[k] = typeof v === 'string' ? resolve(v) : v;
                        }
                        actions.push({ type: 'update_user', userId: enrollment.userId, properties: resolved });
                    }
                    break;
                case 'add_tag':
                    if (cfg.tag) actions.push({ type: 'add_tag', userId: enrollment.userId, tag: resolve(cfg.tag) });
                    break;
                case 'remove_tag':
                    if (cfg.tag) actions.push({ type: 'remove_tag', userId: enrollment.userId, tag: resolve(cfg.tag) });
                    break;
                case 'set_variable':
                    if (cfg.variableKey) {
                        const val = resolve(cfg.variableValue ?? '');
                        newVars[cfg.variableKey] = val;
                        actions.push({ type: 'set_variable', key: cfg.variableKey, value: val });
                    }
                    break;
                case 'api_call':
                    actions.push({
                        type: 'api_call',
                        url: resolve(cfg.apiUrl ?? ''),
                        method: cfg.apiMethod ?? 'POST',
                        headers: cfg.apiHeaders ?? {},
                        body: resolve(cfg.apiBodyTemplate ?? '{}'),
                        responseVar: cfg.apiResponseVariable,
                    });
                    break;
                case 'create_task':
                    actions.push({
                        type: 'create_task',
                        title: resolve(cfg.taskTitle ?? ''),
                        assignee: cfg.taskAssignee,
                        priority: cfg.taskPriority,
                    });
                    break;
                case 'send_notification':
                    actions.push({
                        type: 'send_notification',
                        userId: enrollment.userId,
                        title: resolve(cfg.notificationTitle ?? ''),
                        body: resolve(cfg.notificationBody ?? ''),
                        channel: cfg.notificationChannel ?? 'in_app',
                    });
                    break;
                default:
                    break;
            }
            history.push(historyEntry(node, 'completed', `Executed: ${cfg.kind}`));
            break;
        }

        /* ── Condition ────────────────────────────────────────── */
        case 'condition': {
            const cfg = data.conditionConfig;
            if (!cfg) {
                history.push(historyEntry(node, 'failed', 'Missing condition config'));
                break;
            }
            const pass = evaluateCondition(cfg.logic, cfg.rules, user, newVars);
            nextHandle = pass ? 'yes' : 'no';
            history.push(historyEntry(node, 'completed', `Condition → ${nextHandle}`));
            break;
        }

        /* ── Delay ────────────────────────────────────────────── */
        case 'delay': {
            const cfg = data.delayConfig;
            if (!cfg) {
                history.push(historyEntry(node, 'failed', 'Missing delay config'));
                break;
            }

            // If we haven't set a nextProcessAt yet, set it now and wait
            if (!enrollment.nextProcessAt) {
                let waitUntil: Date;

                switch (cfg.kind) {
                    case 'fixed_duration':
                        waitUntil = new Date(Date.now() + (cfg.durationMinutes ?? 0) * 60_000);
                        break;
                    case 'until_time_of_day': {
                        const [h, m] = (cfg.untilTime ?? '09:00').split(':').map(Number);
                        waitUntil = new Date();
                        waitUntil.setHours(h, m, 0, 0);
                        if (waitUntil.getTime() <= Date.now()) waitUntil.setDate(waitUntil.getDate() + 1);
                        break;
                    }
                    case 'until_date':
                        waitUntil = new Date(resolveTemplate(cfg.untilDate ?? '', newVars, user));
                        if (isNaN(waitUntil.getTime())) waitUntil = new Date(Date.now() + 3600_000);
                        break;
                    case 'until_event':
                        // Wait for event or timeout
                        waitUntil = new Date(Date.now() + (cfg.waitTimeoutMinutes ?? 1440) * 60_000);
                        break;
                    case 'smart_send_time': {
                        // Pick middle of send window
                        const [sh] = (cfg.sendWindowStart ?? '09:00').split(':').map(Number);
                        const [eh] = (cfg.sendWindowEnd ?? '17:00').split(':').map(Number);
                        const mid = Math.floor((sh + eh) / 2);
                        waitUntil = new Date();
                        waitUntil.setHours(mid, 0, 0, 0);
                        if (waitUntil.getTime() <= Date.now()) waitUntil.setDate(waitUntil.getDate() + 1);
                        break;
                    }
                    default:
                        waitUntil = new Date(Date.now() + 3600_000);
                }

                history.push(historyEntry(node, 'waiting', `Waiting until ${waitUntil.toISOString()}`));

                return {
                    enrollment: {
                        ...enrollment,
                        variables: newVars,
                        nextProcessAt: waitUntil.toISOString(),
                        lastProcessedAt: now(),
                        history,
                    },
                    actions: [],
                    continueImmediately: false,
                };
            }

            // We had a wait time set and it's now past — continue
            if (new Date(enrollment.nextProcessAt).getTime() <= Date.now()) {
                history.push(historyEntry(node, 'completed', 'Delay elapsed'));
            } else {
                // Still waiting
                return {
                    enrollment: { ...enrollment, variables: newVars, history, lastProcessedAt: now() },
                    actions: [],
                    continueImmediately: false,
                };
            }
            break;
        }

        /* ── Split (A/B) ──────────────────────────────────────── */
        case 'split': {
            const cfg = data.splitConfig;
            if (!cfg || !cfg.variants.length) {
                history.push(historyEntry(node, 'failed', 'Missing split config'));
                break;
            }
            const variantId = pickSplitVariant(cfg.variants, enrollment.userId);
            nextHandle = `variant-${variantId}`;
            history.push(historyEntry(node, 'completed', `Split → variant ${variantId}`));
            break;
        }

        /* ── Filter ───────────────────────────────────────────── */
        case 'filter': {
            const cfg = data.filterConfig;
            if (!cfg) {
                history.push(historyEntry(node, 'failed', 'Missing filter config'));
                break;
            }
            const pass = evaluateCondition(cfg.logic, cfg.rules, user, newVars);
            if (!pass) {
                history.push(historyEntry(node, 'skipped', 'Filtered out'));
                return {
                    enrollment: {
                        ...enrollment,
                        status: 'exited',
                        variables: newVars,
                        lastProcessedAt: now(),
                        completedAt: now(),
                        history,
                    },
                    actions: [],
                    continueImmediately: false,
                };
            }
            history.push(historyEntry(node, 'completed', 'Filter passed'));
            break;
        }

        /* ── GoTo ─────────────────────────────────────────────── */
        case 'goto': {
            const cfg = data.goToConfig;
            if (!cfg?.targetNodeId) {
                history.push(historyEntry(node, 'failed', 'Missing goto target'));
                break;
            }
            // Loop guard
            const loopCount = history.filter((h) => h.nodeId === node.id && h.action === 'completed').length;
            if (cfg.maxLoops && loopCount >= cfg.maxLoops) {
                history.push(historyEntry(node, 'skipped', `Max loops (${cfg.maxLoops}) reached`));
                break;
            }
            // Jump directly to target node
            const target = findNode(flow, cfg.targetNodeId);
            if (!target) {
                history.push(historyEntry(node, 'failed', `GoTo target ${cfg.targetNodeId} not found`));
                break;
            }
            history.push(historyEntry(node, 'completed', `Jump to ${target.data.label}`));
            return {
                enrollment: {
                    ...enrollment,
                    currentNodeId: cfg.targetNodeId,
                    nextProcessAt: undefined,
                    variables: newVars,
                    lastProcessedAt: now(),
                    history,
                },
                actions: [],
                continueImmediately: true,
            };
        }

        /* ── Exit ─────────────────────────────────────────────── */
        case 'exit': {
            const reason = data.exitConfig?.reason ?? 'Flow completed';
            history.push(historyEntry(node, 'completed', reason));
            return {
                enrollment: {
                    ...enrollment,
                    status: 'completed',
                    variables: newVars,
                    lastProcessedAt: now(),
                    completedAt: now(),
                    history,
                },
                actions: [],
                continueImmediately: false,
            };
        }
    }

    // ── Advance to next node ──────────────────────────────────
    const next = findNextNode(flow, node.id, nextHandle);

    if (!next) {
        // No outgoing edge — flow implicitly complete
        return {
            enrollment: {
                ...enrollment,
                status: 'completed',
                variables: newVars,
                lastProcessedAt: now(),
                completedAt: now(),
                nextProcessAt: undefined,
                history,
            },
            actions,
            continueImmediately: false,
        };
    }

    newStatus = 'active';

    return {
        enrollment: {
            ...enrollment,
            status: newStatus,
            currentNodeId: next.id,
            nextProcessAt: undefined,
            variables: newVars,
            lastProcessedAt: now(),
            history,
        },
        actions,
        // Continue immediately for logic nodes (conditions, filters, goto, splits)
        // but not for delays or actions that need external dispatch
        continueImmediately: ['condition', 'filter', 'split', 'trigger'].includes(next.data.nodeType),
    };
}

/* ── Full Enrollment Processor ───────────────────────────────────────── */

/**
 * Process an enrollment until it reaches a delay, exit, or error.
 * Collects all actions along the way. Guards against infinite loops.
 */
export function processEnrollment(ctx: TickContext): TickResult {
    let result = tickEnrollment(ctx);
    const allActions = [...result.actions];
    let guard = 0;
    const MAX_TICKS = 100; // safety valve

    while (result.continueImmediately && guard < MAX_TICKS) {
        guard++;
        result = tickEnrollment({
            ...ctx,
            enrollment: result.enrollment,
        });
        allActions.push(...result.actions);
    }

    return {
        enrollment: result.enrollment,
        actions: allActions,
        continueImmediately: false,
    };
}

/* ── Enrollment Factory ──────────────────────────────────────────────── */

/**
 * Create a new enrollment for a user in a flow.
 */
export function createEnrollment(
    flow: FlowDefinition,
    userId: string,
    accountId?: string,
    user?: Partial<User>,
    eventProperties?: Record<string, unknown>,
): FlowEnrollment | null {
    const triggerNode = findTriggerNode(flow);
    if (!triggerNode) return null;

    const variables = buildInitialVariables(flow.variables, user, eventProperties);

    return {
        id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        flowId: flow.id,
        flowVersion: flow.version,
        userId,
        accountId,
        status: 'active',
        currentNodeId: triggerNode.id,
        variables,
        enrolledAt: now(),
        lastProcessedAt: now(),
        history: [
            {
                nodeId: triggerNode.id,
                nodeName: triggerNode.data.label,
                nodeType: 'trigger',
                action: 'entered',
                timestamp: now(),
                details: 'Enrolled in flow',
            },
        ],
    };
}
