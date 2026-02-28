'use client';

/**
 * ChunkLoadErrorRecovery
 *
 * Mounts a global `error` event listener that intercepts failed `<script>`
 * loads (e.g. Clerk JS CDN chunks) and retries them once by re-appending
 * the script tag. If the retry also fails the error propagates normally
 * so React error boundaries can handle it.
 *
 * Place this component early in your root layout so the listener is
 * active before any dynamic imports fire.
 */

import { useEffect } from 'react';

const RETRY_ATTR = 'data-chunk-retry';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export function ChunkLoadErrorRecovery() {
    useEffect(() => {
        function handleScriptError(event: Event) {
            const target = event.target;

            // Only intercept <script> load failures
            if (!(target instanceof HTMLScriptElement)) return;
            if (!target.src) return;

            // Skip scripts we've already retried enough times
            const retries = Number(target.getAttribute(RETRY_ATTR) ?? '0');
            if (retries >= MAX_RETRIES) return;

            // Only retry Clerk CDN and Next.js chunk scripts
            const isClerkChunk = target.src.includes('clerk');
            const isNextChunk = target.src.includes('_next/');
            if (!isClerkChunk && !isNextChunk) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            console.warn(
                `[ChunkRecovery] Script load failed, retrying (${retries + 1}/${MAX_RETRIES}): ${target.src}`,
            );

            // Remove the broken script and re-append after a short delay
            const src = target.src;
            target.remove();

            setTimeout(() => {
                const retry = document.createElement('script');
                retry.src = src;
                retry.async = true;
                retry.setAttribute(RETRY_ATTR, String(retries + 1));
                document.head.appendChild(retry);
            }, RETRY_DELAY_MS);
        }

        // `error` events on scripts don't bubble — we must capture them
        window.addEventListener('error', handleScriptError, true);

        return () => {
            window.removeEventListener('error', handleScriptError, true);
        };
    }, []);

    return null;
}
