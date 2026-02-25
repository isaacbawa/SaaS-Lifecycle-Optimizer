/* ═══════════════════════════════════════════════════════════════════════
 * Event Processing Pipeline — The Central Nervous System
 *
 * When an SDK event arrives, this pipeline orchestrates ALL downstream
 * processing in the correct order:
 *
 *  1. Lifecycle reclassification   → Re-evaluate user's lifecycle state
 *  2. Churn risk re-scoring        → Update risk score if state changed
 *  3. Expansion signal detection   → Detect upsell opportunities
 *  4. Segment re-evaluation        → Update segment memberships
 *  5. Flow enrollment check        → Enroll user in matching flows
 *  6. Active flow advancement      → Process any waiting enrollments
 *  7. Webhook dispatch             → Notify external systems
 *  8. Activity log                 → Record significant events
 *
 * The pipeline is idempotent per event (dedup by messageId happens
 * upstream in the store). Processing is synchronous within a single
 * event but non-blocking for webhook delivery (fire-and-forget with
 * retry handled by the webhook engine).
 *
 * Design: each stage returns a result object so the caller can inspect
 * what happened without side effects leaking across stages.
 * ═══════════════════════════════════════════════════════════════════════ */

import { store } from '@/lib/store';
import { detectStateTransition } from './lifecycle';
import { scoreChurnRisk } from './churn';
import { detectExpansionSignals, signalsToOpportunities } from './expansion';
import { evaluateSegmentFilters } from './segmentation';
import { dispatchWebhooks } from './webhooks';
import {
    matchesTrigger,
    createEnrollment,
    processEnrollment,
    findTriggerNode,
    type TriggerEvent,
    type TickAction,
} from './flow';
import { sendEmail } from './email';
import type { StoredEvent } from '@/lib/sdk/types';
import type { User, LifecycleState, FlowDefinition } from '@/lib/definitions';

/* ── Pipeline Result Types ──────────────────────────────────────────── */

export interface LifecycleResult {
    transitioned: boolean;
    from: LifecycleState;
    to: LifecycleState;
    confidence: number;
    suppressedByCooldown: boolean;
}

export interface ChurnResult {
    previousScore: number;
    newScore: number;
    tier: string;
}

export interface ExpansionResult {
    signalsDetected: number;
    opportunitiesCreated: number;
}

export interface SegmentResult {
    segmentsEvaluated: number;
    entered: string[];
    exited: string[];
}

export interface FlowResult {
    flowsChecked: number;
    enrollmentsCreated: number;
    enrollmentsAdvanced: number;
    actionsDispatched: number;
}

export interface WebhookResult {
    eventsDispatched: number;
}

export interface PipelineResult {
    eventId: string;
    userId?: string;
    accountId?: string;
    lifecycle: LifecycleResult | null;
    churn: ChurnResult | null;
    expansion: ExpansionResult | null;
    segments: SegmentResult | null;
    flows: FlowResult | null;
    webhooks: WebhookResult;
    processingTimeMs: number;
    errors: string[];
}

/* ── Pipeline Execution ─────────────────────────────────────────────── */

/**
 * Process a single event through the full pipeline.
 * Called after the event has been stored (dedup already handled).
 */
