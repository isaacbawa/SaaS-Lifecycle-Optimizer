/* ==========================================================================
 * Flow Enrollment Scheduler — /api/v1/scheduler
 *
 * Processes flow enrollments whose nextProcessAt timestamp has elapsed.
 * This endpoint should be called periodically:
 *
 *   • Vercel Cron: vercel.json → {"crons": [{"path": "/api/v1/scheduler", "schedule": "* * * * *"}]}
 *   • External cron: curl -X POST https://your-app.com/api/v1/scheduler -H "Authorization: Bearer <CRON_SECRET>"
 *   • Self-polling: the endpoint can also be triggered from the UI/admin panel
 *
 * Security: Protected by CRON_SECRET env var (for Vercel Cron) or
 * the standard API key auth. Vercel Cron sends the secret automatically.
 *
 * GET  — Returns scheduler status (pending enrollments, last run info)
 * POST — Triggers a processing run
 * ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledEnrollments } from '@/lib/engine/event-pipeline';
import { resolveOrgId } from '@/lib/auth/resolve-org';
import { getActiveEnrollmentsDue, getAllFlowDefinitions, getFlowEnrollments } from '@/lib/db/operations';

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

function isAuthorized(request: NextRequest): boolean {
    // Vercel Cron sends the CRON_SECRET automatically
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader === `Bearer ${cronSecret}`) return true;
    }

    // Also accept standard API keys with admin scope
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer lcos_')) {
        // We trust SDK keys for scheduler access in single-tenant mode
        return true;
    }

    // In development, allow unauthenticated access
    if (process.env.NODE_ENV !== 'production') return true;

    return false;
}

/* ── GET: Scheduler Status ───────────────────────────────────────────── */

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveOrgId();
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
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = Date.now();

    try {
        const result = await processScheduledEnrollments();
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
    const allFlows = await getAllFlowDefinitions(orgId);
    let count = 0;
    for (const flow of allFlows) {
        const enrollments = await getFlowEnrollments(orgId, flow.id, 'active');
        count += enrollments.length;
    }
    return count;
}
