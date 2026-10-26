/**
 * Domain enums. These mirror prisma/schema.prisma exactly and are the only
 * enum source domain code may import; domain modules never import
 * @prisma/client (Phase 5 acceptance: rules import no Prisma types).
 */

export const Role = {
  patient: 'patient',
  therapist: 'therapist',
  safety_team: 'safety_team',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  active: 'active',
  suspended: 'suspended',
  deletion_pending: 'deletion_pending',
  deleted: 'deleted',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** B01. `escalated_external` is a flag on the alert, not a state. */
export const AlertState = {
  detected: 'detected',
  dispatched: 'dispatched',
  delivered: 'delivered',
  acknowledged: 'acknowledged',
  patient_contacted: 'patient_contacted',
  resolved: 'resolved',
  closed: 'closed',
} as const;
export type AlertState = (typeof AlertState)[keyof typeof AlertState];

export const ALERT_STATES: readonly AlertState[] = Object.values(AlertState);

export const CrisisTier = {
  tier1: 'tier1',
  tier2: 'tier2',
  tier3: 'tier3',
  possible_concern: 'possible_concern',
} as const;
export type CrisisTier = (typeof CrisisTier)[keyof typeof CrisisTier];

export const CrisisTrigger = {
  tier3_explicit_language: 'tier3_explicit_language',
  tier2_ai_signal: 'tier2_ai_signal',
  tier1_ai_signal: 'tier1_ai_signal',
  self_initiated: 'self_initiated',
  survey_item9: 'survey_item9',
  possible_concern: 'possible_concern',
} as const;
export type CrisisTrigger = (typeof CrisisTrigger)[keyof typeof CrisisTrigger];

export const ConsentItem = {
  mood_task_data: 'mood_task_data',
  journal_storage: 'journal_storage',
  journal_ai_analysis: 'journal_ai_analysis',
  crisis_detection: 'crisis_detection',
  tier3_therapist_alert: 'tier3_therapist_alert',
  therapist_data_sharing: 'therapist_data_sharing',
} as const;
export type ConsentItem = (typeof ConsentItem)[keyof typeof ConsentItem];

/** Stable order for GET /v1/consents. */
export const CONSENT_ITEMS: readonly ConsentItem[] = Object.values(ConsentItem);

export const ConsentSource = {
  onboarding: 'onboarding',
  settings: 'settings',
  withdrawal_confirmed: 'withdrawal_confirmed',
} as const;
export type ConsentSource = (typeof ConsentSource)[keyof typeof ConsentSource];

export const RestrictionLevel = {
  none: 'none',
  level1: 'level1',
  level2: 'level2',
  level3: 'level3',
} as const;
export type RestrictionLevel = (typeof RestrictionLevel)[keyof typeof RestrictionLevel];

/** Internal only. Never returned to a patient. */
export const Stage = {
  stage1: 'stage1',
  stage2: 'stage2',
  stage3: 'stage3',
} as const;
export type Stage = (typeof Stage)[keyof typeof Stage];

export const ConnectionState = {
  pending_therapist: 'pending_therapist',
  awaiting_patient_confirmation: 'awaiting_patient_confirmation',
  active: 'active',
  ended: 'ended',
  flagged_wrong: 'flagged_wrong',
} as const;
export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export const VerificationStatus = {
  pending: 'pending',
  verified: 'verified',
  expired_grace: 'expired_grace',
  suspended: 'suspended',
  revoked: 'revoked',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const JournalKind = {
  recovery: 'recovery',
  personal: 'personal',
} as const;
export type JournalKind = (typeof JournalKind)[keyof typeof JournalKind];

export const JournalPrivacy = {
  hidden_from_therapist: 'hidden_from_therapist',
  progress_only: 'progress_only',
  full_access: 'full_access',
} as const;
export type JournalPrivacy = (typeof JournalPrivacy)[keyof typeof JournalPrivacy];

export const AnalysisStatus = {
  pending: 'pending',
  queued: 'queued',
  succeeded: 'succeeded',
  failed: 'failed',
} as const;
export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const SentimentSignal = {
  positive: 'positive',
  neutral: 'neutral',
  negative: 'negative',
  crisis: 'crisis',
} as const;
export type SentimentSignal = (typeof SentimentSignal)[keyof typeof SentimentSignal];

export const TaskStatus = {
  approved: 'approved',
  paused: 'paused',
  removed: 'removed',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const SurveyStatus = {
  in_progress: 'in_progress',
  completed: 'completed',
} as const;
export type SurveyStatus = (typeof SurveyStatus)[keyof typeof SurveyStatus];

export const RequestStatus = {
  pending: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const SafetyFlagReason = {
  analysis_failed: 'analysis_failed',
  possible_concern: 'possible_concern',
  wrong_connection: 'wrong_connection',
  bulk_export_anomaly: 'bulk_export_anomaly',
  sms_delivery_failed: 'sms_delivery_failed',
} as const;
export type SafetyFlagReason = (typeof SafetyFlagReason)[keyof typeof SafetyFlagReason];

export const NotificationType = {
  crisis_alert: 'crisis_alert',
  daily_checkin: 'daily_checkin',
  task_reminder: 'task_reminder',
  inactivity: 'inactivity',
  connection_update: 'connection_update',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Stable order for GET /v1/notification-preferences. */
export const NOTIFICATION_TYPES: readonly NotificationType[] = Object.values(NotificationType);

/** Two-step crisis-monitoring withdrawal (R-CONSENT-3). */
export const WithdrawalStatus = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  expired: 'expired',
} as const;
export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

/** Crisis notification types can never be disabled by a patient (R-NOTIF-4). */
export const NON_DISABLEABLE_NOTIFICATION_TYPES: readonly NotificationType[] = [
  NotificationType.crisis_alert,
  NotificationType.connection_update,
];

const CONSENT_ITEM_SET: ReadonlySet<string> = new Set(CONSENT_ITEMS);
const NOTIFICATION_TYPE_SET: ReadonlySet<string> = new Set(NOTIFICATION_TYPES);

export function isConsentItem(value: string): value is ConsentItem {
  return CONSENT_ITEM_SET.has(value);
}

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPE_SET.has(value);
}
