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
 * upstream in the ingest layer). Processing is synchronous within a
 * single event but non-blocking for webhook delivery (fire-and-forget
 * with retry handled by the webhook engine).
 *
 * All data access flows through the DB operations layer with full
 * multi-tenant isolation via orgId.
 * ═══════════════════════════════════════════════════════════════════════ */

import {
    getTrackedUserByExternalId,
    getTrackedUser,
    updateTrackedUser,
    getTrackedAccount,
    getTrackedAccountByExternalId,
    getAllFlowDefinitions,
    getFlowDefinition as dbGetFlowDefinition,
    getUserEnrollments as dbGetUserEnrollments,
    upsertEnrollment as dbUpsertEnrollment,
    upsertFlowDefinition as dbUpsertFlowDefinition,
    getExpansionOpportunities as dbGetExpansionOpportunities,
    upsertExpansionOpportunity as dbUpsertExpansionOpportunity,
    addActivityEntry,
    getActiveEnrollmentsDue as dbGetActiveEnrollmentsDue,
    getAllSegments,
    upsertSegmentMembership,
    removeSegmentMembership,
} from '@/lib/db/operations';
import {
    mapTrackedUserToUser,
    mapTrackedAccountToAccount,
    mapFlowDefToUI,
    mapFlowEnrollToUI,
} from '@/lib/db/mappers';
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
import { getEmailTemplate } from '@/lib/db/operations';
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

/* ── Internal helpers ───────────────────────────────────────────────── */

/**
 * Load a tracked user by externalId from DB and map to UI User type.
 * Returns null if user doesn't exist.
 */
async function loadUser(orgId: string, externalUserId: string): Promise<{
    user: User;
    internalId: string;
    accountInternalId: string | null;
} | null> {
    const dbUser = await getTrackedUserByExternalId(orgId, externalUserId);
    if (!dbUser) return null;

    // Resolve account name for the mapper
    let accountName: string | undefined;
    if (dbUser.accountId) {
        const dbAccount = await getTrackedAccount(orgId, dbUser.accountId);
        accountName = dbAccount?.name ?? undefined;
    }

    return {
        user: mapTrackedUserToUser(dbUser, accountName),
        internalId: dbUser.id,
        accountInternalId: dbUser.accountId,
    };
}

/**
 * Re-fetch a user from DB after updates. Uses internal UUID.
 */
async function reloadUser(orgId: string, internalId: string): Promise<User | null> {
    const dbUser = await getTrackedUser(orgId, internalId);
    if (!dbUser) return null;
    let accountName: string | undefined;
    if (dbUser.accountId) {
        const dbAccount = await getTrackedAccount(orgId, dbUser.accountId);
        accountName = dbAccount?.name ?? undefined;
    }
    return mapTrackedUserToUser(dbUser, accountName);
}

/* ── Pipeline Execution ─────────────────────────────────────────────── */

/**
 * Process a single event through the full pipeline.
 * Called after the event has been stored (dedup already handled).
 */