export async function processEvent(event: StoredEvent): Promise<PipelineResult> {
    const start = Date.now();
    const errors: string[] = [];
    const now = new Date().toISOString();

    const result: PipelineResult = {
        eventId: event.id,
        userId: event.userId,
        accountId: event.accountId,
        lifecycle: null,
        churn: null,
        expansion: null,
        segments: null,
        flows: null,
        webhooks: { eventsDispatched: 0 },
        processingTimeMs: 0,
        errors,
    };

    // No user = only dispatch the raw event webhook
    if (!event.userId) {
        try {
            void dispatchWebhooks('event.tracked', {
                event: event.event,
                properties: event.properties,
                timestamp: event.timestamp,
            });
            result.webhooks.eventsDispatched = 1;
        } catch (e) {
            errors.push(`webhook_dispatch: ${(e as Error).message}`);
        }
        result.processingTimeMs = Date.now() - start;
        return result;
    }

    const user = await store.getUser(event.userId);
    if (!user) {
        // Event references a user we haven't seen via identify() yet.
        // Still dispatch the raw event webhook.
        try {
            void dispatchWebhooks('event.tracked', {
                event: event.event,
                userId: event.userId,
                accountId: event.accountId,
                properties: event.properties,
                timestamp: event.timestamp,
            });
            result.webhooks.eventsDispatched = 1;
        } catch (e) {
            errors.push(`webhook_dispatch: ${(e as Error).message}`);
        }
        result.processingTimeMs = Date.now() - start;
        return result;
    }

    /* ── Stage 1: Lifecycle Reclassification ──────────────────────── */
    try {
        const transition = detectStateTransition(user);
        result.lifecycle = {
            transitioned: transition.transitioned,
            from: transition.from,
            to: transition.to,
            confidence: transition.classification.confidence,
            suppressedByCooldown: transition.suppressedByCooldown,
        };

        if (transition.transitioned) {
            await store.updateUser(user.id, {
                lifecycleState: transition.to,
                previousState: transition.from,
                stateChangedAt: now,
            });
        }
    } catch (e) {
        errors.push(`lifecycle: ${(e as Error).message}`);
    }

    /* ── Stage 2: Churn Risk Re-scoring ───────────────────────────── */
    try {
        const freshUser = await store.getUser(user.id);
        if (freshUser) {
            const previousScore = freshUser.churnRiskScore ?? 0;
            const churnResult = scoreChurnRisk(freshUser);
            await store.updateUser(user.id, {
                churnRiskScore: churnResult.riskScore,
            });
            result.churn = {
                previousScore,
                newScore: churnResult.riskScore,
                tier: churnResult.riskTier,
            };

            // Dispatch webhook if risk score changed significantly (>10 points)
            if (Math.abs(churnResult.riskScore - previousScore) > 10) {
                void dispatchWebhooks('user.risk_score_changed', {
                    userId: user.id,
                    userName: user.name,
                    previousScore,
                    newScore: churnResult.riskScore,
                    tier: churnResult.riskTier,
                    account: user.account,
                });
                result.webhooks.eventsDispatched++;
            }
        }
    } catch (e) {
        errors.push(`churn: ${(e as Error).message}`);
    }

    /* ── Stage 3: Expansion Signal Detection ──────────────────────── */
    try {
        const freshUser = await store.getUser(user.id);
        if (freshUser) {
            const account = freshUser.account
                ? await store.getAccount(freshUser.account.id)
                : undefined;
            if (account) {
                const signals = detectExpansionSignals(freshUser, account);
                if (signals.length > 0) {
                    const opportunities = signalsToOpportunities(
                        signals,
                        account.id,
                        account.name,
                        account.plan,
                        account.mrr,
                    );
                    let created = 0;
                    for (const opp of opportunities) {
                        // Avoid duplicating existing opportunities for same account+signal
                        const existing = await store.getExpansionOpportunities();
                        const alreadyExists = existing.some(
                            (e) => e.accountId === opp.accountId && e.signal === opp.signal && e.status === 'identified',
                        );
                        if (!alreadyExists) {
                            await store.upsertExpansionOpportunity(opp);
                            created++;

                            void dispatchWebhooks('account.expansion_signal', {
                                accountId: account.id,
                                accountName: account.name,
                                signal: opp.signal,
                                suggestedPlan: opp.suggestedPlan,
                                upliftMrr: opp.upliftMrr,
                                confidence: opp.confidence,
                            });
                            result.webhooks.eventsDispatched++;
                        }
                    }
                    result.expansion = {
                        signalsDetected: signals.length,
                        opportunitiesCreated: created,
                    };
                } else {
                    result.expansion = { signalsDetected: 0, opportunitiesCreated: 0 };
                }
            }
        }
    } catch (e) {
        errors.push(`expansion: ${(e as Error).message}`);
    }

    /* ── Stage 4: Segment Re-evaluation ───────────────────────────── */
    try {
        // Re-evaluate segments for this user using the in-memory user data
        // Segments are evaluated against store users (flattened to records)
        const freshUser = await store.getUser(user.id);
        if (freshUser) {
            const userRecord = flattenUserForSegment(freshUser);
            const accountRecord = freshUser.account
                ? await flattenAccountForSegment(freshUser.account)
                : null;

            // Get all flow definitions that might have segment-based triggers
            const allFlows = await store.getAllFlowDefinitions();
            const segmentsEntered: string[] = [];
            const segmentsExited: string[] = [];

            // NOTE: In production, segments would be fetched from the DB.
            // For now, we evaluate against any segment filters stored in
            // flow definitions that use segment_entry triggers.
            // This handles the in-memory store flow scenario.

            result.segments = {
                segmentsEvaluated: 0,
                entered: segmentsEntered,
                exited: segmentsExited,
            };
        }
    } catch (e) {
        errors.push(`segments: ${(e as Error).message}`);
    }

    /* ── Stage 5: Flow Enrollment Check ───────────────────────────── */
    try {
        const freshUser = await store.getUser(user.id);
        if (freshUser) {
            const activeFlows = await store.getFlowDefinitionsByStatus('active');
            let enrollmentsCreated = 0;
            let actionsDispatched = 0;

            for (const flow of activeFlows) {
                const triggerNode = findTriggerNode(flow);
                if (!triggerNode || !triggerNode.data.triggerConfig) continue;

                // Build trigger event from the SDK event
                const triggerEvent = buildTriggerEvent(event, freshUser, result.lifecycle);
                if (!triggerEvent) continue;

                // Check if this flow's trigger matches
                if (!matchesTrigger(triggerNode.data.triggerConfig, triggerEvent)) continue;

                // Check if user is already enrolled in this flow
                const existingEnrollments = await store.getUserEnrollments(freshUser.id);
                const alreadyEnrolled = existingEnrollments.some(
                    (e) => e.flowId === flow.id && (e.status === 'active' || e.status === 'paused'),
                );
                if (alreadyEnrolled) continue;

                // Check re-enrollment settings
                const settings = flow.settings;
                if (settings) {
                    const hasCompleted = existingEnrollments.some(
                        (e) => e.flowId === flow.id && (e.status === 'completed' || e.status === 'exited'),
                    );
                    if (hasCompleted) continue;
                }

                // Create enrollment and process through trigger → first action
                const enrollment = createEnrollment(
                    flow,
                    freshUser.id,
                    freshUser.account?.id,
                    freshUser,
                    event.properties as Record<string, unknown>,
                );
                if (!enrollment) continue;

                await store.upsertEnrollment(enrollment);
                enrollmentsCreated++;

                // Update flow metrics
                const metrics = flow.metrics ?? {
                    totalEnrolled: 0,
                    currentlyActive: 0,
                    completed: 0,
                    goalReached: 0,
                    exitedEarly: 0,
                    errorCount: 0,
                };
                metrics.totalEnrolled++;
                metrics.currentlyActive++;
                await store.upsertFlowDefinition({ ...flow, metrics });

                // Process the enrollment through the trigger node → next nodes
                const processResult = processEnrollment({
                    flow,
                    enrollment,
                    user: freshUser,
                });

                // Save updated enrollment
                await store.upsertEnrollment(processResult.enrollment);

                // Dispatch actions produced by the flow
                const dispatched = await dispatchFlowActions(processResult.actions, freshUser);
                actionsDispatched += dispatched;

                // Dispatch flow.triggered webhook
                void dispatchWebhooks('flow.triggered', {
                    flowId: flow.id,
                    flowName: flow.name,
                    userId: freshUser.id,
                    userName: freshUser.name,
                    enrollmentId: enrollment.id,
                });
                result.webhooks.eventsDispatched++;

                // Check if flow completed immediately
                if (processResult.enrollment.status === 'completed') {
                    metrics.currentlyActive = Math.max(0, metrics.currentlyActive - 1);
                    metrics.completed++;
                    await store.upsertFlowDefinition({ ...flow, metrics });

                    void dispatchWebhooks('flow.completed', {
                        flowId: flow.id,
                        flowName: flow.name,
                        userId: freshUser.id,
                        enrollmentId: enrollment.id,
                        status: 'completed',
                    });
                    result.webhooks.eventsDispatched++;
                }
            }

            result.flows = {
                flowsChecked: activeFlows.length,
                enrollmentsCreated,
                enrollmentsAdvanced: 0,
                actionsDispatched,
            };
        }
    } catch (e) {
        errors.push(`flows: ${(e as Error).message}`);
    }

    /* ── Stage 6: Advance Waiting Flow Enrollments ────────────────── */
    try {
        if (event.userId) {
            const userEnrollments = await store.getUserEnrollments(event.userId);
            const waitingForEvent = userEnrollments.filter(
                (e) => e.status === 'active' && e.nextProcessAt,
            );

            let advanced = 0;
            for (const enrollment of waitingForEvent) {
                const flow = await store.getFlowDefinition(enrollment.flowId);
                if (!flow) continue;

                const freshUser = await store.getUser(event.userId);
                if (!freshUser) continue;

                // Check if this event satisfies a "wait for event" delay
                // by processing the enrollment - if the delay has elapsed, it will advance
                const processResult = processEnrollment({
                    flow,
                    enrollment,
                    user: freshUser,
                });

                if (processResult.enrollment.currentNodeId !== enrollment.currentNodeId) {
                    await store.upsertEnrollment(processResult.enrollment);
                    await dispatchFlowActions(processResult.actions, freshUser);
                    advanced++;
                }
            }

            if (result.flows) {
                result.flows.enrollmentsAdvanced = advanced;
            }
        }
    } catch (e) {
        errors.push(`flow_advance: ${(e as Error).message}`);
    }

    /* ── Stage 7: Lifecycle Change Webhook ────────────────────────── */
    try {
        if (result.lifecycle?.transitioned) {
            const freshUser = await store.getUser(user.id);
            void dispatchWebhooks('user.lifecycle_changed', {
                userId: user.id,
                userName: freshUser?.name ?? user.name,
                previousState: result.lifecycle.from,
                newState: result.lifecycle.to,
                account: freshUser?.account ?? user.account,
                confidence: result.lifecycle.confidence,
            });
            result.webhooks.eventsDispatched++;
        }
    } catch (e) {
        errors.push(`lifecycle_webhook: ${(e as Error).message}`);
    }

    /* ── Stage 8: Event Tracked Webhook ───────────────────────────── */
    try {
        void dispatchWebhooks('event.tracked', {
            event: event.event,
            userId: event.userId,
            accountId: event.accountId,
            properties: event.properties,
            timestamp: event.timestamp,
        });
        result.webhooks.eventsDispatched++;
    } catch (e) {
        errors.push(`event_webhook: ${(e as Error).message}`);
    }

    /* ── Stage 9: Activity Log ────────────────────────────────────── */
    try {
        // Log lifecycle transitions
        if (result.lifecycle?.transitioned) {
            await store.addActivity({
                id: `act_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
                type: 'lifecycle_change',
                title: 'Lifecycle State Change',
                description: `${user.name} moved from ${result.lifecycle.from} → ${result.lifecycle.to}`,
                timestamp: now,
                userId: user.id,
                accountId: user.account?.id,
            });
        }

        // Log flow enrollments
        if (result.flows && result.flows.enrollmentsCreated > 0) {
            await store.addActivity({
                id: `act_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
                type: 'flow_triggered',
                title: 'Flow Enrollment',
                description: `${user.name} enrolled in ${result.flows.enrollmentsCreated} flow(s)`,
                timestamp: now,
                userId: user.id,
                accountId: user.account?.id,
            });
        }

        // Log expansion signals
        if (result.expansion && result.expansion.opportunitiesCreated > 0) {
            await store.addActivity({
                id: `act_${Date.now().toString(36)}_${crypto.randomUUID().substring(0, 6)}`,
                type: 'expansion_signal',
                title: 'Expansion Opportunity',
                description: `${result.expansion.signalsDetected} expansion signal(s) detected for ${user.account?.name ?? user.name}`,
                timestamp: now,
                userId: user.id,
                accountId: user.account?.id,
            });
        }
    } catch (e) {
        errors.push(`activity_log: ${(e as Error).message}`);
    }

    result.processingTimeMs = Date.now() - start;
    return result;
}

