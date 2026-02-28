'use client';

/**
 * Root error boundary — catches errors that escape every other boundary,
 * including `ChunkLoadError` from third-party scripts (Clerk JS CDN).
 *
 * When a chunk load fails, the most reliable recovery is a full page reload.
 * We auto-reload once; if the error persists we show a manual retry button.
 */

import { useEffect, useRef } from 'react';

const MAX_AUTO_RETRIES = 1;
const RETRY_KEY = '__chunk_error_retries';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const hasRetried = useRef(false);

    useEffect(() => {
        const isChunkError =
            error?.name === 'ChunkLoadError' ||
            error?.message?.includes('Loading chunk') ||
            error?.message?.includes('ChunkLoadError');

        if (isChunkError && !hasRetried.current) {
            hasRetried.current = true;

            // Track retries in sessionStorage to avoid infinite reload loops
            const retries = Number(sessionStorage.getItem(RETRY_KEY) ?? '0');
            if (retries < MAX_AUTO_RETRIES) {
                sessionStorage.setItem(RETRY_KEY, String(retries + 1));
                window.location.reload();
                return;
            }
        }

        // Log non-chunk errors for observability
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <html lang="en">
            <body className="flex min-h-screen items-center justify-center bg-gray-50 font-sans text-gray-900">
                <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                            />
                        </svg>
                    </div>

                    <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>

                    <p className="mb-6 text-sm text-gray-500">
                        {error?.message?.includes('Loading chunk')
                            ? 'A required script failed to load. This is usually a temporary network issue.'
                            : 'An unexpected error occurred. If this persists, try clearing your browser cache.'}
                    </p>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => {
                                sessionStorage.removeItem(RETRY_KEY);
                                window.location.reload();
                            }}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                            Reload page
                        </button>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem(RETRY_KEY);
                                reset();
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
