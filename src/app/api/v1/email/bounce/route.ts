/* ═══════════════════════════════════════════════════════════════════════
 * Email Bounce Webhook Route — Incoming Bounce & Complaint Processing
 *
 * POST /api/v1/email/bounce
 *
 * Receives bounce and complaint notifications from:
 *   • SMTP server bounce reports (forwarded)
 *   • ISP feedback loops (complaint reports)
 *   • Manual bounce imports
 *
 * Each notification is processed and added to the suppression list.
 * Authenticated via API key (same as other v1 routes).
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from 'next/server';
import { authenticate, apiError } from '@/lib/api/auth';
import {
    recordBounce,
    recordComplaint,
    addSuppression,
    getSuppressionStats,
    getAllSuppressions,
} from '@/lib/engine/email';

export const runtime = 'nodejs';

/**
 * POST — Process incoming bounce/complaint notifications.
 *
 * Body:
 * {
 *   "type": "bounce" | "complaint" | "invalid",
 *   "email": "user@example.com",
 *   "bounceType": "hard" | "soft" | "undetermined",
 *   "diagnosticCode": "550 5.1.1 User unknown",
 *   "feedbackType": "abuse" | "fraud" | "other",
 *   "source": "smtp_bounce_report"
 * }
 *
 * Batch:
 * {
 *   "batch": [
 *     { "type": "bounce", "email": "...", "bounceType": "hard" },
 *     { "type": "complaint", "email": "...", "feedbackType": "abuse" }
 *   ]
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
    // Authenticate
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

    // Support batch and single
    const items: Array<Record<string, unknown>> = Array.isArray(body.batch)
        ? (body.batch as Array<Record<string, unknown>>)
        : [body];

    const results: Array<{ email: string; action: string; reason: string }> = [];

    for (const item of items) {
        const email = item.email as string;
        if (!email || typeof email !== 'string') {
            results.push({ email: '(missing)', action: 'skipped', reason: 'No email provided' });
            continue;
        }

        const type = (item.type as string) ?? 'bounce';

        switch (type) {
            case 'bounce': {
                const bounceType = (item.bounceType as 'hard' | 'soft' | 'undetermined') ?? 'undetermined';
                const diagnosticCode = item.diagnosticCode as string | undefined;
                const source = (item.source as string) ?? 'bounce_webhook';
                recordBounce(email, bounceType, diagnosticCode, source);
                results.push({ email, action: 'bounced', reason: `${bounceType} bounce` });
                break;
            }

            case 'complaint': {
                const feedbackType = item.feedbackType as string | undefined;
                const source = (item.source as string) ?? 'complaint_webhook';
                recordComplaint(email, feedbackType, source);
                results.push({ email, action: 'complained', reason: feedbackType ?? 'abuse' });
                break;
            }

            case 'invalid': {
                addSuppression(email, 'invalid_address', (item.source as string) ?? 'validation');
                results.push({ email, action: 'invalidated', reason: 'invalid_address' });
                break;
            }

            default:
                results.push({ email, action: 'skipped', reason: `Unknown type: ${type}` });
        }
    }

    return NextResponse.json({
        success: true,
        processed: results.length,
        results,
    });
}

/**
 * GET — Retrieve suppression list and statistics.
 */
export async function GET(request: NextRequest): Promise<Response> {
    const authResult = await authenticate(request, ['read']);
    if (!authResult.success) {
        return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const includeList = searchParams.get('list') === 'true';

    const stats = getSuppressionStats();

    return NextResponse.json({
        success: true,
        stats,
        ...(includeList ? { suppressions: getAllSuppressions() } : {}),
    });
}