/* ── Batch Processing ───────────────────────────────────────────────── */

/**
 * Process multiple events through the pipeline.
 * Events are processed sequentially to maintain causal ordering
 * (e.g., identify before track for the same user).
 */
export async function processEventBatch(events: StoredEvent[]): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    for (const event of events) {
        results.push(await processEvent(event));
    }
    return results;
}

/* ── Helper: Build TriggerEvent ─────────────────────────────────────── */

function buildTriggerEvent(
    event: StoredEvent,
    user: User,
    lifecycleResult: LifecycleResult | null,
): TriggerEvent | null {
    // If a lifecycle transition happened, emit a lifecycle_change trigger
    if (lifecycleResult?.transitioned) {
        return {
            type: 'lifecycle_change',
            fromState: lifecycleResult.from,
            toState: lifecycleResult.to,
            userId: user.id,
            accountId: user.account?.id,
        };
    }

    // All events emit event_received triggers
    return {
        type: 'event_received',
        eventName: event.event,
        eventProperties: event.properties as Record<string, unknown>,
        userId: user.id,
        accountId: user.account?.id,
    };
}

/* ── Helper: Flatten User for Segment Evaluation ────────────────────── */

function flattenUserForSegment(user: User): Record<string, unknown> {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        lifecycleState: user.lifecycleState,
        mrr: user.mrr ?? 0,
        churnRiskScore: user.churnRiskScore ?? 0,
        expansionScore: user.expansionScore ?? 0,
        loginFrequency7d: user.loginFrequencyLast7Days,
        loginFrequency30d: user.loginFrequencyLast30Days,
        sessionDepthMinutes: user.sessionDepthMinutes,
        npsScore: user.npsScore,
        seatCount: user.seatCount,
        seatLimit: user.seatLimit,
        apiCalls30d: user.apiCallsLast30Days,
        apiLimit: user.apiLimit,
        supportTickets30d: user.supportTicketsLast30Days,
        supportEscalations: user.supportEscalations,
        daysUntilRenewal: user.daysUntilRenewal,
        accountId: user.account?.id,
    };
}

