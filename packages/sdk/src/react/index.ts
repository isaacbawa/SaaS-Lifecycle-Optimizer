/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk/react — React Export
 *
 * Re-exports Provider, hooks, and components for React/Next.js apps.
 *
 * Usage:
 *   import { LifecycleOSProvider, useTrack, TrackEvent } from '@lifecycleos/sdk/react';
 * ═══════════════════════════════════════════════════════════════════════ */

export { LifecycleOSProvider, useLifecycleOS, useLifecycleOSOptional } from './provider';

export {
    useIdentify,
    useTrack,
    useGroup,
    usePage,
    useFlush,
    usePageTracking,
} from './hooks';

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
