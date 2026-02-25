/* ==========================================================================
 * Engine Module — Public Exports
 * ========================================================================== */

export { classifyLifecycleState, detectStateTransition } from './lifecycle';
export type { LifecycleClassification } from './lifecycle';

export { scoreChurnRisk } from './churn';

export {
  detectExpansionSignals,
  signalsToOpportunities,
  computeExpansionScore,
} from './expansion';
export type { DetectedSignal } from './expansion';

export {
  evaluateSegmentFilters,
  evaluateSegmentBatch,
  evaluateRule,
  resolveFieldValue,
  USER_FIELDS,
  ACCOUNT_FIELDS,
  ALL_FIELDS,
} from './segmentation';
export type { SegmentEvalResult } from './segmentation';

export {
  renderTemplate,
  resolveVariableValue,
  personalizeEmail,
  evaluateConditionalBlocks,
  resolvePersonalizationRule,
  resolveAllPersonalizations,
  VARIABLE_SOURCES,
} from './personalization';
export type { ResolvedPersonalization } from './personalization';

export {
  prepareCampaignEmails,
  computeCampaignMetrics,
  filterRecipients,
  EMAIL_TEMPLATE_PRESETS,
} from './email-campaigns';
export type {
  CampaignRecipient,
  PreparedEmail,
  CampaignExecutionResult,
  CampaignMetrics,
} from './email-campaigns';

export {
  processEvent,
  processEventBatch,
  processScheduledEnrollments,
} from './event-pipeline';
export type { PipelineResult } from './event-pipeline';

export {
  sendEmail,
  sendEmailBatch,
  getActiveProvider,
  initEmailSystem,
  shutdownEmailSystem,
  getEmailSystemStatus,
  getQueueMetrics,
  getSendLog,
  getSendRecord,
  setRateLimit,
  retryDLQEntry,
  removeDLQEntry,
  getEmailDLQ,
  isSuppressed,
  getSuppressionEntry,
  addSuppression,
  recordBounce,
  recordComplaint,
  recordUnsubscribe,
  removeSuppression,
  filterSuppressed,
  getAllSuppressions,
  getSuppressionStats,
  verifyTrackingToken,
  recordTrackingEvent,
  getCampaignTrackingStats,
  getMessageTrackingStats,
  getTrackingEvents,
  TRACKING_PIXEL_GIF,
} from './email';
export type {
  EmailPayload,
  EmailResult,
  EmailSystemStatus,
  QueueMetrics,
  SendRecord,
  EmailPriority,
  SuppressionEntry,
  SuppressionStats,
  SuppressionReason,
  TrackingEvent,
  TrackingStats,
} from './email';

export {
  matchesTrigger,
  createEnrollment,
  processEnrollment,
  tickEnrollment,
  findTriggerNode,
} from './flow';
export type { TriggerEvent, TickAction, TickResult } from './flow';

export { dispatchWebhooks, getDeliveryLog, getDLQ } from './webhooks';
export type { DispatchSummary } from './webhooks';
