/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/react — Hooks
 *
 * Typed hooks for every LifecycleOS SDK operation.
 * All hooks require the <LifecycleOSProvider> wrapper.
 *
 * Usage:
 *   import { useIdentify, useTrack, useGroup } from '@lifecycleos/sdk/react';
 *
 *   const { identify, loading } = useIdentify();
 *   const track = useTrack();
 *   const { group } = useGroup();
 * ═══════════════════════════════════════════════════════════════════════ */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useLifecycleOS } from './provider';
import type {
    UserTraits,
    EventProperties,
    GroupTraits,
    PageProperties,
    ApiResponse,
    IdentifyResponse,
    GroupResponse,
    TrackResponse,
} from '../types';

/* ── useIdentify ────────────────────────────────────────────────────── */

interface UseIdentifyReturn {
    /** Identify a user with traits. Returns the API response. */
    identify: (userId: string, traits?: UserTraits) => Promise<ApiResponse<IdentifyResponse>>;
    /** True while the identify request is in flight */
    loading: boolean;
    /** Last error, if any */
    error: Error | null;
    /** Last successful response */
    data: ApiResponse<IdentifyResponse> | null;
}

/**
 * Hook for identifying users.
 *
 * ```tsx
 * const { identify, loading, data } = useIdentify();
 * 
 * useEffect(() => {
 *   if (user) identify(user.id, { email: user.email, plan: user.plan });
 * }, [user]);
 * ```
 */
export function useIdentify(): UseIdentifyReturn {
    const client = useLifecycleOS();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<ApiResponse<IdentifyResponse> | null>(null);

    const identify = useCallback(
        async (userId: string, traits?: UserTraits) => {
            setLoading(true);
            setError(null);
            try {
                const result = await client.identify(userId, traits);
                setData(result);
                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [client],
    );

    return { identify, loading, error, data };
}

/* ── useTrack ───────────────────────────────────────────────────────── */

/**
 * Hook for tracking events. Returns a stable `track` function.
 *
 * Events are batched automatically and flushed based on your
 * provider configuration (flushAt / flushInterval).
 *
 * ```tsx
 * const track = useTrack();
 * 
 * <button onClick={() => track('button_clicked', { label: 'signup' })}>
 *   Sign Up
 * </button>
 * ```
 */
export function useTrack(): (event: string, properties?: EventProperties) => void {
    const client = useLifecycleOS();
    return useCallback(
        (event: string, properties?: EventProperties) => {
            client.track(event, properties);
        },
        [client],
    );
}

/* ── useGroup ───────────────────────────────────────────────────────── */

interface UseGroupReturn {
    /** Associate user with an account/organization */
    group: (groupId: string, traits?: GroupTraits) => Promise<ApiResponse<GroupResponse>>;
    loading: boolean;
    error: Error | null;
    data: ApiResponse<GroupResponse> | null;
}

/**
 * Hook for the group call (account association).
 *
 * ```tsx
 * const { group } = useGroup();
 * 
 * useEffect(() => {
 *   if (org) group(org.id, { name: org.name, plan: org.plan, seats: org.seats });
 * }, [org]);
 * ```
 */
export function useGroup(): UseGroupReturn {
    const client = useLifecycleOS();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<ApiResponse<GroupResponse> | null>(null);

    const group = useCallback(
        async (groupId: string, traits?: GroupTraits) => {
            setLoading(true);
            setError(null);
            try {
                const result = await client.group(groupId, traits);
                setData(result);
                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [client],
    );

    return { group, loading, error, data };
}

/* ── usePage ────────────────────────────────────────────────────────── */

/**
 * Hook that tracks page views. Call without arguments for auto-capture,
 * or pass custom properties.
 *
 * ```tsx
 * const trackPage = usePage();
 * 
 * useEffect(() => {
 *   trackPage(); // Auto-captures URL, title, referrer
 * }, [pathname]);
 * ```
 */
export function usePage(): (properties?: PageProperties) => void {
    const client = useLifecycleOS();
    return useCallback(
        (properties?: PageProperties) => {
            client.page(properties);
        },
        [client],
    );
}

/* ── useFlush ───────────────────────────────────────────────────────── */

/**
 * Hook to manually flush the event queue.
 *
 * ```tsx
 * const flush = useFlush();
 * 
 * const handleCheckout = async () => {
 *   track('checkout_started');
 *   await flush(); // Ensure event is sent before redirect
 *   router.push('/checkout');
 * };
 * ```
 */
export function useFlush(): () => Promise<ApiResponse<TrackResponse>> {
    const client = useLifecycleOS();
    return useCallback(() => client.flush(), [client]);
}

/* ── usePageTracking ────────────────────────────────────────────────── */

/**
 * Auto-tracks page views on route changes. Drop this into your layout.
 *
 * ```tsx
 * // In app/layout.tsx or a provider
 * import { usePageTracking } from '@lifecycleos/sdk/react';
 * 
 * function PageTracker() {
 *   usePageTracking();
 *   return null;
 * }
 * ```
 */
export function usePageTracking(): void {
    const client = useLifecycleOS();
    const lastPath = useRef<string>('');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const trackIfChanged = () => {
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== lastPath.current) {
                lastPath.current = currentPath;
                client.page();
            }
        };

        // Track initial page
        trackIfChanged();

        // Listen for pushState/replaceState (Next.js App Router)
        const originalPush = history.pushState;
        const originalReplace = history.replaceState;

        history.pushState = function (...args) {
            originalPush.apply(this, args);
            setTimeout(trackIfChanged, 0);
        };
        history.replaceState = function (...args) {
            originalReplace.apply(this, args);
            setTimeout(trackIfChanged, 0);
        };

        window.addEventListener('popstate', trackIfChanged);

        return () => {
            history.pushState = originalPush;
            history.replaceState = originalReplace;
            window.removeEventListener('popstate', trackIfChanged);
        };
    }, [client]);
}
