/* ═══════════════════════════════════════════════════════════════════════
 * Email Tracking Route — Open Pixel & Click Redirect
 *
 * GET /api/v1/email/track?t=<token>
 *
 * Handles two types of tracking, determined by the token payload:
 *
 *   • type=open  → Records open event, returns 1x1 transparent GIF
 *   • type=click → Records click event, redirects (302) to original URL
 *
 * Tokens are HMAC-SHA256 signed to prevent tampering.
 * ═══════════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';
import {
    verifyTrackingToken,
    recordTrackingEvent,
    TRACKING_PIXEL_GIF,
} from '@/lib/engine/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const tokenStr = searchParams.get('t');

    if (!tokenStr) {
        return new Response('Missing token', { status: 400 });
    }

    const token = verifyTrackingToken(tokenStr);
    if (!token) {
        // Invalid or tampered token — still return valid response to avoid
        // blocking email clients or showing broken images
        if (tokenStr.length > 0) {
            // Likely an open tracking pixel — return the GIF anyway
            return new Response(TRACKING_PIXEL_GIF, {
                status: 200,
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                },
            });
        }
        return new Response('Invalid token', { status: 400 });
    }

    // Extract user agent and IP for metadata
    const userAgent = request.headers.get('user-agent') ?? undefined;
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        undefined;

    if (token.type === 'open') {
        // ── Open Tracking ──────────────────────────────────────────
        recordTrackingEvent({
            messageId: token.messageId,
            type: 'open',
            timestamp: new Date().toISOString(),
            recipientEmail: token.email,
            campaignId: token.campaignId,
            metadata: { userAgent, ip },
        });

        return new Response(TRACKING_PIXEL_GIF, {
            status: 200,
            headers: {
                'Content-Type': 'image/gif',
                'Content-Length': String(TRACKING_PIXEL_GIF.length),
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
    }

    if (token.type === 'click' && token.url) {
        // ── Click Tracking ─────────────────────────────────────────
        recordTrackingEvent({
            messageId: token.messageId,
            type: 'click',
            timestamp: new Date().toISOString(),
            recipientEmail: token.email,
            campaignId: token.campaignId,
            metadata: { url: token.url, userAgent, ip },
        });

        // Validate destination URL to prevent open redirect attacks
        try {
            const dest = new URL(token.url);
            // Allow only http/https protocols
            if (dest.protocol !== 'http:' && dest.protocol !== 'https:') {
                return new Response('Invalid redirect URL', { status: 400 });
            }
        } catch {
            return new Response('Invalid redirect URL', { status: 400 });
        }

        return NextResponse.redirect(token.url, { status: 302 });
    }

    // Unknown type — return empty response
    return new Response('OK', { status: 200 });
}
