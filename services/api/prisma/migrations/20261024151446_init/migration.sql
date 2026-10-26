-- CreateEnum
CREATE TYPE "Role" AS ENUM ('patient', 'therapist', 'safety_team');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deletion_pending', 'deleted');

-- CreateEnum
CREATE TYPE "AlertState" AS ENUM ('detected', 'dispatched', 'delivered', 'acknowledged', 'patient_contacted', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "CrisisTier" AS ENUM ('tier1', 'tier2', 'tier3', 'possible_concern');

-- CreateEnum
CREATE TYPE "CrisisTrigger" AS ENUM ('tier3_explicit_language', 'tier2_ai_signal', 'tier1_ai_signal', 'self_initiated', 'survey_item9', 'possible_concern');

-- CreateEnum
CREATE TYPE "ConsentItem" AS ENUM ('mood_task_data', 'journal_storage', 'journal_ai_analysis', 'crisis_detection', 'tier3_therapist_alert', 'therapist_data_sharing');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('onboarding', 'settings', 'withdrawal_confirmed');

-- CreateEnum
CREATE TYPE "RestrictionLevel" AS ENUM ('none', 'level1', 'level2', 'level3');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('stage1', 'stage2', 'stage3');

-- CreateEnum
CREATE TYPE "ConnectionState" AS ENUM ('pending_therapist', 'awaiting_patient_confirmation', 'active', 'ended', 'flagged_wrong');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'expired_grace', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "JournalKind" AS ENUM ('recovery', 'personal');

-- CreateEnum
CREATE TYPE "JournalPrivacy" AS ENUM ('hidden_from_therapist', 'progress_only', 'full_access');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'queued', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "SentimentSignal" AS ENUM ('positive', 'neutral', 'negative', 'crisis');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('approved', 'paused', 'removed');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('in_progress', 'completed');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "SafetyFlagReason" AS ENUM ('analysis_failed', 'possible_concern', 'wrong_connection', 'bulk_export_anomaly', 'sms_delivery_failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('crisis_alert', 'daily_checkin', 'task_reminder', 'inactivity', 'connection_update');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "age_confirmed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item" "ConsentItem" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "app_version" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "responses" JSONB NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'in_progress',
    "client_created_at" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_results" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "scores" JSONB NOT NULL,
    "total_score" INTEGER NOT NULL,
    "phq9_item9" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "field1_ciphertext" TEXT,
    "field2_ciphertext" TEXT,
    "field3_ciphertext" TEXT,
    "field4_ciphertext" TEXT,
    "field5_ciphertext" TEXT,
    "shared_with_therapist" BOOLEAN NOT NULL DEFAULT false,
    "key_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "mood" INTEGER NOT NULL,
    "feeling_words" TEXT[],
    "body_signal" TEXT,
    "task_reflection" TEXT,
    "client_created_at" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_library_items" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stage" "Stage" NOT NULL,
    "category" TEXT NOT NULL,
    "eligibility" JSONB NOT NULL,
    "reviewer_sign_off_id" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_key" TEXT NOT NULL,
    "assigned_for" DATE NOT NULL,
    "completed_at" TIMESTAMP(3),
    "help_rating" INTEGER,
    "swap_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "JournalKind" NOT NULL,
    "client_id" UUID NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "client_created_at" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "historical" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_scans" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "analysis_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "sentiment_signal" "SentimentSignal" NOT NULL,
    "crisis_detected" BOOLEAN NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "status" "AnalysisStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" "CrisisTier" NOT NULL,
    "trigger_type" "CrisisTrigger" NOT NULL,
    "rule_version" TEXT NOT NULL,
    "source_ref" TEXT,
    "entry_id" UUID,
    "client_created_at" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historical" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crisis_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "crisis_event_id" UUID NOT NULL,
    "state" "AlertState" NOT NULL DEFAULT 'detected',
    "escalated_external" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_at" TIMESTAMP(3),
    "undo_deadline" TIMESTAMP(3),
    "checklist" JSONB NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "auto_closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crisis_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" UUID NOT NULL,
    "alert_id" UUID NOT NULL,
    "from_state" "AlertState",
    "to_state" "AlertState" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "licence_ciphertext" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "professional_body" TEXT NOT NULL,
    "country_of_practice" TEXT NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "response_time_band" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "therapist_email" TEXT NOT NULL,
    "therapist_user_id" UUID,
    "token_hash" TEXT NOT NULL,
    "patient_first_name" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "state" "ConnectionState" NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "wrong_connection_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_log" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "data_type" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restriction_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level" "RestrictionLevel" NOT NULL DEFAULT 'none',
    "timer_started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "paused_days_total" INTEGER NOT NULL DEFAULT 0,
    "invite_pending" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restriction_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stage" "Stage" NOT NULL DEFAULT 'stage1',
    "approval_hold_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "last_verified_at" TIMESTAMP(3) NOT NULL,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reference_number" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_team_flags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" "SafetyFlagReason" NOT NULL,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_team_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE INDEX "consent_records_user_id_item_recorded_at_idx" ON "consent_records"("user_id", "item", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "surveys_key_key" ON "surveys"("key");

-- CreateIndex
CREATE INDEX "survey_responses_user_id_survey_id_idx" ON "survey_responses"("user_id", "survey_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_user_id_client_id_key" ON "survey_responses"("user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_results_response_id_key" ON "survey_results"("response_id");

-- CreateIndex
CREATE INDEX "survey_results_user_id_created_at_idx" ON "survey_results"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "safety_plans_user_id_key" ON "safety_plans"("user_id");

-- CreateIndex
CREATE INDEX "check_ins_user_id_created_at_idx" ON "check_ins"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_user_id_client_id_key" ON "check_ins"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "task_library_items_stage_status_idx" ON "task_library_items"("stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_library_items_key_version_key" ON "task_library_items"("key", "version");

-- CreateIndex
CREATE INDEX "task_assignments_user_id_assigned_for_idx" ON "task_assignments"("user_id", "assigned_for");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_user_id_assigned_for_key" ON "task_assignments"("user_id", "assigned_for");

-- CreateIndex
CREATE INDEX "journal_entries_user_id_kind_created_at_idx" ON "journal_entries"("user_id", "kind", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_user_id_client_id_key" ON "journal_entries"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "ai_scans_entry_id_idx" ON "ai_scans"("entry_id");

-- CreateIndex
CREATE INDEX "crisis_events_user_id_created_at_idx" ON "crisis_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "crisis_events_tier_created_at_idx" ON "crisis_events"("tier", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "crisis_alerts_crisis_event_id_key" ON "crisis_alerts"("crisis_event_id");

-- CreateIndex
CREATE INDEX "crisis_alerts_state_idx" ON "crisis_alerts"("state");

-- CreateIndex
CREATE INDEX "crisis_alerts_user_id_created_at_idx" ON "crisis_alerts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "crisis_alerts_state_created_at_idx" ON "crisis_alerts"("state", "created_at");

-- CreateIndex
CREATE INDEX "alert_events_alert_id_at_idx" ON "alert_events"("alert_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_profiles_user_id_key" ON "therapist_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateIndex
CREATE INDEX "invites_patient_id_status_idx" ON "invites"("patient_id", "status");

-- CreateIndex
CREATE INDEX "invites_therapist_email_idx" ON "invites"("therapist_email");

-- CreateIndex
CREATE INDEX "connections_patient_id_state_idx" ON "connections"("patient_id", "state");

-- CreateIndex
CREATE INDEX "connections_therapist_id_state_idx" ON "connections"("therapist_id", "state");

-- CreateIndex
CREATE INDEX "access_log_patient_id_at_idx" ON "access_log"("patient_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "restriction_states_user_id_key" ON "restriction_states"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_states_user_id_key" ON "stage_states"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_fcm_token_key" ON "device_tokens"("fcm_token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_type_key" ON "notification_preferences"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "deletion_requests_reference_number_key" ON "deletion_requests"("reference_number");

-- CreateIndex
CREATE INDEX "deletion_requests_user_id_status_idx" ON "deletion_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "export_requests_user_id_status_idx" ON "export_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "safety_team_flags_reason_created_at_idx" ON "safety_team_flags"("reason", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_results" ADD CONSTRAINT "survey_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_results" ADD CONSTRAINT "survey_results_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_results" ADD CONSTRAINT "survey_results_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scans" ADD CONSTRAINT "ai_scans_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_alerts" ADD CONSTRAINT "crisis_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_alerts" ADD CONSTRAINT "crisis_alerts_crisis_event_id_fkey" FOREIGN KEY ("crisis_event_id") REFERENCES "crisis_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "crisis_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_therapist_user_id_fkey" FOREIGN KEY ("therapist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restriction_states" ADD CONSTRAINT "restriction_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_states" ADD CONSTRAINT "stage_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_requests" ADD CONSTRAINT "export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_team_flags" ADD CONSTRAINT "safety_team_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
