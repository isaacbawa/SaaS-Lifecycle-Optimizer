/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/react — Ready-to-Use Components
 *
 * Drop-in components for common LifecycleOS operations.
 * All components require the <LifecycleOSProvider> wrapper.
 * ═══════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { useLifecycleOS } from './provider';
import { usePageTracking } from './hooks';
import type { UserTraits, GroupTraits, EventProperties } from '../types';

/* ── IdentifyUser ───────────────────────────────────────────────────── */

export interface IdentifyUserProps {
    /** The user ID to identify */
    userId: string;
    /** User traits to send */
    traits?: UserTraits;
    /** Callback when identify completes */
    onIdentified?: (result: { lifecycleState: string; stateChanged: boolean }) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
    children?: ReactNode;
}

/**
 * Identifies a user when mounted. Re-identifies when userId or traits change.
 *
 * ```tsx
 * <IdentifyUser
 *   userId={user.id}
 *   traits={{ email: user.email, name: user.name, plan: 'Growth' }}
 *   onIdentified={({ lifecycleState }) => console.log('State:', lifecycleState)}
 * />
 * ```
 */
export function IdentifyUser({
    userId,
    traits,
    onIdentified,
    onError,
    children,
}: IdentifyUserProps) {
    const client = useLifecycleOS();
    const lastIdRef = useRef<string>('');
    const traitsRef = useRef<string>('');

    useEffect(() => {
        const traitsKey = JSON.stringify(traits ?? {});
        // Skip if nothing changed
        if (userId === lastIdRef.current && traitsKey === traitsRef.current) return;
        lastIdRef.current = userId;
        traitsRef.current = traitsKey;

        client
            .identify(userId, traits)
            .then((res) => {
                if (res.success && res.data && onIdentified) {
                    onIdentified({
                        lifecycleState: res.data.lifecycleState,
                        stateChanged: res.data.stateChanged,
                    });
                }
            })
            .catch((err) => {
                if (onError) onError(err instanceof Error ? err : new Error(String(err)));
            });
    }, [userId, traits, client, onIdentified, onError]);

    return <>{children}</>;
}

/* ── GroupAccount ────────────────────────────────────────────────────── */

export interface GroupAccountProps {
    /** The account/organization ID */
    groupId: string;
    /** Account traits to send */
    traits?: GroupTraits;
    /** Callback when group completes */
    onGrouped?: (result: { health: string; plan: string }) => void;
    onError?: (error: Error) => void;
    children?: ReactNode;
}

/**
 * Associates the current user with an account when mounted.
 *
 * ```tsx
 * <GroupAccount
 *   groupId={org.id}
 *   traits={{ name: org.name, plan: org.currentPlan, seats: org.seatCount }}
 * />
 * ```
 */
export function GroupAccount({
    groupId,
    traits,
    onGrouped,
    onError,
    children,
}: GroupAccountProps) {
    const client = useLifecycleOS();
    const lastIdRef = useRef<string>('');

    useEffect(() => {
        if (groupId === lastIdRef.current) return;
        lastIdRef.current = groupId;

        client
            .group(groupId, traits)
            .then((res) => {
                if (res.success && res.data && onGrouped) {
                    onGrouped({ health: res.data.health, plan: res.data.plan });
                }
            })
            .catch((err) => {
                if (onError) onError(err instanceof Error ? err : new Error(String(err)));
            });
    }, [groupId, traits, client, onGrouped, onError]);

    return <>{children}</>;
}

/* ── TrackEvent ─────────────────────────────────────────────────────── */

export interface TrackEventProps {
    /** Event name to track */
    event: string;
    /** Event properties */
    properties?: EventProperties;
    /** When to fire: 'mount' (default), 'click', or 'visible' */
    trigger?: 'mount' | 'click' | 'visible';
    children?: ReactNode;
}

/**
 * Tracks an event based on a trigger mode.
 *
 * ```tsx
 * // Track on mount
 * <TrackEvent event="pricing_page_viewed" />
 *
 * // Track on click
 * <TrackEvent event="upgrade_clicked" trigger="click">
 *   <button>Upgrade</button>
 * </TrackEvent>
 *
 * // Track when visible (Intersection Observer)
 * <TrackEvent event="cta_seen" trigger="visible">
 *   <div>Call to Action</div>
 * </TrackEvent>
 * ```
 */
export function TrackEvent({
    event,
    properties,
    trigger = 'mount',
    children,
}: TrackEventProps) {
    const client = useLifecycleOS();
    const trackedRef = useRef(false);
    const elementRef = useRef<HTMLDivElement>(null);

    // Mount trigger
    useEffect(() => {
        if (trigger === 'mount' && !trackedRef.current) {
            trackedRef.current = true;
            client.track(event, properties);
        }
    }, [trigger, event, properties, client]);

    // Visibility trigger
    useEffect(() => {
        if (trigger !== 'visible' || !elementRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !trackedRef.current) {
                        trackedRef.current = true;
                        client.track(event, properties);
                        observer.disconnect();
                    }
                }
            },
            { threshold: 0.5 },
        );

        observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, [trigger, event, properties, client]);

    if (trigger === 'click') {
        return (
            <div
                onClick={() => client.track(event, properties)}
                style={{ display: 'contents' }}
            >
                {children}
            </div>
        );
    }

    if (trigger === 'visible') {
        return <div ref={elementRef}>{children}</div>;
    }

    return <>{children}</>;
}

/* ── PageTracker ────────────────────────────────────────────────────── */

/**
 * Auto-tracks page views on route changes. Drop into your layout.
 *
 * ```tsx
 * // app/layout.tsx
 * <LifecycleOSProvider apiKey="...">
 *   <PageTracker />
 *   {children}
 * </LifecycleOSProvider>
 * ```
 */
export function PageTracker() {
    usePageTracking();
    return null;
}
