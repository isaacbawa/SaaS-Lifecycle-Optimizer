/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/react — React Provider & Context
 *
 * Provides the LifecycleOS client to the React component tree.
 *
 * Usage:
 *   import { LifecycleOSProvider } from '@lifecycleos/sdk/react';
 *
 *   <LifecycleOSProvider apiKey="lcos_live_...">
 *     <App />
 *   </LifecycleOSProvider>
 * ═══════════════════════════════════════════════════════════════════════ */

'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useMemo,
    type ReactNode,
} from 'react';
import { createClient } from '../client';
import type { LifecycleOSConfig, LifecycleOSClient } from '../types';

/* ── Context ────────────────────────────────────────────────────────── */

interface LifecycleOSContextValue {
    client: LifecycleOSClient;
    isReady: boolean;
}

const LifecycleOSContext = createContext<LifecycleOSContextValue | null>(null);

/* ── Provider ───────────────────────────────────────────────────────── */

export interface LifecycleOSProviderProps extends Partial<LifecycleOSConfig> {
    /** Your LifecycleOS API key (required) */
    apiKey: string;
    children: ReactNode;
}

/**
 * Wraps your app to provide the LifecycleOS client via React context.
 * 
 * All hooks and components from `@lifecycleos/sdk/react` require this provider.
 */
export function LifecycleOSProvider({
    children,
    apiKey,
    apiBaseUrl,
    environment,
    flushAt,
    flushInterval,
    maxRetries,
    retryBaseDelay,
    debug,
    timeout,
}: LifecycleOSProviderProps) {
    const configRef = useRef<LifecycleOSConfig>({
        apiKey,
        apiBaseUrl,
        environment,
        flushAt,
        flushInterval,
        maxRetries,
        retryBaseDelay,
        debug,
        timeout,
    });

    const clientRef = useRef<LifecycleOSClient | null>(null);

    // Create client once
    if (!clientRef.current) {
        clientRef.current = createClient(configRef.current);
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clientRef.current?.shutdown();
            clientRef.current = null;
        };
    }, []);

    const value = useMemo<LifecycleOSContextValue>(
        () => ({
            client: clientRef.current!,
            isReady: true,
        }),
        [],
    );

    return (
        <LifecycleOSContext.Provider value={value}>
            {children}
        </LifecycleOSContext.Provider>
    );
}

/* ── Hook ────────────────────────────────────────────────────────────── */

/**
 * Access the LifecycleOS client from any component.
 *
 * @throws if used outside `<LifecycleOSProvider>`
 */
export function useLifecycleOS(): LifecycleOSClient {
    const ctx = useContext(LifecycleOSContext);
    if (!ctx) {
        throw new Error(
            '[LifecycleOS] useLifecycleOS() must be used within <LifecycleOSProvider>. ' +
            'Wrap your app or layout with <LifecycleOSProvider apiKey="...">.',
        );
    }
    return ctx.client;
}

/**
 * Check if LifecycleOS is available (safe to call outside provider).
 */
export function useLifecycleOSOptional(): LifecycleOSClient | null {
    const ctx = useContext(LifecycleOSContext);
    return ctx?.client ?? null;
}
