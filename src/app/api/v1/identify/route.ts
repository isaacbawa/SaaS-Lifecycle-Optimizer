/* ==========================================================================
 * POST /api/v1/identify - User Identification Endpoint
 *
 * Upserts a tracked user with traits from the SDK identify() call.
 * Writes directly to PostgreSQL via Drizzle ORM.
 * Runs the lifecycle engine and dispatches webhooks on state transitions.
 * ========================================================================== */

import { NextRequest } from 'next/server';
import { authenticate, apiSuccess, apiError, apiValidationError } from '@/lib/api/auth';
import { validateIdentify } from '@/lib/api/validation';
import {
  getTrackedUserByExternalId,
  upsertTrackedUser,
  updateTrackedUser,
  getTrackedAccountByExternalId,
  getTrackedAccount,
  addActivityEntry,
  linkOrphanedEvents,
  mergeTrackedUserIdentity,
  getAllSegments,
  upsertSegmentMembership,
  removeSegmentMembership,
  getAllFlowDefinitions,
  getUserEnrollments as dbGetUserEnrollments,
  upsertEnrollment as dbUpsertEnrollment,
  upsertFlowDefinition as dbUpsertFlowDefinition,
} from '@/lib/db/operations';
import { mapTrackedUserToUser, mapTrackedAccountToAccount, mapFlowDefToUI, mapFlowEnrollToUI } from '@/lib/db/mappers';
import { classifyLifecycleState } from '@/lib/engine/lifecycle';
import { scoreChurnRisk } from '@/lib/engine/churn';
import { detectExpansionSignals, computeExpansionScore } from '@/lib/engine/expansion';
import { evaluateSegmentFilters } from '@/lib/engine/segmentation';
import { dispatchWebhooks } from '@/lib/engine/webhooks';
import { sendEmail } from '@/lib/engine/email';
import {
  matchesTrigger,
  createEnrollment,
  processEnrollment,
  findTriggerNode,
} from '@/lib/engine/flow';
import type { LifecycleState, User } from '@/lib/definitions';

