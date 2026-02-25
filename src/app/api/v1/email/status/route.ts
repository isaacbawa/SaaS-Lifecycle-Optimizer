/* ═══════════════════════════════════════════════════════════════════════
 * Email System Status & Admin Route
 *
 * GET  /api/v1/email/status — System health, queue metrics, suppression stats
 * POST /api/v1/email/send   — Direct email send (for testing / admin)
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from 'next/server';
import { authenticate } from '@/lib/api/auth';
import {
    getEmailSystemStatus,
    sendEmail,
    getQueueMetrics,
    getSendLog,
    getEmailDLQ,
    getCampaignTrackingStats,
    getTrackingEvents,
} from '@/lib/engine/email';

export const runtime = 'nodejs';

/**
 * GET — Email system status dashboard data.
 *
 * Query params:
 *   ?include=sendLog     — Include recent send log
 *   ?include=dlq         — Include dead-letter queue
 *   ?include=tracking    — Include recent tracking events
 *   ?campaignId=xxx      — Get tracking stats for specific campaign
 */
export async function GET(request: NextRequest): Promise<Response> {
    const authResult = await authenticate(request, ['read']);
    if (!authResult.success) {
        return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const includes = searchParams.getAll('include');
    const campaignId = searchParams.get('campaignId');

    const status = await getEmailSystemStatus();

    const response: Record<string, unknown> = {
        success: true,
        ...status,
    };

    if (includes.includes('sendLog')) {
        response.sendLog = getSendLog(50);
    }

    if (includes.includes('dlq')) {
        response.dlq = getEmailDLQ();
    }

    if (includes.includes('tracking')) {
        response.trackingEvents = getTrackingEvents(50);
    }

    if (campaignId) {
        response.campaignTracking = getCampaignTrackingStats(campaignId);
    }

    return NextResponse.json(response);
}

/**
 * POST — Send a test email or admin-triggered email.
 *
 * Body:
 * {
 *   "to": "user@example.com",
 *   "subject": "Test Email",
 *   "html": "<h1>Hello!</h1><p>This is a test.</p>",
 *   "text": "Hello! This is a test.",
 *   "priority": "high",
 *   "campaignId": "test_123"
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
    const authResult = await authenticate(request, ['write']);
    if (!authResult.success) {
        return authResult.response!;
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    const to = body.to as string;
    const subject = body.subject as string;
    const html = body.html as string;

    if (!to || !subject || !html) {
        return NextResponse.json(
            { success: false, error: 'Missing required fields: to, subject, html' },
            { status: 400 },
        );
    }

    const result = await sendEmail({
        to,
        subject,
        html,
        text: body.text as string | undefined,
        fromName: body.fromName as string | undefined,
        fromEmail: body.fromEmail as string | undefined,
        replyTo: body.replyTo as string | undefined,
        campaignId: body.campaignId as string | undefined,
        userId: body.userId as string | undefined,
        priority: (body.priority as 'critical' | 'high' | 'normal' | 'low' | 'bulk') ?? 'high',
    });

    return NextResponse.json({
        success: result.success,
        queueId: result.queueId,
        messageId: result.messageId,
        provider: result.provider,
        ...(result.error ? { error: result.error } : {}),
        ...(result.suppressed ? { suppressed: true } : {}),
    });
}
