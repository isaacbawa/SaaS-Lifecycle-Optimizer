'use client';

/**
 * App-shell error boundary — catches render errors within the (app) layout.
 * Chunk-load failures from Clerk or lazy components bubble here before
 * reaching `global-error.tsx`.
 */

import { useEffect, useRef } from 'react';

export default function AppError({
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
            error?.message?.includes('Loading chunk');

        if (isChunkError && !hasRetried.current) {
            hasRetried.current = true;
            // One silent retry — usually resolves a transient CDN miss
            reset();
            return;
        }

        console.error('[AppError]', error);
    }, [error, reset]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
            <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <svg
                        className="h-6 w-6 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                        />
                    </svg>
                </div>

                <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Failed to load this page
                </h2>

                <p className="mb-6 text-sm text-gray-500">
                    {error?.message?.includes('Loading chunk')
                        ? 'A required script could not be loaded. Check your connection and try again.'
                        : error?.message ?? 'An unexpected error occurred.'}
                </p>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                        Reload
                    </button>
                    <button
                        onClick={reset}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        Retry
                    </button>
                </div>
            </div>
        </div>
    );
}
