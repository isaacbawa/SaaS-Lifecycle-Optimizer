'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser, useOrganization } from '@clerk/nextjs';
import { LifecycleOS } from '@/lib/sdk';
import type { UserTraits } from '@/lib/sdk';

const apiKey = process.env.NEXT_PUBLIC_LIFECYCLEOS_API_KEY ?? '';
const apiBaseUrl = process.env.NEXT_PUBLIC_LIFECYCLEOS_API_URL ?? '/api/v1';

export function VisitorTelemetry() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Clerk auth state
    const { user, isSignedIn, isLoaded: authLoaded } = useUser();
    const { organization, isLoaded: orgLoaded } = useOrganization();

    // Refs to prevent duplicate calls within the same session
    const lastUrlRef = useRef<string | null>(null);
    const identifiedUserRef = useRef<string | null>(null);
    const groupedOrgRef = useRef<string | null>(null);

    // One SDK instance per component lifetime
    const client = useMemo(() => {
        if (!apiKey) return null;

        return new LifecycleOS({
            apiKey,
            apiBaseUrl,
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
            flushAt: 10,
            flushInterval: 5_000,
            maxRetries: 3,
            retryBaseDelay: 1_000,
            debug: false,
            timeout: 10_000,
        });
    }, []);

    // ── Page tracking ────────────────────────────────────────────
    // Fires on every client-side navigation (pathname or search change).
    useEffect(() => {
        if (!client) return;

        const currentUrl = `${window.location.pathname}${window.location.search}`;
        // Use the previous URL as the referrer for SPA navigations
        const referrer = lastUrlRef.current ?? (document.referrer || undefined);

        client.page({
            referrer,
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
        });

        lastUrlRef.current = currentUrl;
    }, [client, pathname, searchParams]);

    // ── Clerk identity sync ──────────────────────────────────────
    // Waits for both auth and org data to be fully loaded, then:
    //   1. Calls group() to upsert the tracked account (org)
    //   2. Calls identify() to link the visitor profile to the user
    // On sign-out, resets the SDK state so the next sign-in is clean.
    useEffect(() => {
        if (!client || !authLoaded || !orgLoaded) return;

        // Capture non-null reference for the async closure below
        const sdk = client;

        async function syncIdentity() {
            if (!isSignedIn || !user) {
                // Sign-out path: reset identity but keep visitor for anonymous tracking
                if (identifiedUserRef.current !== null) {
                    identifiedUserRef.current = null;
                    groupedOrgRef.current = null;
                    sdk.reset();
                }
                return;
            }

            // Group the org first so the tracked account record exists
            // before identify() tries to link the user to it.
            if (organization && groupedOrgRef.current !== organization.id) {
                groupedOrgRef.current = organization.id;
                await sdk.group(organization.id, {
                    name: organization.name,
                }).catch(() => {});
            }

            // Identify the user only once per session (or when userId changes)
            if (identifiedUserRef.current !== user.id) {
                identifiedUserRef.current = user.id;

                const traits: UserTraits = {};
                const email = user.primaryEmailAddress?.emailAddress;
                if (email) traits.email = email;
                const name = user.fullName || user.firstName || '';
                if (name) traits.name = name;
                if (organization?.id) traits.accountId = organization.id;

                await sdk.identify(user.id, traits).catch(() => {});
            }
        }

        void syncIdentity();
    }, [client, authLoaded, orgLoaded, isSignedIn, user, organization]);

    // ── Graceful shutdown ─────────────────────────────────────────
    // Flushes any queued events when the component unmounts (tab close,
    // navigation away from the app). sendBeacon handles the unload case.
    useEffect(() => {
        if (!client) return;
        return () => {
            client.shutdown().catch(() => undefined);
        };
    }, [client]);

    return null;
}
