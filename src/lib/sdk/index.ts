/* ==========================================================================
 * @lifecycleos/sdk — Public Entry Point
 *
 * Re-exports the client class and all public types so consumers import
 * from a single module:
 *
 *   import { LifecycleOS } from '@/lib/sdk';
 *   import type { UserTraits, EventProperties } from '@/lib/sdk';
 * ========================================================================== */

export { LifecycleOS } from './client';
export type {
  LifecycleOSConfig,
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