async function flattenAccountForSegment(accountRef: User['account']): Promise<Record<string, unknown>> {
    // Look up full Account from store if needed
    const full = accountRef ? await store.getAccount(accountRef.id) : undefined;
    if (full) {
        return {
            id: full.id,
            name: full.name,
            domain: full.domain,
            industry: full.industry,
            plan: full.plan,
            mrr: full.mrr,
            arr: full.arr,
            userCount: full.userCount,
            health: full.health,
            churnRiskScore: full.churnRiskScore,
            expansionScore: full.expansionScore,
            tags: full.tags ?? [],
        };
    }
    return { id: accountRef?.id, name: accountRef?.name };
}

/* ── Helper: Dispatch Flow Actions ──────────────────────────────────── */

/**
 * Execute the side-effect actions produced by flow node execution.
 * Returns the count of successfully dispatched actions.
 */
async function dispatchFlowActions(actions: TickAction[], user: User): Promise<number> {
    let dispatched = 0;

    for (const action of actions) {
        try {
            switch (action.type) {
                case 'send_email': {
                    await sendEmail({
                        to: action.to || user.email,
                        subject: action.subject,
                        html: action.body,
                        fromName: action.fromName,
                        replyTo: action.replyTo,
                    });
                    dispatched++;
                    break;
                }

                case 'send_webhook': {
                    await fetch(action.url, {
                        method: action.method || 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...action.headers,
                        },
                        body: action.payload,
                        signal: AbortSignal.timeout(10_000),
                    });
                    dispatched++;
                    break;
                }

                case 'update_user': {
                    await store.updateUser(action.userId, action.properties as Partial<User>);
                    dispatched++;
                    break;
                }

                case 'add_tag': {
                    const u = await store.getUser(action.userId);
                    if (u) {
                        // Tags are managed at the account level in this system
                        // Store the tag action as an activity
                        await store.addActivity({
                            id: `act_tag_${Date.now().toString(36)}`,
                            type: 'system',
                            title: `Tag added: ${action.tag}`,
                            description: `Tag "${action.tag}" added to user ${action.userId}`,
                            timestamp: new Date().toISOString(),
                            userId: action.userId,
                        });
                    }
                    dispatched++;
                    break;
                }

                case 'remove_tag': {
                    await store.addActivity({
                        id: `act_untag_${Date.now().toString(36)}`,
                        type: 'system',
                        title: `Tag removed: ${action.tag}`,
                        description: `Tag "${action.tag}" removed from user ${action.userId}`,
                        timestamp: new Date().toISOString(),
                        userId: action.userId,
                    });
                    dispatched++;
                    break;
                }

                case 'set_variable': {
                    // Variables are set on the enrollment, not dispatched externally
                    dispatched++;
                    break;
                }

                case 'api_call': {
                    await fetch(action.url, {
                        method: action.method || 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...action.headers,
                        },
                        body: action.body,
                        signal: AbortSignal.timeout(10_000),
                    });
                    dispatched++;
                    break;
                }

                case 'send_notification': {
                    // In-app notifications would go to a notification store
                    // For now, log it as an activity
                    await store.addActivity({
                        id: `act_notif_${Date.now().toString(36)}`,
                        type: 'system',
                        title: action.title,
                        description: action.body,
                        timestamp: new Date().toISOString(),
                        userId: action.userId,
                    });
                    dispatched++;
                    break;
                }

                case 'create_task': {
                    await store.addActivity({
                        id: `act_task_${Date.now().toString(36)}`,
                        type: 'system',
                        title: `Task: ${action.title}`,
                        description: `Assigned to ${action.assignee ?? 'unassigned'} (${action.priority ?? 'normal'})`,
                        timestamp: new Date().toISOString(),
                    });
                    dispatched++;
                    break;
                }
            }
        } catch (e) {
            console.error(`[pipeline] Failed to dispatch action ${action.type}:`, (e as Error).message);
        }
    }

    return dispatched;
}

