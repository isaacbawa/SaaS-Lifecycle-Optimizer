/* ==========================================================================
 * @lifecycleos/sdk - Public Entry Point
 *
 * Re-exports the client class and all public types so consumers import
 * from a single module:
 *
 *   import { LifecycleOS, createClient } from '@/lib/sdk';
 *   import type { UserTraits, EventProperties } from '@/lib/sdk';
 * ========================================================================== */

import { LifecycleOS } from './client';
import type { LifecycleOSConfig } from './types';

export { LifecycleOS } from './client';

/**
 * Factory convenience alias for LifecycleOS.
 * Equivalent to `new LifecycleOS(config)` — use whichever form you prefer.
 *
 * @example
 * const client = createClient({ apiKey: 'lcos_live_...' });
 */
export function createClient(config: LifecycleOSConfig): LifecycleOS {
  return new LifecycleOS(config);
}

export type {
  LifecycleOSConfig,
  VisitorIdentity,
  VisitorSource,
  VisitorPageVisit,
  VisitorProfile,
  UserTraits,
  IdentifyPayload,
  EventProperties,
  TrackPayload,
  EventBatch,
  GroupTraits,
  GroupPayload,
  EventContext,
  ApiResponse,
  WebhookEventType,
  WebhookDeliveryPayload,
  WebhookDeliveryAttempt,
  LifecycleDistribution,
  KPISummary,
  StoredEvent,
  ApiKeyRecord,
} from './types';
