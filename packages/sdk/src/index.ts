/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk — Main Export
 *
 * Re-exports core client, types, and utilities.
 *
 * Usage:
 *   import { createClient, init, getClient } from '@lifecycleos/sdk';
 * ═══════════════════════════════════════════════════════════════════════ */

export {
    createClient,
    init,
    getClient,
    resetClient,
} from './client';

export type {
    LifecycleOSConfig,
    ResolvedConfig,
    UserTraits,
    EventProperties,
    GroupTraits,
    PageProperties,
    EventContext,
    QueuedEvent,
    ApiResponse,
    LifecycleState,
    IdentifyResponse,
    TrackResponse,
    GroupResponse,
    FlushCallback,
    LifecycleOSPlugin,
    LifecycleOSClient,
} from './types';
