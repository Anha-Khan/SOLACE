import { randomUUID } from 'node:crypto';
import {
  AnalysisStatus,
  type AlertState,
  type ConnectionState,
  type ConsentItem,
  type ConsentSource,
  type CrisisTier,
  type CrisisTrigger,
  type JournalKind,
  type NotificationType,
  type RestrictionLevel,
  type SafetyFlagReason,
  type SentimentSignal,
  type Stage,
  type SurveyStatus,
  type TaskStatus,
  type VerificationStatus,
  type Role,
  type UserStatus,
  type RequestStatus,
} from './enums';

/**
 * Domain factories. Every entity is returned fully populated: no required field
 * is ever undefined. Optional fields are `null`, never omitted.
 *
 * Append-only entities (consent records, alert events, access log, crisis
 * events, safety team flags, AI scans) have no `updatedAt` by design.
 */

export interface Entity {
  id: string;
  createdAt: Date;
}

export interface MutableEntity extends Entity {
  updatedAt: Date;
}

function newId(): string {
  return randomUUID();
}

function mutable(): MutableEntity {
  const now = new Date();
  return { id: newId(), createdAt: now, updatedAt: now };
}

function immutable(): Entity {
  return { id: newId(), createdAt: new Date() };
}

export interface UserEntity extends MutableEntity {
  role: Role;
  status: UserStatus;
  ageConfirmedAt: Date | null;
  deletedAt: Date | null;
}

export function createUser(input: {
  role: Role;
  status?: UserStatus;
  ageConfirmedAt?: Date | null;
}): UserEntity {
  return {
    ...mutable(),
    role: input.role,
    status: input.status ?? 'active',
    ageConfirmedAt: input.ageConfirmedAt ?? null,
    deletedAt: null,
  };
}

