/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/nextjs - Server-Side Utilities for Next.js
 *
 * Server-side helpers for identifying users, tracking events,
 * and verifying webhooks in Next.js API routes and Server Components.
 *
 * These utilities work in:
 *   • Next.js API Routes (Pages Router)
 *   • Next.js Route Handlers (App Router)
 *   • Server Actions
 *   • Middleware
 *
 * Usage:
 *   import { serverIdentify, serverTrack, verifyWebhook } from '@lifecycleos/sdk/nextjs';
 * ═══════════════════════════════════════════════════════════════════════ */

import type {
    UserTraits,
    EventProperties,
    GroupTraits,
    ApiResponse,
    IdentifyResponse,
    GroupResponse,
    TrackResponse,
} from '../types';

function getServerEnv(): Record<string, string | undefined> {
    const runtime = globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
    };

    return runtime.process?.env ?? {};
}

const SDK_VERSION = '1.0.0';
const SDK_NAME = '@lifecycleos/sdk-server';

/* ── Server Config ──────────────────────────────────────────────────── */

interface ServerConfig {
    apiKey: string;
    apiBaseUrl: string;
    timeout: number;
}

function getServerConfig(): ServerConfig {
    const env = getServerEnv();
    const apiKey = env.LIFECYCLEOS_API_KEY ?? env.LIFECYCLEOS_SECRET_KEY ?? '';
    const apiBaseUrl = env.LIFECYCLEOS_API_URL
        ?? (env.NEXT_PUBLIC_APP_URL
            ? `${env.NEXT_PUBLIC_APP_URL}/api/v1`
            : 'http://localhost:3000/api/v1');

    return {
        apiKey,
        apiBaseUrl,
        timeout: 15_000,
    };
}

/* ── Server HTTP Helper ─────────────────────────────────────────────── */

