/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * Event Processing Pipeline â€” The Central Nervous System
 *
 * When an SDK event arrives, this pipeline orchestrates ALL downstream
 * processing in the correct order:
 *
 *  1. Lifecycle reclassification   â†’ Re-evaluate user's lifecycle state
 *  2. Churn risk re-scoring        â†’ Update risk score if state changed
 *  3. Expansion signal detection   â†’ Detect upsell opportunities
 *  4. Segment re-evaluation        â†’ Update segment memberships
 *  5. Flow enrollment check        â†’ Enroll user in matching flows
 *  6. Active flow advancement      â†’ Process any waiting enrollments
 *  7. Webhook dispatch             â†’ Notify external systems
 *  8. Activity log                 â†’ Record significant events
 *
 * The pipeline is idempotent per event (dedup by messageId happens
 * upstream in the ingest layer). Processing is synchronous within a
 * single event but non-blocking for webhook delivery (fire-and-forget
 * with retry handled by the webhook engine).
 *
 * All data access flows through the DB operations layer with full
 * multi-tenant isolation via orgId.
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

import {
    getTrackedUserByExternalId,
    getTrackedUser,
    updateTrackedUser,
    upsertTrackedUser,
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
    getEvents as dbGetEvents,
    linkOrphanedEvents,
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

/* â”€â”€ Pipeline Result Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Pipeline Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

    try {
        return await processEventInner(event, orgId, result, errors, now, start);
    } catch (e) {
        // Top-level safety net â€” no event should crash the pipeline
        errors.push(`pipeline_fatal: ${(e as Error).message}`);
        console.error(`[event-pipeline] Fatal error processing event ${event.id}:`, e);
        result.processingTimeMs = Date.now() - start;
        return result;
    }
}

/** Inner pipeline logic â€” separated for the top-level error boundary */
async function processEventInner(
    event: StoredEvent,
    orgId: string,
    result: PipelineResult,
    errors: string[],
    now: string,
    start: number,
): Promise<PipelineResult> {
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
        // Auto-create the user so events are never silently dropped.
        // This ensures tracking works even if SDK calls track() before identify().
        const autoCreated = await autoCreateUserFromEvent(orgId, event.userId, event);
        if (!autoCreated) {
            // Truly could not create - dispatch webhook and bail
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

        // Continue processing with the auto-created user
        // (the full pipeline below will run lifecycle, churn, etc.)
        const { user: autoUser, internalId: autoId, accountInternalId: autoAccountId } = autoCreated;
        return processEventInnerWithUser(event, orgId, result, errors, now, start, autoUser, autoId, autoAccountId);
    }

    const { user, internalId, accountInternalId } = loaded;
    return processEventInnerWithUser(event, orgId, result, errors, now, start, user, internalId, accountInternalId);
}

/** Full pipeline processing for a resolved user (Stages 0-9) */
async function processEventInnerWithUser(
    event: StoredEvent,
    orgId: string,
    result: PipelineResult,
    errors: string[],
    now: string,
    start: number,
    user: User,
    internalId: string,
    accountInternalId: string | null,
): Promise<PipelineResult> {
    /* ── Stage 0: Update Behavioral Metrics from Event Data ──────── */
    /*
     * THIS IS THE HEART OF THE TRACKING SYSTEM.
     * When events arrive, we must update the user's behavioral metrics
     * so the lifecycle engine, churn scoring, and expansion detection
     * operate on accurate, real-time data - not stale initial values.
     *
     * Supported event types:
     *   signup             → set signupDate
     *   login/session_start → update lastLoginAt, increment login frequencies
     *   session_end        → update sessionDepthMinutes
     *   feature_used       → append to featureUsage30d
     *   page/page_viewed   → update lastLoginAt (activity proxy)
     *   plan_changed etc   → update plan, mrr
     *   nps_submitted      → update npsScore
     *   support_ticket     → increment supportTickets30d
     *   api_call           → increment apiCalls30d
     *   seat_added/removed → update seatCount
     */
    try {
        const metricUpdates = computeBehavioralMetricUpdates(event, user);
        if (Object.keys(metricUpdates).length > 0) {
            await updateTrackedUser(orgId, internalId, metricUpdates);
        }
    } catch (e) {
        errors.push(`behavioral_metrics: ${(e as Error).message}`);
    }


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

    /* â”€â”€ Stage 2: Churn Risk Re-scoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Stage 3: Expansion Signal Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
                                signal: opp.signal as 'seat_cap' | 'plan_limit' | 'heavy_usage' | 'api_throttle' | 'feature_gate',
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

    /* â”€â”€ Stage 4: Segment Re-evaluation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    try {
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser) {
            const userRecord = flattenUserForSegment(freshUser);

            // Get all active segment definitions from DB
            const segments = (await getAllSegments(orgId, 'active')).items;
            const segmentsEntered: string[] = [];
            const segmentsExited: string[] = [];

            for (const seg of segments) {
                const filters = (seg.filters ?? []) as import('@/lib/db/schema').SegmentFilter[];
                if (filters.length === 0) continue;

                const filterLogic = ((seg as Record<string, unknown>).filterLogic as string) ?? 'AND';
                const matched = evaluateSegmentFilters(filters, filterLogic, userRecord);
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

    /* â”€â”€ Stage 5: Flow Enrollment Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    try {
        const freshUser = await reloadUser(orgId, internalId);
        if (freshUser) {
            const activeFlows = (await getAllFlowDefinitions(orgId, 'active')).items;
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

                // Create enrollment and process through trigger â†’ first action
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
                    metrics: JSON.parse(JSON.stringify(metrics)),
                });

                // Process the enrollment through the trigger node â†’ next nodes
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
                        metrics: JSON.parse(JSON.stringify(metrics)),
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

    /* â”€â”€ Stage 6: Advance Waiting Flow Enrollments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Stage 7: Lifecycle Change Webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Stage 8: Event Tracked Webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Stage 9: Activity Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    try {
        // Log lifecycle transitions
        if (result.lifecycle?.transitioned) {
            await addActivityEntry(orgId, {
                type: 'lifecycle_change',
                title: 'Lifecycle State Change',
                description: `${user.name} moved from ${result.lifecycle.from} â†’ ${result.lifecycle.to}`,
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

/* â”€â”€ Batch Processing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Helper: Build TriggerEvent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Helper: Flatten User for Segment Evaluation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* ── Helper: Compute Behavioral Metric Updates ────────────────────── */

/**
 * Analyze an incoming event and return the set of tracked user field
 * updates that should be applied BEFORE lifecycle reclassification.
 *
 * This is critical: without these updates, the lifecycle engine reads
 * stale data and cannot accurately classify users.  Every behavioral
 * event type has specific metric side-effects defined here.
 *
 * The returned object only contains keys that need updating - callers
 * should merge it into a partial update (no full upsert).
 */
function computeBehavioralMetricUpdates(
    event: StoredEvent,
    user: User,
): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    const eventName = event.event.toLowerCase().replace(/^\$/, '');
    const props = (event.properties ?? {}) as Record<string, unknown>;
    const now = new Date();

    // ── Helper: normalize event name variants ────────────────────
    const isOneOf = (...names: string[]) => names.some(n => eventName === n || eventName === n.replace(/_/g, ''));

    // ── Signup Events ────────────────────────────────────────────
    if (isOneOf('signup', 'signed_up', 'user_created', 'registration_completed', 'account_created')) {
        if (!user.signupDate) {
            updates.signupDate = event.timestamp ? new Date(event.timestamp) : now;
        }
        // Also treat as a login
        updates.lastLoginAt = now;
        updates.loginFrequency7d = (user.loginFrequencyLast7Days ?? 0) + 1;
        updates.loginFrequency30d = (user.loginFrequencyLast30Days ?? 0) + 1;
    }

    // ── Login / Session Start Events ─────────────────────────────
    else if (isOneOf('login', 'logged_in', 'session_start', 'session_started', 'signed_in', 'auth_success')) {
        updates.lastLoginAt = now;
        updates.loginFrequency7d = (user.loginFrequencyLast7Days ?? 0) + 1;
        updates.loginFrequency30d = (user.loginFrequencyLast30Days ?? 0) + 1;
    }

    // ── Session End / Duration Events ────────────────────────────
    else if (isOneOf('session_end', 'session_ended', 'session', 'session_complete')) {
        const duration = typeof props.duration === 'number'
            ? props.duration
            : typeof props.durationMinutes === 'number'
                ? props.durationMinutes
                : typeof props.duration_minutes === 'number'
                    ? props.duration_minutes
                    : typeof props.durationMs === 'number'
                        ? props.durationMs / 60_000
                        : typeof props.duration_ms === 'number'
                            ? props.duration_ms / 60_000
                            : typeof props.sessionLength === 'number'
                                ? props.sessionLength
                                : null;

        if (duration !== null && duration > 0) {
            // Rolling average: approximate by weighting current value 70% and new 30%
            const current = user.sessionDepthMinutes ?? 0;
            const updated = current === 0
                ? Math.round(duration * 100) / 100
                : Math.round((current * 0.7 + duration * 0.3) * 100) / 100;
            updates.sessionDepthMinutes = updated;
        }
    }

    // ── Feature Usage Events ─────────────────────────────────────
    else if (isOneOf('feature_used', 'feature_activated', 'feature_accessed')) {
        const featureName = (props.feature ?? props.featureName ?? props.feature_name ?? props.name) as string | undefined;
        if (featureName && typeof featureName === 'string') {
            const existingFeatures = (user.featureUsageLast30Days ?? []) as string[];
            if (!existingFeatures.includes(featureName)) {
                updates.featureUsage30d = [...existingFeatures, featureName];
            }
        }
        // Feature usage implies activity
        updates.lastLoginAt = now;
    }

    // ── Page View Events ─────────────────────────────────────────
    else if (isOneOf('page', 'page_viewed', 'pageview', 'page_view', 'screen_viewed')) {
        // Page views are implicit activity signals
        updates.lastLoginAt = now;
    }

    // ── Subscription / Plan Change Events ────────────────────────
    else if (isOneOf(
        'subscription_upgraded', 'subscription_downgraded', 'subscription_changed',
        'plan_changed', 'plan_upgraded', 'plan_downgraded',
        'subscription_created', 'subscription_started',
    )) {
        if (props.plan || props.newPlan || props.toPlan || props.new_plan) {
            updates.plan = (props.plan ?? props.newPlan ?? props.toPlan ?? props.new_plan) as string;
        }
        if (typeof props.mrr === 'number') {
            updates.mrr = props.mrr;
        } else if (typeof props.newMrr === 'number') {
            updates.mrr = props.newMrr;
        } else if (typeof props.new_mrr === 'number') {
            updates.mrr = props.new_mrr;
        } else if (typeof props.amount === 'number') {
            updates.mrr = props.amount;
        }
    }

    // ── Subscription Cancelled ───────────────────────────────────
    else if (isOneOf('subscription_cancelled', 'subscription_canceled', 'churned', 'cancelled')) {
        updates.mrr = 0;
        if (props.plan || props.previousPlan) {
            // Keep the plan reference for historical context
        }
    }

    // ── NPS Events ───────────────────────────────────────────────
    else if (isOneOf('nps_submitted', 'nps_response', 'nps_scored', 'survey_completed')) {
        const score = typeof props.score === 'number'
            ? props.score
            : typeof props.npsScore === 'number'
                ? props.npsScore
                : typeof props.nps_score === 'number'
                    ? props.nps_score
                    : typeof props.rating === 'number'
                        ? props.rating
                        : null;
        if (score !== null && score >= 0 && score <= 10) {
            updates.npsScore = Math.round(score);
        }
    }

    // ── Support Ticket Events ────────────────────────────────────
    else if (isOneOf('support_ticket_created', 'ticket_created', 'support_request', 'help_requested')) {
        updates.supportTickets30d = (user.supportTicketsLast30Days ?? 0) + 1;
    }

    // ── Support Escalation Events ────────────────────────────────
    else if (isOneOf('support_escalated', 'ticket_escalated', 'escalation_created')) {
        updates.supportEscalations = (user.supportEscalations ?? 0) + 1;
        updates.supportTickets30d = (user.supportTicketsLast30Days ?? 0) + 1;
    }

    // ── API Usage Events ─────────────────────────────────────────
    else if (isOneOf('api_call', 'api_request', 'api_used', 'api_hit')) {
        const callCount = typeof props.count === 'number' ? props.count : 1;
        updates.apiCalls30d = (user.apiCallsLast30Days ?? 0) + callCount;
    }

    // ── Seat Management Events ───────────────────────────────────
    else if (isOneOf('seat_added', 'user_added', 'member_added', 'invite_accepted')) {
        updates.seatCount = (user.seatCount ?? 1) + 1;
    } else if (isOneOf('seat_removed', 'user_removed', 'member_removed')) {
        updates.seatCount = Math.max(1, (user.seatCount ?? 1) - 1);
    }

    // ── Activation Check ─────────────────────────────────────────
    // If metrics now meet activation criteria, set activatedDate
    if (!user.activatedDate) {
        const featureCount = updates.featureUsage30d
            ? (updates.featureUsage30d as string[]).length
            : (user.featureUsageLast30Days ?? []).length;
        const sessionDepth = typeof updates.sessionDepthMinutes === 'number'
            ? updates.sessionDepthMinutes
            : (user.sessionDepthMinutes ?? 0);

        if (featureCount >= 3 && sessionDepth >= 10) {
            updates.activatedDate = now;
        }
    }

    return updates;
}

/**
 * Auto-create a tracked user when events arrive for an externalId
 * that has not yet been identify()'d.  This ensures no events are
 * silently dropped - the user is created in "Lead" state with
 * whatever information we can extract from the event properties.
 */
async function autoCreateUserFromEvent(
    orgId: string,
    externalUserId: string,
    event: StoredEvent,
): Promise<{
    user: User;
    internalId: string;
    accountInternalId: string | null;
} | null> {
    const props = (event.properties ?? {}) as Record<string, unknown>;
    const now = new Date();

    // Try to resolve account if provided
    let dbAccountId: string | undefined;
    const extAccountId = (props.accountId ?? event.accountId) as string | undefined;
    if (extAccountId) {
        const dbAccount = await getTrackedAccountByExternalId(orgId, extAccountId);
        if (dbAccount) {
            dbAccountId = dbAccount.id;
        }
    }

    const isSignup = ['signup', 'signed_up', 'user_created', 'registration_completed', 'account_created']
        .includes(event.event.toLowerCase().replace(/^\$/, ''));

    const dbUser = await upsertTrackedUser(orgId, {
        externalId: externalUserId,
        email: (props.email as string) || undefined,
        name: (props.name as string) || (props.userName as string) || (props.user_name as string) || 'Unknown User',
        accountId: dbAccountId,
        lifecycleState: 'Lead' as const,
        mrr: 0,
        plan: (props.plan as string) || 'Trial',
        signupDate: isSignup ? now : undefined,
        lastLoginAt: now,
        loginFrequency7d: 1,
        loginFrequency30d: 1,
        featureUsage30d: [],
        sessionDepthMinutes: 0,
        churnRiskScore: 15,
        expansionScore: 0,
        seatCount: 1,
        seatLimit: typeof props.seatLimit === 'number' ? props.seatLimit : 3,
        apiCalls30d: 0,
        apiLimit: typeof props.apiLimit === 'number' ? props.apiLimit : 500,
    });

    // Link any orphaned events for this externalId
    try {
        await linkOrphanedEvents(orgId, externalUserId, dbUser.id);
    } catch {
        // Non-critical - events still exist, just not linked
    }

    // Log the auto-creation
    await addActivityEntry(orgId, {
        type: 'account_event',
        title: 'User Auto-Created from Event',
        description: `User ${externalUserId} auto-created from "${event.event}" event`,
        trackedUserId: dbUser.id,
        accountId: dbAccountId,
    });

    // Resolve account name
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

/* â”€â”€ Helper: Dispatch Flow Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
                        orgId,
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
                            ...(props.lifecycleState ? { lifecycleState: props.lifecycleState as 'Lead' | 'Trial' | 'Activated' | 'PowerUser' | 'ExpansionReady' | 'AtRisk' | 'Churned' | 'Reactivated' } : {}),
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

/* â”€â”€ Flow Scheduler: Process Due Enrollments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
                    metrics: JSON.parse(JSON.stringify(metrics)),
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
                    metrics: JSON.parse(JSON.stringify(metrics)),
                });
            }
        } catch (e) {
            errored++;
            console.error(`[scheduler] Error processing enrollment ${dbEnrollment.id}:`, (e as Error).message);
        }
    }

    return { processed, completed, errors: errored, actionsDispatched: totalActions };
}