export async function POST(request: NextRequest) {
  // ── Auth (identify scope, standard rate tier) ─────────────────
  const auth = await authenticate(request, ['identify'], 'standard');
  if (!auth.success) return auth.response;

  const orgId = auth.orgId;
  if (!orgId) {
    return apiError('ORG_NOT_FOUND', 'No organization associated with this API key.', 400);
  }

  // ── Parse & validate ──────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const validation = validateIdentify(raw);
  if (!validation.valid) {
    return apiValidationError(validation.errors);
  }

  const { userId, traits, visitor: visitorSnapshot, anonymousId } = validation.data;
  const now = new Date();

  // ── Look up or create tracked user in DB ──────────────────────
  const existing = await getTrackedUserByExternalId(orgId, userId);
  const anonymousExisting = anonymousId && anonymousId !== userId
    ? await getTrackedUserByExternalId(orgId, anonymousId)
    : null;
  const isNew = !existing && !anonymousExisting;

  // Resolve account reference (if accountId trait provided)
  let dbAccountId: string | undefined;
  let accountName = 'Unknown Account';
  if (traits.accountId) {
    const account = await getTrackedAccountByExternalId(orgId, traits.accountId as string);
    if (account) {
      dbAccountId = account.id;
      accountName = account.name;
    }
  } else if (existing?.accountId || anonymousExisting?.accountId) {
    dbAccountId = existing?.accountId ?? anonymousExisting?.accountId ?? undefined;
    if (dbAccountId) {
      const account = await getTrackedAccount(orgId, dbAccountId);
      if (account) {
        accountName = account.name;
      }
    }
  }

  const currentUser = existing ?? anonymousExisting ?? undefined;
  const name = (traits.name as string) || currentUser?.name || 'Unknown User';

  const mergedProperties: Record<string, unknown> = {
    ...((anonymousExisting?.properties as Record<string, unknown> | undefined) ?? {}),
    ...((currentUser?.properties as Record<string, unknown> | undefined) ?? {}),
  };
  if (visitorSnapshot) {
    mergedProperties.visitor = visitorSnapshot;
    mergedProperties.attribution = visitorSnapshot.source;
    mergedProperties.firstSeenAt = visitorSnapshot.firstSeenAt;
    mergedProperties.lastSeenAt = visitorSnapshot.lastSeenAt;
    mergedProperties.landingPage = visitorSnapshot.landingPage;
    mergedProperties.landingUrl = visitorSnapshot.landingUrl;
    mergedProperties.pageCount = visitorSnapshot.pageCount;
    mergedProperties.pagesVisited = visitorSnapshot.pagesVisited;
  }

  const upsertData = {
    id: currentUser?.id,
    externalId: userId,
    email: (traits.email as string) || currentUser?.email || undefined,
    name,
    accountId: dbAccountId ?? currentUser?.accountId ?? undefined,
    lifecycleState: currentUser?.lifecycleState ?? ('Lead' as const),
    previousState: currentUser?.previousState,
    mrr: currentUser?.mrr ?? 0,
    plan: (traits.plan as string) || currentUser?.plan || 'Trial',
    signupDate: (traits.createdAt ? new Date(traits.createdAt as string) : null) ?? currentUser?.signupDate ?? now,
    lastLoginAt: currentUser?.lastLoginAt ?? now,
    loginFrequency7d: currentUser?.loginFrequency7d ?? 1,
    loginFrequency30d: currentUser?.loginFrequency30d ?? 1,
    featureUsage30d: currentUser?.featureUsage30d ?? [],
    sessionDepthMinutes: currentUser?.sessionDepthMinutes ?? 0,
    churnRiskScore: currentUser?.churnRiskScore ?? 15,
    expansionScore: currentUser?.expansionScore ?? 0,
    seatCount: currentUser?.seatCount ?? 1,
    seatLimit: currentUser?.seatLimit ?? 3,
    apiCalls30d: currentUser?.apiCalls30d ?? 0,
    apiLimit: currentUser?.apiLimit ?? 500,
    properties: Object.keys(mergedProperties).length > 0 ? mergedProperties : undefined,
  };

  // Upsert or merge tracked user
  const dbUser = anonymousId && anonymousId !== userId
    ? await mergeTrackedUserIdentity(orgId, anonymousId, userId, upsertData)
    : await upsertTrackedUser(orgId, upsertData);

  if (!dbUser) {
    return apiError('USER_MERGE_FAILED', 'Unable to resolve the tracked user record.', 500);
  }

  // Activity log for new users
  if (anonymousExisting && !existing) {
    await addActivityEntry(orgId, {
      type: 'account_event',
      title: 'Visitor Captured',
      description: `${name} converted from anonymous visitor to identified lead`,
      trackedUserId: dbUser.id,
      accountId: dbAccountId ?? undefined,
    });
  } else if (isNew) {
    await addActivityEntry(orgId, {
      type: 'account_event',
      title: 'New User Identified',
      description: `${name} identified via SDK`,
      trackedUserId: dbUser.id,
      accountId: dbAccountId ?? undefined,
    });
  }

  // ── Convert to UI User type for engine processing ─────────────
  let user = mapTrackedUserToUser(dbUser, accountName);

  // ── Classify Lifecycle State ──────────────────────────────────
  const classification = classifyLifecycleState(user);
  const stateChanged = classification.state !== user.lifecycleState;

  // ── Score Churn Risk ──────────────────────────────────────────
  const churnResult = scoreChurnRisk(user);

  // ── Expansion Scan ────────────────────────────────────────────
  let expansionScore = user.expansionScore ?? 0;
  if (dbAccountId) {
    const dbAccount = await getTrackedAccount(orgId, dbAccountId);
    if (dbAccount) {
      const account = mapTrackedAccountToAccount(dbAccount);
      const signals = detectExpansionSignals(user, account);
      expansionScore = computeExpansionScore(signals);
    }
  }

  // ── Apply ALL computed updates in a single call to avoid overwrite ──
  const computedUpdates: Record<string, unknown> = {
    churnRiskScore: churnResult.riskScore,
    expansionScore,
  };
  if (stateChanged) {
    computedUpdates.lifecycleState = classification.state;
    computedUpdates.previousState = user.lifecycleState;
    computedUpdates.stateChangedAt = now;
  }
  await updateTrackedUser(orgId, dbUser.id, computedUpdates);

  // Refresh user object with all updates applied
  const refreshedDb = await getTrackedUserByExternalId(orgId, userId);
  if (refreshedDb) {
    user = mapTrackedUserToUser(refreshedDb, accountName);
  } else {
    user = { ...user, ...(stateChanged ? { lifecycleState: classification.state, previousState: user.lifecycleState } : {}), churnRiskScore: churnResult.riskScore, expansionScore };
  }

  // ── Link orphaned events (events that arrived before this identify) ──
  try {
    await linkOrphanedEvents(orgId, userId, dbUser.id);
    if (anonymousId && anonymousId !== userId) {
      await linkOrphanedEvents(orgId, anonymousId, dbUser.id);
    }
  } catch {
    // Non-critical - events still exist, just not linked to user
  }

  // ── Segment Evaluation ────────────────────────────────────────
  let segmentsEntered: string[] = [];
  let segmentsExited: string[] = [];
  try {
    const userRecord = flattenUserForSegment(user);
    const segments = (await getAllSegments(orgId, 'active')).items;
    for (const seg of segments) {
      const filters = (seg.filters ?? []) as import('@/lib/db/schema').SegmentFilter[];
      if (filters.length === 0) continue;
      const filterLogic = ((seg as Record<string, unknown>).filterLogic as string) ?? 'AND';
      const matched = evaluateSegmentFilters(filters, filterLogic, userRecord);
      if (matched) {
        await upsertSegmentMembership(orgId, seg.id, dbUser.id);
        segmentsEntered.push(seg.name);
      } else {
        await removeSegmentMembership(orgId, seg.id, dbUser.id);
        segmentsExited.push(seg.name);
      }
    }
  } catch (e) {
    console.error('[identify] Segment evaluation error:', (e as Error).message);
  }

  // ── Flow Enrollment (lifecycle_change trigger) ────────────────
  let flowEnrollments = 0;
  if (stateChanged) {
    try {
      const activeFlows = (await getAllFlowDefinitions(orgId, 'active')).items;
      for (const dbFlow of activeFlows) {
        const flow = mapFlowDefToUI(dbFlow);
        const triggerNode = findTriggerNode(flow);
        if (!triggerNode || !triggerNode.data.triggerConfig) continue;

        // Build lifecycle_change trigger event
        const triggerEvent = {
          type: 'lifecycle_change' as const,
          fromState: user.previousState ?? 'Lead',
          toState: classification.state,
          userId: user.id,
          accountId: user.account?.id,
        };

        if (!matchesTrigger(triggerNode.data.triggerConfig, triggerEvent)) continue;

        // Check existing enrollments
        const existingEnrollments = await dbGetUserEnrollments(orgId, dbUser.id);
        const alreadyEnrolled = existingEnrollments.some(
          (e) => e.flowId === flow.id && (e.status === 'active' || e.status === 'paused'),
        );
        if (alreadyEnrolled) continue;

        const hasCompleted = existingEnrollments.some(
          (e) => e.flowId === flow.id && (e.status === 'completed' || e.status === 'exited'),
        );
        if (hasCompleted) continue;

        // Create enrollment
        const enrollment = createEnrollment(flow, user.id, user.account?.id, user, {});
        if (!enrollment) continue;

        await dbUpsertEnrollment({
          id: enrollment.id,
          organizationId: orgId,
          flowId: enrollment.flowId,
          trackedUserId: dbUser.id,
          accountId: dbAccountId ?? undefined,
          flowVersion: enrollment.flowVersion ?? 1,
          status: enrollment.status,
          currentNodeId: enrollment.currentNodeId,
          variables: enrollment.variables,
          enrolledAt: new Date(enrollment.enrolledAt),
          lastProcessedAt: enrollment.lastProcessedAt ? new Date(enrollment.lastProcessedAt) : undefined,
          nextProcessAt: enrollment.nextProcessAt ? new Date(enrollment.nextProcessAt) : undefined,
          history: enrollment.history,
        });
        flowEnrollments++;

        // Process the enrollment
        const processResult = processEnrollment({ flow, enrollment, user });
        await dbUpsertEnrollment({
          id: processResult.enrollment.id,
          organizationId: orgId,
          flowId: processResult.enrollment.flowId,
          trackedUserId: dbUser.id,
          accountId: dbAccountId ?? undefined,
          flowVersion: processResult.enrollment.flowVersion ?? 1,
          status: processResult.enrollment.status,
          currentNodeId: processResult.enrollment.currentNodeId,
          variables: processResult.enrollment.variables,
          enrolledAt: new Date(processResult.enrollment.enrolledAt),
          lastProcessedAt: processResult.enrollment.lastProcessedAt ? new Date(processResult.enrollment.lastProcessedAt) : undefined,
          completedAt: processResult.enrollment.completedAt ? new Date(processResult.enrollment.completedAt) : undefined,
          nextProcessAt: processResult.enrollment.nextProcessAt ? new Date(processResult.enrollment.nextProcessAt) : undefined,
          history: processResult.enrollment.history,
        });

        // Update flow metrics
        const metrics = flow.metrics ?? {
          totalEnrolled: 0, currentlyActive: 0, completed: 0,
          goalReached: 0, exitedEarly: 0, errorCount: 0,
        };
        metrics.totalEnrolled++;
        metrics.currentlyActive++;
        if (processResult.enrollment.status === 'completed') {
          metrics.currentlyActive = Math.max(0, metrics.currentlyActive - 1);
          metrics.completed++;
        }
        await dbUpsertFlowDefinition(orgId, {
          id: dbFlow.id, name: dbFlow.name, description: dbFlow.description,
          status: dbFlow.status, nodes: dbFlow.nodes, edges: dbFlow.edges,
          variables: dbFlow.variables, settings: dbFlow.settings,
          metrics: JSON.parse(JSON.stringify(metrics)),
        });

        void dispatchWebhooks('flow.triggered', {
          flowId: flow.id, flowName: flow.name,
          userId: user.id, userName: user.name,
          enrollmentId: enrollment.id,
        }, orgId);
      }
    } catch (e) {
      console.error('[identify] Flow enrollment error:', (e as Error).message);
    }
  }

  // ── Lead Capture Flow Enrollment (anonymous visitor handoff) ───
  if (anonymousId && anonymousId !== userId && traits.email) {
    try {
      const activeFlows = (await getAllFlowDefinitions(orgId, 'active')).items;
      for (const dbFlow of activeFlows) {
        const flow = mapFlowDefToUI(dbFlow);
        const triggerNode = findTriggerNode(flow);
        if (!triggerNode || !triggerNode.data.triggerConfig) continue;

        const triggerEvent = {
          type: 'event_received' as const,
          eventName: 'lead_captured',
          eventProperties: {
            anonymousId,
            email: traits.email,
            source: 'identify',
          },
          userId: user.id,
          accountId: user.account?.id,
        };

        if (!matchesTrigger(triggerNode.data.triggerConfig, triggerEvent)) continue;

        const existingEnrollments = await dbGetUserEnrollments(orgId, dbUser.id);
        const alreadyEnrolled = existingEnrollments.some(
          (e) => e.flowId === flow.id && (e.status === 'active' || e.status === 'paused'),
        );
        if (alreadyEnrolled) continue;

        const hasCompleted = existingEnrollments.some(
          (e) => e.flowId === flow.id && (e.status === 'completed' || e.status === 'exited'),
        );
        if (hasCompleted) continue;

        const enrollment = createEnrollment(flow, user.id, user.account?.id, user, {});
        if (!enrollment) continue;

        await dbUpsertEnrollment({
          id: enrollment.id,
          organizationId: orgId,
          flowId: enrollment.flowId,
          trackedUserId: dbUser.id,
          accountId: dbAccountId ?? undefined,
          flowVersion: enrollment.flowVersion ?? 1,
          status: enrollment.status,
          currentNodeId: enrollment.currentNodeId,
          variables: enrollment.variables,
          enrolledAt: new Date(enrollment.enrolledAt),
          lastProcessedAt: enrollment.lastProcessedAt ? new Date(enrollment.lastProcessedAt) : undefined,
          nextProcessAt: enrollment.nextProcessAt ? new Date(enrollment.nextProcessAt) : undefined,
          history: enrollment.history,
        });
        flowEnrollments++;

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

        const processResult = processEnrollment({ flow, enrollment, user });
        await dbUpsertEnrollment({
          id: processResult.enrollment.id,
          organizationId: orgId,
          flowId: processResult.enrollment.flowId,
          trackedUserId: dbUser.id,
          accountId: dbAccountId ?? undefined,
          flowVersion: processResult.enrollment.flowVersion ?? 1,
          status: processResult.enrollment.status,
          currentNodeId: processResult.enrollment.currentNodeId,
          variables: processResult.enrollment.variables,
          enrolledAt: new Date(processResult.enrollment.enrolledAt),
          lastProcessedAt: processResult.enrollment.lastProcessedAt ? new Date(processResult.enrollment.lastProcessedAt) : undefined,
          completedAt: processResult.enrollment.completedAt ? new Date(processResult.enrollment.completedAt) : undefined,
          nextProcessAt: processResult.enrollment.nextProcessAt ? new Date(processResult.enrollment.nextProcessAt) : undefined,
          history: processResult.enrollment.history,
        });
        for (const action of processResult.actions) {
          if (action.type !== 'send_email') continue;
          if (!user.email) continue;

          try {
            await sendEmail({
              to: action.to || user.email,
              subject: action.subject,
              html: action.body,
              fromName: action.fromName,
              replyTo: action.replyTo,
              orgId,
            });
          } catch (error) {
            console.error('[identify] Send email action error:', (error as Error).message);
          }
        }

        void dispatchWebhooks('flow.triggered', {
          flowId: flow.id,
          flowName: flow.name,
          userId: user.id,
          userName: user.name,
          enrollmentId: enrollment.id,
          trigger: 'lead_captured',
        }, orgId);

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
            userId: user.id,
            enrollmentId: enrollment.id,
            status: 'completed',
          }, orgId);
        }

      }
    } catch (e) {
      console.error('[identify] Lead capture flow error:', (e as Error).message);
    }
  }

  // ── Webhooks ──────────────────────────────────────────────────
  void dispatchWebhooks('user.identified', {
    userId,
    traits,
    isNew,
    lifecycleState: classification.state,
    timestamp: now.toISOString(),
  }, orgId);

  if (stateChanged) {
    void dispatchWebhooks('user.lifecycle_changed', {
      userId,
      previousState: user.previousState,
      newState: classification.state,
      account: user.account,
    }, orgId);
  }

  // ── Response ──────────────────────────────────────────────────
  const finalUser = await getTrackedUserByExternalId(orgId, userId);
  const finalMapped = finalUser ? mapTrackedUserToUser(finalUser, accountName) : user;

  return apiSuccess(
    {
      user: finalMapped,
      isNew,
      lifecycleState: classification.state,
      stateChanged,
      churnRisk: {
        score: churnResult.riskScore,
        tier: churnResult.riskTier,
      },
      segments: {
        entered: segmentsEntered,
        exited: segmentsExited,
      },
      flows: {
        enrolled: flowEnrollments,
      },
    },
    200,
    auth.startTime,
    auth.requestId,
    auth.rateLimit,
  );
}

/** Flatten user for segment filter evaluation */
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