async function serverRequest<T>(
    path: string,
    body: unknown,
    configOverride?: Partial<ServerConfig>,
): Promise<ApiResponse<T>> {
    const config = { ...getServerConfig(), ...configOverride };

    if (!config.apiKey) {
        return {
            success: false,
            error: {
                code: 'MISSING_API_KEY',
                message: 'Set LIFECYCLEOS_API_KEY or LIFECYCLEOS_SECRET_KEY environment variable.',
            },
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(`${config.apiBaseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
                'X-SDK-Version': SDK_VERSION,
                'X-SDK-Name': SDK_NAME,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return (await response.json()) as ApiResponse<T>;
    } catch (err) {
        return {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: (err as Error).message,
            },
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Server-Side SDK Methods
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Identify a user from the server side (API routes, Server Actions, middleware).
 *
 * The third argument can be either an anonymous session ID for identity
 * merging or a Partial<ServerConfig> to override request settings.
 *
 * ```ts
 * // In a Server Action or API route
 * import { serverIdentify } from '@lifecycleos/sdk/nextjs';
 *
 * await serverIdentify('user_123', {
 *   email: 'jane@acme.com',
 *   name: 'Jane Doe',
 *   plan: 'Growth',
 *   accountId: 'acc_456',
 * });
 *
 * // Merge an anonymous browser session into the known user record
 * await serverIdentify('user_123', {
 *   email: 'jane@acme.com',
 *   plan: 'Growth',
 * }, 'anonymous_987');
 *
 * // Or use the third argument as a config override instead of an anonymous ID
 * await serverIdentify('user_123', { email: 'jane@acme.com' }, {
 *   apiBaseUrl: 'https://analytics.example.com/api/v1',
 *   timeout: 20_000,
 * });
 * ```
 */
export async function serverIdentify(
    userId: string,
    traits?: UserTraits,
    anonymousIdOrConfigOverride?: string | Partial<ServerConfig>,
    configOverride?: Partial<ServerConfig>,
): Promise<ApiResponse<IdentifyResponse>> {
    const anonymousId = typeof anonymousIdOrConfigOverride === 'string' ? anonymousIdOrConfigOverride : undefined;
    const resolvedConfigOverride = typeof anonymousIdOrConfigOverride === 'string'
        ? configOverride
        : anonymousIdOrConfigOverride;

    return serverRequest<IdentifyResponse>('/identify', {
        userId,
        traits: traits ?? {},
        ...(anonymousId ? { anonymousId } : {}),
        timestamp: new Date().toISOString(),
        context: {
            library: { name: SDK_NAME, version: SDK_VERSION },
            environment: getServerEnv().NODE_ENV ?? 'production',
        },
    }, resolvedConfigOverride);
}

/**
 * Track events from the server side.
 *
 * ```ts
 * import { serverTrack } from '@lifecycleos/sdk/nextjs';
 *
 * await serverTrack('subscription_upgraded', {
 *   userId: 'user_123',
 *   accountId: 'acc_456',
 *   fromPlan: 'Starter',
 *   toPlan: 'Growth',
 *   newMrr: 99,
 * });
 * ```
 */
export async function serverTrack(
    event: string,
    properties?: EventProperties,
    configOverride?: Partial<ServerConfig>,
): Promise<ApiResponse<TrackResponse>> {
    const messageId = `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    return serverRequest<TrackResponse>('/events', {
        batch: [
            {
                event,
                properties: properties ?? {},
                timestamp: new Date().toISOString(),
                messageId,
                context: {
                    library: { name: SDK_NAME, version: SDK_VERSION },
                    environment: getServerEnv().NODE_ENV ?? 'production',
                },
            },
        ],
        sentAt: new Date().toISOString(),
    }, configOverride);
}

/**
 * Batch track multiple events from the server side.
 *
 * ```ts
 * import { serverTrackBatch } from '@lifecycleos/sdk/nextjs';
 *
 * await serverTrackBatch([
 *   { event: 'feature_used', properties: { feature: 'reports', userId: 'u1' } },
 *   { event: 'feature_used', properties: { feature: 'exports', userId: 'u2' } },
 * ]);
 * ```
 */
export async function serverTrackBatch(
    events: Array<{ event: string; properties?: EventProperties }>,
    configOverride?: Partial<ServerConfig>,
): Promise<ApiResponse<TrackResponse>> {
    const batch = events.map((e, i) => ({
        event: e.event,
        properties: e.properties ?? {},
        timestamp: new Date().toISOString(),
        messageId: `srv_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        context: {
            library: { name: SDK_NAME, version: SDK_VERSION },
            environment: getServerEnv().NODE_ENV ?? 'production',
        },
    }));

    return serverRequest<TrackResponse>('/events', {
        batch,
        sentAt: new Date().toISOString(),
    }, configOverride);
}

/**
 * Create or update an account from the server side.
 *
 * ```ts
 * import { serverGroup } from '@lifecycleos/sdk/nextjs';
 *
 * await serverGroup('acc_456', {
 *   name: 'Acme Corp',
 *   plan: 'Enterprise',
 *   seats: 50,
 *   industry: 'Technology',
 * });
 * ```
 */
export async function serverGroup(
    groupId: string,
    traits?: GroupTraits,
    configOverride?: Partial<ServerConfig>,
): Promise<ApiResponse<GroupResponse>> {
    return serverRequest<GroupResponse>('/group', {
        groupId,
        traits: traits ?? {},
        timestamp: new Date().toISOString(),
        context: {
            library: { name: SDK_NAME, version: SDK_VERSION },
            environment: getServerEnv().NODE_ENV ?? 'production',
        },
    }, configOverride);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Webhook Verification
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Verify an incoming LifecycleOS webhook signature.
 *
 * ```ts
 * // app/api/webhooks/lifecycleos/route.ts
 * import { verifyWebhook } from '@lifecycleos/sdk/nextjs';
 *
 * export async function POST(req: Request) {
 *   const body = await req.text();
 *   const signature = req.headers.get('X-Lifecycle-Signature') ?? '';
 *   const secret = process.env.LIFECYCLEOS_WEBHOOK_SECRET!;
 *
 *   const valid = await verifyWebhook(body, signature, secret);
 *   if (!valid) return new Response('Invalid signature', { status: 401 });
 *
 *   const payload = JSON.parse(body);
 *   // Handle webhook event...
 * }
 * ```
 */
export async function verifyWebhook(
    rawBody: string,
    signature: string,
    secret: string,
): Promise<boolean> {
    if (!signature || !secret || !rawBody) return false;

    try {
        const cryptoApi = globalThis.crypto;
        if (!cryptoApi?.subtle) return false;

        const enc = new TextEncoder();
        const key = await cryptoApi.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
        );
        const sig = await cryptoApi.subtle.sign('HMAC', key, enc.encode(rawBody));
        const expected = 'sha256=' + Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');

        // Constant-time compare
        if (expected.length !== signature.length) return false;
        let mismatch = 0;
        for (let i = 0; i < expected.length; i++) {
            mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
        }
        return mismatch === 0;
    } catch {
        return false;
    }
}

/* ═══════════════════════════════════════════════════════════════════════
 * Next.js Middleware Helper
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Track a page view from Next.js middleware (runs on edge).
 *
 * ```ts
 * // middleware.ts
 * import { trackMiddlewarePageView } from '@lifecycleos/sdk/nextjs';
 *
 * export async function middleware(request: NextRequest) {
 *   await trackMiddlewarePageView(request);
 *   return NextResponse.next();
 * }
 * ```
 */
export async function trackMiddlewarePageView(
    request: { url: string; headers: { get(name: string): string | null } },
    configOverride?: Partial<ServerConfig>,
): Promise<void> {
    const url = new URL(request.url);
    // Only track HTML pages, skip API routes and static files
    if (url.pathname.startsWith('/api/') || url.pathname.match(/\.\w+$/)) return;

    const userId = request.headers.get('x-lifecycleos-user-id');
    if (!userId) return; // Can't track anonymous from middleware

    try {
        await serverTrack(
            '$page',
            {
                userId,
                url: request.url,
                path: url.pathname,
                referrer: request.headers.get('referer') ?? undefined,
            },
            configOverride,
        );
    } catch {
        // Best-effort - don't block middleware
    }
}