export async function processEvent(event: StoredEvent, orgId: string): Promise<PipelineResult> {
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
            }, orgId);
            result.webhooks.eventsDispatched = 1;
        } catch (e) {
            errors.push(`webhook_dispatch: ${(e as Error).message}`);
        }
        result.processingTimeMs = Date.now() - start;
        return result;
    }

    const loaded = await loadUser(orgId, event.userId);
    if (!loaded) {
        // Event references a user we haven't seen via identify() yet.
        try {
            void dispatchWebhooks('event.tracked', {
                event: event.event,
                userId: event.userId,
                accountId: event.accountId,
                properties: event.properties,
                timestamp: event.timestamp,
            }, orgId);
            result.webhooks.eventsDispatched = 1;
        } catch (e) {
            errors.push(`webhook_dispatch: ${(e as Error).message}`);
        }
        result.processingTimeMs = Date.now() - start;
        return result;
    }

    const { user, internalId, accountInternalId } = loaded;

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
            await updateTrackedUser(orgId, internalId, {
                lifecycleState: transition.to,
                previousState: transition.from,
                stateChangedAt: new Date(),
            });
        }
    } catch (e) {
        errors.push(`lifecycle: ${(e as Error).message}`);
    }

    /* ── Stage 2: Churn Risk Re-scoring ───────────────────────────── */
    try {
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser) {
            const previousScore = freshUser.churnRiskScore ?? 0;
            const churnResult = scoreChurnRisk(freshUser);
            await updateTrackedUser(orgId, internalId, {
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
                }, orgId);
                result.webhooks.eventsDispatched++;
            }
        }
    } catch (e) {
        errors.push(`churn: ${(e as Error).message}`);
    }

    /* ── Stage 3: Expansion Signal Detection ──────────────────────── */
    try {
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser && accountInternalId) {
            const dbAccount = await getTrackedAccount(orgId, accountInternalId);
            if (dbAccount) {
                const account = mapTrackedAccountToAccount(dbAccount);
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
                    // Fetch existing expansion opps for de-duplication
                    const existingOpps = await dbGetExpansionOpportunities(orgId, 'identified');
                    for (const opp of opportunities) {
                        const alreadyExists = existingOpps.some(
                            (e) =>
                                e.accountId === accountInternalId &&
                                e.signal === opp.signal &&
                                e.status === 'identified',
                        );
                        if (!alreadyExists) {
                            await dbUpsertExpansionOpportunity(orgId, {
                                accountId: accountInternalId,
                                signal: opp.signal as 'seat_usage_high' | 'feature_limit_approaching' | 'api_usage_growing' | 'nps_promoter' | 'usage_spike' | 'plan_downgrade_risk',
                                signalDescription: opp.signalDescription,
                                currentPlan: opp.currentPlan,
                                suggestedPlan: opp.suggestedPlan,
                                currentMrr: opp.currentMrr,
                                potentialMrr: opp.potentialMrr,
                                upliftMrr: opp.upliftMrr,
                                confidence: opp.confidence,
                                status: 'identified',
                            });
                            created++;

                            void dispatchWebhooks('account.expansion_signal', {
                                accountId: account.id,
                                accountName: account.name,
                                signal: opp.signal,
                                suggestedPlan: opp.suggestedPlan,
                                upliftMrr: opp.upliftMrr,
                                confidence: opp.confidence,
                            }, orgId);
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
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser) {
            const userRecord = flattenUserForSegment(freshUser);

            // Get all active segment definitions from DB
            const segments = await getAllSegments(orgId, 'active');
            const segmentsEntered: string[] = [];
            const segmentsExited: string[] = [];

            for (const seg of segments) {
                const filters = (seg.filters as Record<string, unknown>[]) ?? [];
                if (filters.length === 0) continue;

                const matched = evaluateSegmentFilters(filters, userRecord);
                if (matched) {
                    await upsertSegmentMembership(seg.id, internalId);
                    segmentsEntered.push(seg.name);
                } else {
                    await removeSegmentMembership(seg.id, internalId);
                    segmentsExited.push(seg.name);
                }
            }

            result.segments = {
                segmentsEvaluated: segments.length,
                entered: segmentsEntered,
                exited: segmentsExited,
            };
        }
    } catch (e) {
        errors.push(`segments: ${(e as Error).message}`);
    }

    /* ── Stage 5: Flow Enrollment Check ───────────────────────────── */
    try {
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser) {
            const activeFlows = await getAllFlowDefinitions(orgId, 'active');
            let enrollmentsCreated = 0;
            let actionsDispatched = 0;

            for (const dbFlow of activeFlows) {
                const flow = mapFlowDefToUI(dbFlow);
                const triggerNode = findTriggerNode(flow);
                if (!triggerNode || !triggerNode.data.triggerConfig) continue;

                // Build trigger event from the SDK event
                const triggerEvent = buildTriggerEvent(event, freshUser, result.lifecycle);
                if (!triggerEvent) continue;

                // Check if this flow's trigger matches
                if (!matchesTrigger(triggerNode.data.triggerConfig, triggerEvent)) continue;

                // Check if user is already enrolled in this flow (by internal UUID)
                const existingEnrollments = await dbGetUserEnrollments(orgId, internalId);
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

                // Persist enrollment to DB (map to DB fields)
                await dbUpsertEnrollment({
                    id: enrollment.id,
                    organizationId: orgId,
                    flowId: enrollment.flowId,
                    trackedUserId: internalId,
                    accountId: accountInternalId ?? undefined,
                    flowVersion: enrollment.flowVersion ?? 1,
                    status: enrollment.status,
                    currentNodeId: enrollment.currentNodeId,
                    variables: enrollment.variables,
                    enrolledAt: new Date(enrollment.enrolledAt),
                    lastProcessedAt: enrollment.lastProcessedAt ? new Date(enrollment.lastProcessedAt) : undefined,
                    nextProcessAt: enrollment.nextProcessAt ? new Date(enrollment.nextProcessAt) : undefined,
                    history: enrollment.history,
                });
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
                await dbUpsertFlowDefinition(orgId, {
                    id: dbFlow.id,
                    name: dbFlow.name,
                    description: dbFlow.description,
                    status: dbFlow.status,
                    nodes: dbFlow.nodes,
                    edges: dbFlow.edges,
                    variables: dbFlow.variables,
                    settings: dbFlow.settings,
                    metrics: metrics as Record<string, unknown>,
                });

                // Process the enrollment through the trigger node → next nodes
                const processResult = processEnrollment({
                    flow,
                    enrollment,
                    user: freshUser,
                });

                // Save updated enrollment
                await dbUpsertEnrollment({
                    id: processResult.enrollment.id,
                    organizationId: orgId,
                    flowId: processResult.enrollment.flowId,
                    trackedUserId: internalId,
                    accountId: accountInternalId ?? undefined,
                    flowVersion: processResult.enrollment.flowVersion ?? 1,
                    status: processResult.enrollment.status,
                    currentNodeId: processResult.enrollment.currentNodeId,
                    variables: processResult.enrollment.variables,
                    enrolledAt: new Date(processResult.enrollment.enrolledAt),
                    lastProcessedAt: processResult.enrollment.lastProcessedAt
                        ? new Date(processResult.enrollment.lastProcessedAt)
                        : undefined,
                    completedAt: processResult.enrollment.completedAt
                        ? new Date(processResult.enrollment.completedAt)
                        : undefined,
                    nextProcessAt: processResult.enrollment.nextProcessAt
                        ? new Date(processResult.enrollment.nextProcessAt)
                        : undefined,
                    history: processResult.enrollment.history,
                });

                // Dispatch actions produced by the flow
                const dispatched = await dispatchFlowActions(processResult.actions, freshUser, orgId);
                actionsDispatched += dispatched;

                // Dispatch flow.triggered webhook
                void dispatchWebhooks('flow.triggered', {
                    flowId: flow.id,
                    flowName: flow.name,
                    userId: freshUser.id,
                    userName: freshUser.name,
                    enrollmentId: enrollment.id,
                }, orgId);
                result.webhooks.eventsDispatched++;

                // Check if flow completed immediately
                if (processResult.enrollment.status === 'completed') {
                    metrics.currentlyActive = Math.max(0, metrics.currentlyActive - 1);
                    metrics.completed++;
                    await dbUpsertFlowDefinition(orgId, {
                        id: dbFlow.id,
                        name: dbFlow.name,
                        description: dbFlow.description,
                        status: dbFlow.status,
                        nodes: dbFlow.nodes,
                        edges: dbFlow.edges,
                        variables: dbFlow.variables,
                        settings: dbFlow.settings,
                        metrics: metrics as Record<string, unknown>,
                    });

                    void dispatchWebhooks('flow.completed', {
                        flowId: flow.id,
                        flowName: flow.name,
                        userId: freshUser.id,
                        enrollmentId: enrollment.id,
                        status: 'completed',
                    }, orgId);
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
            const userEnrollments = await dbGetUserEnrollments(orgId, internalId);
            const waitingForEvent = userEnrollments.filter(
                (e) => e.status === 'active' && e.nextProcessAt,
            );

            let advanced = 0;
            for (const dbEnrollment of waitingForEvent) {
                const dbFlow = await dbGetFlowDefinition(orgId, dbEnrollment.flowId);
                if (!dbFlow) continue;

                const freshUser = await reloadUser(orgId, internalId);
                if (!freshUser) continue;

                const flow = mapFlowDefToUI(dbFlow);
                const enrollment = mapFlowEnrollToUI(dbEnrollment);

                const processResult = processEnrollment({
                    flow,
                    enrollment,
                    user: freshUser,
                });

                if (processResult.enrollment.currentNodeId !== enrollment.currentNodeId) {
                    await dbUpsertEnrollment({
                        id: processResult.enrollment.id,
                        organizationId: orgId,
                        flowId: processResult.enrollment.flowId,
                        trackedUserId: internalId,
                        accountId: accountInternalId ?? undefined,
                        flowVersion: processResult.enrollment.flowVersion ?? 1,
                        status: processResult.enrollment.status,
                        currentNodeId: processResult.enrollment.currentNodeId,
                        variables: processResult.enrollment.variables,
                        enrolledAt: new Date(processResult.enrollment.enrolledAt),
                        lastProcessedAt: processResult.enrollment.lastProcessedAt
                            ? new Date(processResult.enrollment.lastProcessedAt)
                            : undefined,
                        completedAt: processResult.enrollment.completedAt
                            ? new Date(processResult.enrollment.completedAt)
                            : undefined,
                        nextProcessAt: processResult.enrollment.nextProcessAt
                            ? new Date(processResult.enrollment.nextProcessAt)
                            : undefined,
                        history: processResult.enrollment.history,
                    });
                    await dispatchFlowActions(processResult.actions, freshUser, orgId);
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
            const freshUser = await reloadUser(orgId, internalId);
            void dispatchWebhooks('user.lifecycle_changed', {
                userId: user.id,
                userName: freshUser?.name ?? user.name,
                previousState: result.lifecycle.from,
                newState: result.lifecycle.to,
                account: freshUser?.account ?? user.account,
                confidence: result.lifecycle.confidence,
            }, orgId);
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
        }, orgId);
        result.webhooks.eventsDispatched++;
    } catch (e) {
        errors.push(`event_webhook: ${(e as Error).message}`);
    }

    /* ── Stage 9: Activity Log ────────────────────────────────────── */
    try {
        // Log lifecycle transitions
        if (result.lifecycle?.transitioned) {
            await addActivityEntry(orgId, {
                type: 'lifecycle_change',
                title: 'Lifecycle State Change',
                description: `${user.name} moved from ${result.lifecycle.from} → ${result.lifecycle.to}`,
                trackedUserId: internalId,
                accountId: accountInternalId ?? undefined,
            });
        }

        // Log flow enrollments
        if (result.flows && result.flows.enrollmentsCreated > 0) {
            await addActivityEntry(orgId, {
                type: 'flow_triggered',
                title: 'Flow Enrollment',
                description: `${user.name} enrolled in ${result.flows.enrollmentsCreated} flow(s)`,
                trackedUserId: internalId,
                accountId: accountInternalId ?? undefined,
            });
        }

        // Log expansion signals
        if (result.expansion && result.expansion.opportunitiesCreated > 0) {
            await addActivityEntry(orgId, {
                type: 'expansion_signal',
                title: 'Expansion Opportunity',
                description: `${result.expansion.signalsDetected} expansion signal(s) detected for ${user.account?.name ?? user.name}`,
                trackedUserId: internalId,
                accountId: accountInternalId ?? undefined,
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
export async function processEventBatch(events: StoredEvent[], orgId: string): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    for (const event of events) {
        results.push(await processEvent(event, orgId));
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

/* ── Helper: Dispatch Flow Actions ──────────────────────────────────── */

/**
 * Execute the side-effect actions produced by flow node execution.
 * Returns the count of successfully dispatched actions.
 */
async function dispatchFlowActions(actions: TickAction[], user: User, orgId: string): Promise<number> {
    let dispatched = 0;

    for (const action of actions) {
        try {
            switch (action.type) {
                case 'send_email': {
                    let subject = action.subject;
                    let html = action.body;

                    // If a pre-built template is referenced, fetch from DB
                    if (action.templateId) {
                        try {
                            const tpl = await getEmailTemplate(orgId, action.templateId);
                            if (tpl) {
                                subject = subject || tpl.subject;
                                html = (tpl.bodyHtml as string) ?? html;
                            }
                        } catch {
                            // Fallback to inline subject/body if template fetch fails
                        }
                    }

                    await sendEmail({
                        to: action.to || user.email,
                        subject,
                        html,
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
                    // Update the tracked user in DB via externalId
                    const dbUser = await getTrackedUserByExternalId(orgId, action.userId);
                    if (dbUser) {
                        const props = action.properties as Record<string, unknown>;
                        await updateTrackedUser(orgId, dbUser.id, {
                            ...(props.lifecycleState ? { lifecycleState: props.lifecycleState as string } : {}),
                            ...(props.churnRiskScore !== undefined ? { churnRiskScore: props.churnRiskScore as number } : {}),
                            ...(props.expansionScore !== undefined ? { expansionScore: props.expansionScore as number } : {}),
                            ...(props.plan ? { plan: props.plan as string } : {}),
                            ...(props.tags ? { tags: props.tags as string[] } : {}),
                        });
                    }
                    dispatched++;
                    break;
                }

                case 'add_tag': {
                    await addActivityEntry(orgId, {
                        type: 'system',
                        title: `Tag added: ${action.tag}`,
                        description: `Tag "${action.tag}" added to user ${action.userId}`,
                        trackedUserId: undefined,
                    });
                    dispatched++;
                    break;
                }

                case 'remove_tag': {
                    await addActivityEntry(orgId, {
                        type: 'system',
                        title: `Tag removed: ${action.tag}`,
                        description: `Tag "${action.tag}" removed from user ${action.userId}`,
                    });
                    dispatched++;
                    break;
                }

                case 'set_variable': {
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
                    await addActivityEntry(orgId, {
                        type: 'system',
                        title: action.title,
                        description: action.body,
                    });
                    dispatched++;
                    break;
                }

                case 'create_task': {
                    await addActivityEntry(orgId, {
                        type: 'system',
                        title: `Task: ${action.title}`,
                        description: `Assigned to ${action.assignee ?? 'unassigned'} (${action.priority ?? 'normal'})`,
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
 *
 * Note: getActiveEnrollmentsDue() is cross-org. Each enrollment
 * carries its orgId so we can operate in the correct tenant context.
 */
export async function processScheduledEnrollments(): Promise<{
    processed: number;
    completed: number;
    errors: number;
    actionsDispatched: number;
}> {
    const dueEnrollments = await dbGetActiveEnrollmentsDue();
    let processed = 0;
    let completed = 0;
    let errored = 0;
    let totalActions = 0;

    for (const dbEnrollment of dueEnrollments) {
        try {
            const enrollmentOrgId = dbEnrollment.organizationId;

            const dbFlow = await dbGetFlowDefinition(enrollmentOrgId, dbEnrollment.flowId);
            if (!dbFlow || dbFlow.status !== 'active') {
                await dbUpsertEnrollment({
                    ...dbEnrollment,
                    status: 'exited',
                    completedAt: new Date(),
                    lastProcessedAt: new Date(),
                });
                continue;
            }

            const flow = mapFlowDefToUI(dbFlow);
            const enrollment = mapFlowEnrollToUI(dbEnrollment);

            // Resolve the user for this enrollment
            const dbUser = await getTrackedUser(enrollmentOrgId, dbEnrollment.trackedUserId);
            let user: User | undefined;
            if (dbUser) {
                let accountName: string | undefined;
                if (dbUser.accountId) {
                    const acct = await getTrackedAccount(enrollmentOrgId, dbUser.accountId);
                    accountName = acct?.name ?? undefined;
                }
                user = mapTrackedUserToUser(dbUser, accountName);
            }

            const processResult = processEnrollment({
                flow,
                enrollment: { ...enrollment, nextProcessAt: undefined },
                user,
            });

            // Persist updated enrollment
            await dbUpsertEnrollment({
                id: processResult.enrollment.id,
                organizationId: enrollmentOrgId,
                flowId: processResult.enrollment.flowId,
                trackedUserId: dbEnrollment.trackedUserId,
                accountId: dbEnrollment.accountId ?? undefined,
                flowVersion: processResult.enrollment.flowVersion ?? 1,
                status: processResult.enrollment.status,
                currentNodeId: processResult.enrollment.currentNodeId,
                variables: processResult.enrollment.variables,
                enrolledAt: new Date(processResult.enrollment.enrolledAt),
                lastProcessedAt: processResult.enrollment.lastProcessedAt
                    ? new Date(processResult.enrollment.lastProcessedAt)
                    : undefined,
                completedAt: processResult.enrollment.completedAt
                    ? new Date(processResult.enrollment.completedAt)
                    : undefined,
                nextProcessAt: processResult.enrollment.nextProcessAt
                    ? new Date(processResult.enrollment.nextProcessAt)
                    : undefined,
                history: processResult.enrollment.history,
            });

            // Dispatch actions
            if (user && processResult.actions.length > 0) {
                const dispatched = await dispatchFlowActions(processResult.actions, user, enrollmentOrgId);
                totalActions += dispatched;
            }

            processed++;

            // Update flow metrics
            if (processResult.enrollment.status === 'completed' || processResult.enrollment.status === 'exited') {
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
                if (processResult.enrollment.status === 'completed') {
                    metrics.completed++;
                } else {
                    metrics.exitedEarly++;
                }
                await dbUpsertFlowDefinition(enrollmentOrgId, {
                    id: dbFlow.id,
                    name: dbFlow.name,
                    description: dbFlow.description,
                    status: dbFlow.status,
                    nodes: dbFlow.nodes,
                    edges: dbFlow.edges,
                    variables: dbFlow.variables,
                    settings: dbFlow.settings,
                    metrics: metrics as Record<string, unknown>,
                });

                void dispatchWebhooks('flow.completed', {
                    flowId: flow.id,
                    flowName: flow.name,
                    userId: dbEnrollment.trackedUserId,
                    enrollmentId: dbEnrollment.id,
                    status: processResult.enrollment.status,
                }, enrollmentOrgId);
            }

            if (processResult.enrollment.status === 'error') {
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
                await dbUpsertFlowDefinition(enrollmentOrgId, {
                    id: dbFlow.id,
                    name: dbFlow.name,
                    description: dbFlow.description,
                    status: dbFlow.status,
                    nodes: dbFlow.nodes,
                    edges: dbFlow.edges,
                    variables: dbFlow.variables,
                    settings: dbFlow.settings,
                    metrics: metrics as Record<string, unknown>,
                });
            }
        } catch (e) {
            errored++;
            console.error(`[scheduler] Error processing enrollment ${dbEnrollment.id}:`, (e as Error).message);
        }
    }

    return { processed, completed, errors: errored, actionsDispatched: totalActions };
}