export interface SessionEntity extends MutableEntity {
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  deviceLabel: string | null;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export function createSession(input: {
  userId: string;
  refreshTokenHash: string;
  familyId?: string;
  deviceLabel?: string | null;
  lastSeenAt?: Date;
}): SessionEntity {
  return {
    ...mutable(),
    userId: input.userId,
    familyId: input.familyId ?? newId(),
    refreshTokenHash: input.refreshTokenHash,
    deviceLabel: input.deviceLabel ?? null,
    lastSeenAt: input.lastSeenAt ?? new Date(),
    revokedAt: null,
  };
}

export interface ConsentRecordEntity {
  id: string;
  userId: string;
  item: ConsentItem;
  granted: boolean;
  source: ConsentSource;
  appVersion: string | null;
  recordedAt: Date;
}

export function createConsentRecord(input: {
  userId: string;
  item: ConsentItem;
  granted: boolean;
  source: ConsentSource;
  appVersion?: string | null;
  recordedAt?: Date;
}): ConsentRecordEntity {
  return {
    id: newId(),
    userId: input.userId,
    item: input.item,
    granted: input.granted,
    source: input.source,
    appVersion: input.appVersion ?? null,
    recordedAt: input.recordedAt ?? new Date(),
  };
}

export interface SurveyEntity extends MutableEntity {
  key: string;
  title: string;
  version: number;
}

export function createSurvey(input: {
  key: string;
  title: string;
  version?: number;
}): SurveyEntity {
  return { ...mutable(), key: input.key, title: input.title, version: input.version ?? 1 };
}

export interface SurveyResponseEntity extends MutableEntity {
  userId: string;
  surveyId: string;
  clientId: string;
  responses: Record<string, number | string>;
  status: SurveyStatus;
  clientCreatedAt: Date;
  serverReceivedAt: Date;
  completedAt: Date | null;
}

export function createSurveyResponse(input: {
  userId: string;
  surveyId: string;
  clientId: string;
  responses: Record<string, number | string>;
  status?: SurveyStatus;
  clientCreatedAt: Date;
  completedAt?: Date | null;
}): SurveyResponseEntity {
  return {
    ...mutable(),
    userId: input.userId,
    surveyId: input.surveyId,
    clientId: input.clientId,
    responses: input.responses,
    status: input.status ?? 'in_progress',
    clientCreatedAt: input.clientCreatedAt,
    serverReceivedAt: new Date(),
    completedAt: input.completedAt ?? null,
  };
}

export interface SurveyResultEntity {
  id: string;
  userId: string;
  surveyId: string;
  responseId: string;
  scores: Record<string, number>;
  totalScore: number;
  phq9Item9: number | null;
  createdAt: Date;
}

export function createSurveyResult(input: {
  userId: string;
  surveyId: string;
  responseId: string;
  scores: Record<string, number>;
  totalScore: number;
  phq9Item9?: number | null;
}): SurveyResultEntity {
  return {
    id: newId(),
    userId: input.userId,
    surveyId: input.surveyId,
    responseId: input.responseId,
    scores: input.scores,
    totalScore: input.totalScore,
    phq9Item9: input.phq9Item9 ?? null,
    createdAt: new Date(),
  };
}

export interface SafetyPlanEntity extends MutableEntity {
  userId: string;
  field1Ciphertext: string | null;
  field2Ciphertext: string | null;
  field3Ciphertext: string | null;
  field4Ciphertext: string | null;
  field5Ciphertext: string | null;
  sharedWithTherapist: boolean;
  keyId: string;
}

export function createSafetyPlan(input: {
  userId: string;
  keyId: string;
  fields?: Partial<Record<'field1' | 'field2' | 'field3' | 'field4' | 'field5', string | null>>;
}): SafetyPlanEntity {
  const fields = input.fields ?? {};
  return {
    ...mutable(),
    userId: input.userId,
    field1Ciphertext: fields.field1 ?? null,
    field2Ciphertext: fields.field2 ?? null,
    field3Ciphertext: fields.field3 ?? null,
    field4Ciphertext: fields.field4 ?? null,
    field5Ciphertext: fields.field5 ?? null,
    sharedWithTherapist: false,
    keyId: input.keyId,
  };
}

export interface CheckInEntity extends Entity {
  userId: string;
  clientId: string;
  mood: number;
  feelingWords: string[];
  bodySignal: string | null;
  taskReflection: string | null;
  clientCreatedAt: Date;
  serverReceivedAt: Date;
}

export function createCheckIn(input: {
  userId: string;
  clientId: string;
  mood: number;
  feelingWords: string[];
  bodySignal?: string | null;
  taskReflection?: string | null;
  clientCreatedAt: Date;
}): CheckInEntity {
  if (!Number.isInteger(input.mood) || input.mood < 1 || input.mood > 10) {
    throw new RangeError('CheckIn.mood must be an integer from 1 to 10');
  }
  return {
    ...immutable(),
    userId: input.userId,
    clientId: input.clientId,
    mood: input.mood,
    feelingWords: [...input.feelingWords],
    bodySignal: input.bodySignal ?? null,
    taskReflection: input.taskReflection ?? null,
    clientCreatedAt: input.clientCreatedAt,
    serverReceivedAt: new Date(),
  };
}

export interface TaskLibraryItemEntity extends MutableEntity {
  key: string;
  version: number;
  stage: Stage;
  category: string;
  eligibility: Record<string, unknown>;
  reviewerSignOffId: string | null;
  status: TaskStatus;
}

export function createTaskLibraryItem(input: {
  key: string;
  stage: Stage;
  category: string;
  eligibility?: Record<string, unknown>;
  reviewerSignOffId?: string | null;
  status?: TaskStatus;
  version?: number;
}): TaskLibraryItemEntity {
  return {
    ...mutable(),
    key: input.key,
    version: input.version ?? 1,
    stage: input.stage,
    category: input.category,
    eligibility: input.eligibility ?? {},
    reviewerSignOffId: input.reviewerSignOffId ?? null,
    status: input.status ?? 'approved',
  };
}

export interface TaskAssignmentEntity extends MutableEntity {
  userId: string;
  taskKey: string;
  assignedFor: Date;
  completedAt: Date | null;
  helpRating: number | null;
  swapReason: string | null;
}

export function createTaskAssignment(input: {
  userId: string;
  taskKey: string;
  assignedFor: Date;
  swapReason?: string | null;
}): TaskAssignmentEntity {
  return {
    ...mutable(),
    userId: input.userId,
    taskKey: input.taskKey,
    assignedFor: input.assignedFor,
    completedAt: null,
    helpRating: null,
    swapReason: input.swapReason ?? null,
  };
}

export interface JournalEntryEntity extends MutableEntity {
  userId: string;
  kind: JournalKind;
  clientId: string;
  ciphertext: string;
  keyId: string;
  clientCreatedAt: Date;
  serverReceivedAt: Date;
  analysisStatus: AnalysisStatus;
  historical: boolean;
}

export function createJournalEntry(input: {
  userId: string;
  kind: JournalKind;
  clientId: string;
  ciphertext: string;
  keyId: string;
  clientCreatedAt: Date;
  analysisStatus?: AnalysisStatus;
  historical?: boolean;
}): JournalEntryEntity {
  return {
    ...mutable(),
    userId: input.userId,
    kind: input.kind,
    clientId: input.clientId,
    ciphertext: input.ciphertext,
    keyId: input.keyId,
    clientCreatedAt: input.clientCreatedAt,
    serverReceivedAt: new Date(),
    analysisStatus: input.analysisStatus ?? 'pending',
    historical: input.historical ?? false,
  };
}

export interface AiScanEntity {
  id: string;
  entryId: string;
  analysisAt: Date;
  provider: string;
  sentimentSignal: SentimentSignal;
  crisisDetected: boolean;
  durationMs: number;
  status: AnalysisStatus;
  createdAt: Date;
}

export function createAiScan(input: {
  entryId: string;
  provider: string;
  sentimentSignal: SentimentSignal;
  crisisDetected: boolean;
  durationMs: number;
  status: AnalysisStatus;
}): AiScanEntity {
  return {
    id: newId(),
    entryId: input.entryId,
    analysisAt: new Date(),
    provider: input.provider,
    sentimentSignal: input.sentimentSignal,
    crisisDetected: input.crisisDetected,
    durationMs: input.durationMs,
    status: input.status,
    createdAt: new Date(),
  };
}

export interface CrisisEventEntity {
  id: string;
  userId: string;
  tier: CrisisTier;
  triggerType: CrisisTrigger;
  ruleVersion: string;
  sourceRef: string | null;
  entryId: string | null;
  clientCreatedAt: Date;
  serverReceivedAt: Date;
  historical: boolean;
  createdAt: Date;
}

export function createCrisisEvent(input: {
  userId: string;
  tier: CrisisTier;
  triggerType: CrisisTrigger;
  ruleVersion: string;
  sourceRef?: string | null;
  entryId?: string | null;
  clientCreatedAt: Date;
  historical?: boolean;
}): CrisisEventEntity {
  return {
    id: newId(),
    userId: input.userId,
    tier: input.tier,
    triggerType: input.triggerType,
    ruleVersion: input.ruleVersion,
    sourceRef: input.sourceRef ?? null,
    entryId: input.entryId ?? null,
    clientCreatedAt: input.clientCreatedAt,
    serverReceivedAt: new Date(),
    historical: input.historical ?? false,
    createdAt: new Date(),
  };
}

export interface CrisisAlertEntity extends MutableEntity {
  userId: string;
  crisisEventId: string;
  state: AlertState;
  escalatedExternal: boolean;
  reviewedAt: Date | null;
  undoDeadline: Date | null;
  checklist: Record<string, boolean>;
  resolvedAt: Date | null;
  autoClosedAt: Date | null;
}

export function createCrisisAlert(input: {
  userId: string;
  crisisEventId: string;
  state?: AlertState;
}): CrisisAlertEntity {
  return {
    ...mutable(),
    userId: input.userId,
    crisisEventId: input.crisisEventId,
    state: input.state ?? 'detected',
    escalatedExternal: false,
    reviewedAt: null,
    undoDeadline: null,
    checklist: {},
    resolvedAt: null,
    autoClosedAt: null,
  };
}

export interface AlertEventEntity {
  id: string;
  alertId: string;
  fromState: AlertState | null;
  toState: AlertState;
  actor: string;
  reason: string | null;
  at: Date;
}

export function createAlertEvent(input: {
  alertId: string;
  fromState: AlertState | null;
  toState: AlertState;
  actor: string;
  reason?: string | null;
}): AlertEventEntity {
  return {
    id: newId(),
    alertId: input.alertId,
    fromState: input.fromState,
    toState: input.toState,
    actor: input.actor,
    reason: input.reason ?? null,
    at: new Date(),
  };
}

export interface TherapistProfileEntity extends MutableEntity {
  userId: string;
  licenceCiphertext: string;
  keyId: string;
  professionalBody: string;
  countryOfPractice: string;
  verificationStatus: VerificationStatus;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  graceEndsAt: Date | null;
  suspendedAt: Date | null;
  responseTimeBand: string | null;
  mfaEnabled: boolean;
}

export function createTherapistProfile(input: {
  userId: string;
  licenceCiphertext: string;
  keyId: string;
  professionalBody: string;
  countryOfPractice: string;
  verificationStatus?: VerificationStatus;
}): TherapistProfileEntity {
  return {
    ...mutable(),
    userId: input.userId,
    licenceCiphertext: input.licenceCiphertext,
    keyId: input.keyId,
    professionalBody: input.professionalBody,
    countryOfPractice: input.countryOfPractice,
    verificationStatus: input.verificationStatus ?? 'pending',
    verifiedAt: null,
    expiresAt: null,
    graceEndsAt: null,
    suspendedAt: null,
    responseTimeBand: null,
    mfaEnabled: false,
  };
}

export interface InviteEntity extends MutableEntity {
  patientId: string;
  therapistEmail: string;
  therapistUserId: string | null;
  tokenHash: string;
  patientFirstName: string;
  expiresAt: Date;
  status: string;
}

export function createInvite(input: {
  patientId: string;
  therapistEmail: string;
  patientFirstName: string;
  tokenHash: string;
  expiresAt: Date;
}): InviteEntity {
  return {
    ...mutable(),
    patientId: input.patientId,
    therapistEmail: input.therapistEmail,
    therapistUserId: null,
    tokenHash: input.tokenHash,
    patientFirstName: input.patientFirstName,
    expiresAt: input.expiresAt,
    status: 'pending',
  };
}

export interface ConnectionEntity extends MutableEntity {
  patientId: string;
  therapistId: string;
  state: ConnectionState;
  confirmedAt: Date | null;
  endedAt: Date | null;
  wrongConnectionFlag: boolean;
}

export function createConnection(input: {
  patientId: string;
  therapistId: string;
  state?: ConnectionState;
}): ConnectionEntity {
  return {
    ...mutable(),
    patientId: input.patientId,
    therapistId: input.therapistId,
    state: input.state ?? 'pending_therapist',
    confirmedAt: null,
    endedAt: null,
    wrongConnectionFlag: false,
  };
}

export interface AccessLogEntryEntity {
  id: string;
  patientId: string;
  viewerId: string;
  dataType: string;
  at: Date;
}

export function createAccessLogEntry(input: {
  patientId: string;
  viewerId: string;
  dataType: string;
  at?: Date;
}): AccessLogEntryEntity {
  return {
    id: newId(),
    patientId: input.patientId,
    viewerId: input.viewerId,
    dataType: input.dataType,
    at: input.at ?? new Date(),
  };
}

export interface RestrictionStateEntity extends MutableEntity {
  userId: string;
  level: RestrictionLevel;
  timerStartedAt: Date | null;
  pausedAt: Date | null;
  pausedDaysTotal: number;
  invitePending: boolean;
}

export function createRestrictionState(input: {
  userId: string;
  level?: RestrictionLevel;
  timerStartedAt?: Date | null;
}): RestrictionStateEntity {
  return {
    ...mutable(),
    userId: input.userId,
    level: input.level ?? 'none',
    timerStartedAt: input.timerStartedAt ?? null,
    pausedAt: null,
    pausedDaysTotal: 0,
    invitePending: false,
  };
}

export interface StageStateEntity extends MutableEntity {
  userId: string;
  stage: Stage;
  approvalHoldUntil: Date | null;
}

export function createStageState(input: { userId: string; stage?: Stage }): StageStateEntity {
  return {
    ...mutable(),
    userId: input.userId,
    stage: input.stage ?? 'stage1',
    approvalHoldUntil: null,
  };
}

export interface ResourceEntity extends MutableEntity {
  name: string;
  number: string;
  hours: string;
  ownerName: string;
  lastVerifiedAt: Date;
  isEmergency: boolean;
}

export function createResource(input: {
  name: string;
  number: string;
  hours: string;
  ownerName: string;
  lastVerifiedAt: Date;
  isEmergency?: boolean;
}): ResourceEntity {
  return {
    ...mutable(),
    name: input.name,
    number: input.number,
    hours: input.hours,
    ownerName: input.ownerName,
    lastVerifiedAt: input.lastVerifiedAt,
    isEmergency: input.isEmergency ?? false,
  };
}

export interface DeviceTokenEntity extends Entity {
  userId: string;
  fcmToken: string;
  platform: string;
  lastSeenAt: Date;
}

export function createDeviceToken(input: {
  userId: string;
  fcmToken: string;
  platform: string;
}): DeviceTokenEntity {
  return {
    ...immutable(),
    userId: input.userId,
    fcmToken: input.fcmToken,
    platform: input.platform,
    lastSeenAt: new Date(),
  };
}

export interface NotificationPreferenceEntity extends MutableEntity {
  userId: string;
  type: NotificationType;
  enabled: boolean;
}

export function createNotificationPreference(input: {
  userId: string;
  type: NotificationType;
  enabled?: boolean;
}): NotificationPreferenceEntity {
  return {
    ...mutable(),
    userId: input.userId,
    type: input.type,
    enabled: input.enabled ?? true,
  };
}

export interface DeletionRequestEntity extends MutableEntity {
  userId: string;
  status: RequestStatus;
  referenceNumber: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  completedAt: Date | null;
}

export function createDeletionRequest(input: {
  userId: string;
  referenceNumber: string;
  status?: RequestStatus;
}): DeletionRequestEntity {
  return {
    ...mutable(),
    userId: input.userId,
    status: input.status ?? 'pending',
    referenceNumber: input.referenceNumber,
    requestedAt: new Date(),
    confirmedAt: null,
    completedAt: null,
  };
}

export interface ExportRequestEntity extends MutableEntity {
  userId: string;
  status: RequestStatus;
  requestedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
}

export function createExportRequest(input: {
  userId: string;
  status?: RequestStatus;
}): ExportRequestEntity {
  return {
    ...mutable(),
    userId: input.userId,
    status: input.status ?? 'pending',
    requestedAt: new Date(),
    completedAt: null,
    expiresAt: null,
  };
}

export interface SafetyTeamFlagEntity {
  id: string;
  userId: string;
  reason: SafetyFlagReason;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export function createSafetyTeamFlag(input: {
  userId: string;
  reason: SafetyFlagReason;
}): SafetyTeamFlagEntity {
  return {
    id: newId(),
    userId: input.userId,
    reason: input.reason,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
  };
}
