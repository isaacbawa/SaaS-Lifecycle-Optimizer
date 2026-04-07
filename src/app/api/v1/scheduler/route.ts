/* ==========================================================================
 * Flow Enrollment Scheduler - /api/v1/scheduler
 *
 * Processes flow enrollments whose nextProcessAt timestamp has elapsed.
 * This endpoint should be called periodically:
 *
 *   • External cron: curl -X POST https://your-app.com/api/v1/scheduler -H "Authorization: Bearer <CRON_SECRET>"
 *   • Optional Vercel Cron (paid plans): add /api/v1/scheduler in vercel.json
 *   • Self-polling: the endpoint can also be triggered from the UI/admin panel
 *
 * Security: Protected by CRON_SECRET env var (for Vercel Cron) or
 * the standard API key auth. Vercel Cron sends the secret automatically.
 *
 * GET  - Returns scheduler status (pending enrollments, last run info)
 * POST - Triggers a processing run
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledEnrollments } from '@/lib/engine/event-pipeline';
import { resolveOrgId } from '@/lib/auth/resolve-org';
import { authenticate } from '@/lib/api/auth';
import { getActiveEnrollmentsDue, getAllFlowDefinitions, getFlowEnrollments } from '@/lib/db/operations';
import { processRetryQueue } from '@/lib/engine/email';

/* ── Scheduler State (survives HMR) ──────────────────────────────────── */

const G = globalThis as unknown as Record<string, unknown>;

interface SchedulerState {
    lastRunAt: string | null;
    lastRunDurationMs: number;
    lastRunProcessed: number;
    lastRunCompleted: number;
    lastRunErrors: number;
    totalRuns: number;
    totalProcessed: number;
}

if (!G.__scheduler_state__) {
    G.__scheduler_state__ = {
        lastRunAt: null,
        lastRunDurationMs: 0,
        lastRunProcessed: 0,
        lastRunCompleted: 0,
        lastRunErrors: 0,
        totalRuns: 0,
        totalProcessed: 0,
    } as SchedulerState;
}

const state = G.__scheduler_state__ as SchedulerState;

/* ── Auth Guard ──────────────────────────────────────────────────────── */

async function isAuthorized(request: NextRequest): Promise<{ authorized: boolean; orgId?: string }> {
    // Vercel Cron sends the CRON_SECRET automatically
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader === `Bearer ${cronSecret}`) {
            // CRON_SECRET is valid - resolve org from env or process all orgs
            try {
                const orgId = await resolveOrgId();
                return { authorized: true, orgId };
            } catch {
                // Cron context has no Clerk session, but is authorized
                return { authorized: true };
            }
        }
    }

    // Validate API key through the standard auth system
    const authResult = await authenticate(request, ['write']);
    if (authResult.success) {
        return { authorized: true, orgId: authResult.orgId };
    }

    return { authorized: false };
}

/* ── GET: Scheduler Status ───────────────────────────────────────────── */

export async function GET(request: NextRequest) {
    const auth = await isAuthorized(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId ?? await resolveOrgId();
    const pendingEnrollments = await getActiveEnrollmentsDue();
    const allEnrollments = await getAllActiveEnrollmentCount(orgId);

    return NextResponse.json({
        success: true,
        data: {
            pending: pendingEnrollments.length,
            totalActive: allEnrollments,
            scheduler: state,
            nextCheckRecommended: state.lastRunAt
                ? new Date(new Date(state.lastRunAt).getTime() + 60_000).toISOString()
                : 'now',
        },
    });
}

/* ── POST: Trigger Processing Run ────────────────────────────────────── */

export async function POST(request: NextRequest) {
    const auth = await isAuthorized(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = Date.now();

    try {
        // 1. Process flow enrollments
        const result = await processScheduledEnrollments();

        // 2. Process email retry queue (failed inline sends)
        let emailRetries = { processed: 0, sent: 0, failed: 0 };
        try {
            emailRetries = await processRetryQueue();
        } catch (emailErr) {
            console.error('[scheduler] Email retry queue error:', emailErr);
        }

        const durationMs = Date.now() - start;

        // Update scheduler state
        state.lastRunAt = new Date().toISOString();
        state.lastRunDurationMs = durationMs;
        state.lastRunProcessed = result.processed;
        state.lastRunCompleted = result.completed;
        state.lastRunErrors = result.errors;
        state.totalRuns++;
        state.totalProcessed += result.processed;

        return NextResponse.json({
            success: true,
            data: {
                processed: result.processed,
                completed: result.completed,
                errors: result.errors,
                actionsDispatched: result.actionsDispatched,
                emailRetries,
                durationMs,
                scheduler: state,
            },
        });
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: `Scheduler error: ${(e as Error).message}`,
            },
            { status: 500 },
        );
    }
}

/* ── Helper ──────────────────────────────────────────────────────────── */

async function getAllActiveEnrollmentCount(orgId: string): Promise<number> {
    // Count enrollments across all flows
    const allFlows = (await getAllFlowDefinitions(orgId)).items;
    let count = 0;
    for (const flow of allFlows) {
        const enrollments = await getFlowEnrollments(orgId, flow.id, 'active');
        count += enrollments.length;
    }
    return count;
}
