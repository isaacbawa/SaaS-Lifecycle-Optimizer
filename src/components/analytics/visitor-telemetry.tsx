'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LifecycleOS } from '@/lib/sdk';

const apiKey = process.env.NEXT_PUBLIC_LIFECYCLEOS_API_KEY ?? '';
const apiBaseUrl = process.env.NEXT_PUBLIC_LIFECYCLEOS_API_URL ?? '/api/v1';

export function VisitorTelemetry() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastUrlRef = useRef<string | null>(null);

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

    useEffect(() => {
        if (!client) return;

        const currentUrl = `${window.location.pathname}${window.location.search}`;
        const referrer = lastUrlRef.current ?? document.referrer ?? undefined;

        client.page({
            referrer,
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
        });

        lastUrlRef.current = currentUrl;
    }, [client, pathname, searchParams]);

    useEffect(() => {
        if (!client) return;

        return () => {
            client.shutdown().catch(() => undefined);
        };
    }, [client]);

    return null;
}