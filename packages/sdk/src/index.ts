/* ═══════════════════════════════════════════════════════════════════════
 * @lifecycleos/sdk — Main Export
 *
 * The core entry point is FRAMEWORK-AGNOSTIC. It works in:
 *   • Next.js (App Router & Pages Router)
 *   • Any React framework (Remix, Vite+React, CRA, Gatsby)
 *   • Plain browser scripts (<script> tag)
 *   • Node.js server processes (Express, Fastify, etc.)
 *
 * Additional sub-path exports:
 *   • @lifecycleos/sdk/react   — React hooks & components (React 18+)
 *   • @lifecycleos/sdk/nextjs  — Server-side helpers for Next.js
 *
 * Install:
 *   npm install @lifecycleos/sdk
 *
 * Usage:
 *   import { createClient } from '@lifecycleos/sdk';
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