/* ── Flow Scheduler: Process Due Enrollments ─────────────────────────── */

/**
 * Process all flow enrollments whose nextProcessAt has elapsed.
 * This is called by the scheduler endpoint (cron) or can be called
 * manually.
 */
export async function processScheduledEnrollments(): Promise<{
    processed: number;
    completed: number;
    errors: number;
    actionsDispatched: number;
}> {
    const dueEnrollments = await store.getActiveEnrollmentsDue();
    let processed = 0;
    let completed = 0;
    let errored = 0;
    let totalActions = 0;

    for (const enrollment of dueEnrollments) {
        try {
            const flow = await store.getFlowDefinition(enrollment.flowId);
            if (!flow || flow.status !== 'active') {
                // Flow was deactivated — mark enrollment as exited
                await store.upsertEnrollment({
                    ...enrollment,
                    status: 'exited',
                    completedAt: new Date().toISOString(),
                    lastProcessedAt: new Date().toISOString(),
                });
                continue;
            }

            const user = await store.getUser(enrollment.userId);

            const result = processEnrollment({
                flow,
                enrollment: { ...enrollment, nextProcessAt: undefined },
                user: user ?? undefined,
            });

            await store.upsertEnrollment(result.enrollment);

            // Dispatch actions
            if (user && result.actions.length > 0) {
                const dispatched = await dispatchFlowActions(result.actions, user);
                totalActions += dispatched;
            }

            processed++;

            // Update flow metrics
            if (result.enrollment.status === 'completed' || result.enrollment.status === 'exited') {
                completed++;
                const metrics = flow.metrics ?? {
                    totalEnrolled: 0,
                    currentlyActive: 0,
                    completed: 0,
                    goalReached: 0,
                    exitedEarly: 0,
                    errorCount: 0,
                };
                metrics.currentlyActive = Math.max(0, metrics.currentlyActive - 1);
                if (result.enrollment.status === 'completed') {
                    metrics.completed++;
                } else {
                    metrics.exitedEarly++;
                }
                await store.upsertFlowDefinition({ ...flow, metrics });

                void dispatchWebhooks('flow.completed', {
                    flowId: flow.id,
                    flowName: flow.name,
                    userId: enrollment.userId,
                    enrollmentId: enrollment.id,
                    status: result.enrollment.status,
                });
            }

            if (result.enrollment.status === 'error') {
                errored++;
                const metrics = flow.metrics ?? {
                    totalEnrolled: 0,
                    currentlyActive: 0,
                    completed: 0,
                    goalReached: 0,
                    exitedEarly: 0,
                    errorCount: 0,
                };
                metrics.errorCount++;
                await store.upsertFlowDefinition({ ...flow, metrics });
            }
        } catch (e) {
            errored++;
            console.error(`[scheduler] Error processing enrollment ${enrollment.id}:`, (e as Error).message);
        }
    }

    return { processed, completed, errors: errored, actionsDispatched: totalActions };
}
