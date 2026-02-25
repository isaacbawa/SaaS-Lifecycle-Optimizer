/* ═══════════════════════════════════════════════════════════════════════
 * Next.js Middleware — Clerk Auth + CORS + Security Headers
 *
 * Runs on the Edge for every matched request before route handlers.
 *
 * Architecture:
 *  • Clerk `clerkMiddleware` wraps the entire handler for session mgmt
 *  • Dashboard routes (`/(app)/*`) require authentication
 *  • Marketing pages (/, /pricing, /docs) are public
 *  • API /v1/* routes use Bearer token auth (separate from Clerk)
 *  • API /webhooks/* routes are public (verified via Svix)
 *  • CORS headers applied to all API routes
 *  • Security headers applied to every response
 * ═══════════════════════════════════════════════════════════════════════ */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/* ── Route Matchers ──────────────────────────────────────────────────── */

/** Routes that require Clerk authentication */
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/accounts(.*)',
    '/activation(.*)',
    '/deliverability(.*)',
    '/email(.*)',
    '/expansion(.*)',
    '/flows(.*)',
    '/personalization(.*)',
    '/retention(.*)',
    '/revenue(.*)',
    '/sdk(.*)',
    '/segments(.*)',
    '/settings(.*)',
]);

/** External SDK/API routes — use Bearer token auth, not Clerk */
const isExternalApiRoute = createRouteMatcher(['/api/v1(.*)']);

/** Webhook ingress — no auth (verified in handlers) */
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)']);

/* ── CORS Configuration ──────────────────────────────────────────────── */

const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
    'https://lifecycleos.app',
    'https://app.lifecycleos.app',
    'https://sdk.lifecycleos.app',
]);

const ALLOW_ALL_ORIGINS = process.env.NODE_ENV !== 'production';

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Idempotency-Key',
    'Access-Control-Expose-Headers': 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Processing-Time-Ms',
    'Access-Control-Max-Age': '86400',
};

/* ── Security Headers ────────────────────────────────────────────────── */

const SECURITY_HEADERS: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/* ═══════════════════════════════════════════════════════════════════════
 * Middleware Handler (wrapped by Clerk)
 * ═══════════════════════════════════════════════════════════════════════ */

export default clerkMiddleware(async (auth, request) => {
    const { method, nextUrl } = request;
    const pathname = nextUrl.pathname;
    const origin = request.headers.get('origin');
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

    const isApiRoute = pathname.startsWith('/api/');

    /* ── CORS origin check ────────────────────────────────────────────── */
    let allowedOrigin = '';
    if (isApiRoute) {
        if (ALLOW_ALL_ORIGINS) {
            allowedOrigin = origin ?? '*';
        } else if (origin && ALLOWED_ORIGINS.has(origin)) {
            allowedOrigin = origin;
        }
    }

    /* ── Handle preflight ─────────────────────────────────────────────── */
    if (isApiRoute && method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin || 'null',
                ...CORS_HEADERS,
                ...SECURITY_HEADERS,
                'X-Request-ID': requestId,
            },
        });
    }

    /* ── Protect dashboard routes via Clerk ────────────────────────────── */
    if (isProtectedRoute(request)) {
        const { userId } = await auth.protect();
        // If protect() throws, Clerk redirects to sign-in automatically
    }

    /* ── Build response ───────────────────────────────────────────────── */
    const response = NextResponse.next();

    response.headers.set('X-Request-ID', requestId);

    if (isApiRoute && allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        for (const [key, value] of Object.entries(CORS_HEADERS)) {
            response.headers.set(key, value);
        }
    }

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(key, value);
    }

    return response;
});

/* ═══════════════════════════════════════════════════════════════════════
 * Route Matcher
 * ═══════════════════════════════════════════════════════════════════════ */

export const config = {
    matcher: [
        // Run on everything except static files and images
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
