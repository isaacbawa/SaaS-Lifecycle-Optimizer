/* ═══════════════════════════════════════════════════════════════════════
 * Next.js Middleware - Clerk Auth + CORS + Security Headers
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

/** External SDK/API routes - use Bearer token auth, not Clerk */
const isExternalApiRoute = createRouteMatcher(['/api/v1(.*)']);

/** Webhook ingress - no auth (verified in handlers) */
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)']);

/* ── CORS Configuration ──────────────────────────────────────────────── */

const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
    'https://lifecycleos.app',
    'https://app.lifecycleos.app',
    'https://sdk.lifecycleos.app',
]);

// Additional origins from environment (comma-separated)
const extraOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
for (const o of extraOrigins) ALLOWED_ORIGINS.add(o);

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Idempotency-Key',
    'Access-Control-Expose-Headers': 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After, X-Processing-Time-Ms',
    'Access-Control-Max-Age': '86400',
};

/* ── Security Headers + CSP ──────────────────────────────────────────── */

const BASE_SECURITY_HEADERS: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function clerkFrontendDomain(): string {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
    const encoded = key.replace(/^pk_(test|live)_/, '');

    if (!encoded) return '';

    try {
        const raw = atob(encoded);
        return raw.endsWith('$') ? raw.slice(0, -1) : raw;
    } catch {
        return '';
    }
}

function getClerkOrigins(): string[] {
    const clerkDomain = clerkFrontendDomain();
    return [
        clerkDomain ? `https://${clerkDomain}` : '',
        clerkDomain ? `wss://${clerkDomain}` : '',
        'https://*.clerk.accounts.dev',
        'wss://*.clerk.accounts.dev',
        'https://*.clerk.com',
        'wss://*.clerk.com',
        'https://img.clerk.com',
        'https://challenges.cloudflare.com',
    ].filter(Boolean);
}

function buildCspHeader(nonce: string): string {
    const clerkOrigins = getClerkOrigins();
    const clerkHttps = clerkOrigins.filter(origin => origin.startsWith('https://')).join(' ');
    const connectOrigins = clerkOrigins.join(' ');

    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${clerkHttps}`,
        `style-src 'self' 'nonce-${nonce}'`,
        `img-src 'self' data: blob: ${clerkHttps}`,
        "font-src 'self' data:",
        `connect-src 'self' ${connectOrigins}`,
        `frame-src 'self' ${clerkHttps}`,
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join('; ');
}

/* ═══════════════════════════════════════════════════════════════════════
 * Middleware Handler (wrapped by Clerk)
 * ═══════════════════════════════════════════════════════════════════════ */

export default clerkMiddleware(async (auth, request) => {
    const { method, nextUrl } = request;
    const pathname = nextUrl.pathname;
    const origin = request.headers.get('origin');
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const cspHeader = buildCspHeader(nonce);

    const isApiRoute = pathname.startsWith('/api/');

    /* ── CORS origin check ────────────────────────────────────────────── */
    let allowedOrigin = '';
    if (isApiRoute) {
        if (isExternalApiRoute(request)) {
            // SDK/API routes: allow any origin (SDK runs on customer domains)
            // Auth is handled by Bearer tokens, not CORS
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
                ...BASE_SECURITY_HEADERS,
                'Content-Security-Policy': cspHeader,
                'X-Request-ID': requestId,
                'X-Nonce': nonce,
            },
        });
    }

    /* ── Protect dashboard routes via Clerk ────────────────────────────── */
    if (isProtectedRoute(request)) {
        const { userId } = await auth.protect();
        // If protect() throws, Clerk redirects to sign-in automatically
    }

    /* ── Build response ───────────────────────────────────────────────── */
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    response.headers.set('X-Request-ID', requestId);

    if (isApiRoute && allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        for (const [key, value] of Object.entries(CORS_HEADERS)) {
            response.headers.set(key, value);
        }
    }

    for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
        response.headers.set(key, value);
    }
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Nonce', nonce);

    return response;
});

/* ═══════════════════════════════════════════════════════════════════════
 * Route Matcher
 * ═══════════════════════════════════════════════════════════════════════ */

export const config = {
    matcher: [
        // Run on everything except static files, images, and the Clerk proxy path
        '/((?!_next/static|_next/image|clerk/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
