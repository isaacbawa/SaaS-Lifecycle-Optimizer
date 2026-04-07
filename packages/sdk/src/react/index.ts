/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/react - React Bindings
 *
 * Re-exports Provider, hooks, and components for React-based apps.
 * Works with: Next.js (App Router & Pages Router), Remix, Vite + React,
 * Create React App, Gatsby, and any other React 18+ framework.
 *
 * Usage:
 *   import {
 *     LifecycleOSProvider,
 *     useIdentify, useTrack,
 *     IdentifyUser, TrackEvent, PageTracker,
 *   } from '@lifecycleos/sdk/react';
 * ═══════════════════════════════════════════════════════════════════════ */

// ── Provider & context hooks ────────────────────────────────────────
export { LifecycleOSProvider, useLifecycleOS, useLifecycleOSOptional } from './provider';

// ── Action hooks ────────────────────────────────────────────────────
export {
    useIdentify,
    useTrack,
    useGroup,
    usePage,
    useFlush,
    usePageTracking,
} from './hooks';

// ── Drop-in components ──────────────────────────────────────────────
export {
    IdentifyUser,
    GroupAccount,
    TrackEvent,
    PageTracker,
} from './components';

// ── Component prop types ────────────────────────────────────────────
export type {
    IdentifyUserProps,
    GroupAccountProps,
    TrackEventProps,
} from './components';

export {
    IdentifyUser,
    GroupAccount,
    TrackEvent,
    PageTracker,
} from './components';

// Re-export core types for convenience
export type {
    LifecycleOSConfig,
    UserTraits,
    EventProperties,
    GroupTraits,
    PageProperties,
    LifecycleOSClient,
    LifecycleOSPlugin,
} from '../types';
