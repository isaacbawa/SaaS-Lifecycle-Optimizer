/* ═══════════════════════════════════════════════════════════════════════
 * Email Unsubscribe Route — RFC 8058 One-Click Unsubscribe
 *
 * GET  /api/v1/email/unsubscribe?t=<token> → Shows confirmation page
 * POST /api/v1/email/unsubscribe?t=<token> → Processes unsubscribe
 *
 * Supports RFC 8058 List-Unsubscribe-Post for one-click unsubscribe
 * from email clients that support it (Gmail, Yahoo, etc.).
 * ═══════════════════════════════════════════════════════════════════════ */

import {
    verifyTrackingToken,
    recordTrackingEvent,
    recordUnsubscribe,
    isSuppressed,
} from '@/lib/engine/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — Show a simple unsubscribe confirmation page.
 */
export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const tokenStr = searchParams.get('t');

    if (!tokenStr) {
        return new Response('Missing token', { status: 400 });
    }

    const token = verifyTrackingToken(tokenStr);
    if (!token || token.type !== 'unsub') {
        return new Response('Invalid or expired unsubscribe link', { status: 400 });
    }

    const alreadySuppressed = isSuppressed(token.email);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #111827; }
    p { color: #6b7280; line-height: 1.6; margin: 12px 0; }
    .email { font-weight: 600; color: #111827; }
    button { background: #ef4444; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 16px; }
    button:hover { background: #dc2626; }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    .success { color: #059669; }
    .already { color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    ${alreadySuppressed
            ? `<h1 class="already">Already Unsubscribed</h1>
               <p><span class="email">${token.email}</span> is already unsubscribed from our emails.</p>`
            : `<h1>Unsubscribe</h1>
               <p>Are you sure you want to unsubscribe <span class="email">${token.email}</span> from our emails?</p>
               <form method="POST" action="/api/v1/email/unsubscribe?t=${tokenStr}">
                 <button type="submit">Unsubscribe</button>
               </form>`
        }
  </div>
</body>
</html>`;

    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

/**
 * POST — Process the unsubscribe.
 * Handles both browser form submissions and RFC 8058 one-click unsubscribe.
 */
export async function POST(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const tokenStr = searchParams.get('t');

    if (!tokenStr) {
        return new Response('Missing token', { status: 400 });
    }

    const token = verifyTrackingToken(tokenStr);
    if (!token || token.type !== 'unsub') {
        return new Response('Invalid or expired unsubscribe link', { status: 400 });
    }

    // Record in suppression list
    recordUnsubscribe(token.email, 'unsubscribe_link', token.campaignId);

    // Record tracking event
    recordTrackingEvent({
        messageId: token.messageId,
        type: 'unsubscribe',
        timestamp: new Date().toISOString(),
        recipientEmail: token.email,
        campaignId: token.campaignId,
    });

    // Check if this is an RFC 8058 one-click unsubscribe (from email client)
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await request.text();
        if (body.includes('List-Unsubscribe=One-Click')) {
            // Email client one-click — return 200 OK (no page needed)
            return new Response('Unsubscribed', { status: 200 });
        }
    }

    // Browser form submission — show confirmation page
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 420px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #059669; }
    p { color: #6b7280; line-height: 1.6; }
    .email { font-weight: 600; color: #111827; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribed ✓</h1>
    <p><span class="email">${token.email}</span> has been unsubscribed. You will no longer receive emails from us.</p>
    <p style="margin-top:24px;font-size:14px;">If this was a mistake, contact support to re-subscribe.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
