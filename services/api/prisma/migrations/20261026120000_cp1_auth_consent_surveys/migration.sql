-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'expired');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "items" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "journal_privacy" "JournalPrivacy" NOT NULL DEFAULT 'hidden_from_therapist',
ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "crisis_monitoring_withdrawals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crisis_monitoring_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crisis_monitoring_withdrawals_user_id_status_idx" ON "crisis_monitoring_withdrawals"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "crisis_monitoring_withdrawals_user_id_client_id_key" ON "crisis_monitoring_withdrawals"("user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "crisis_monitoring_withdrawals" ADD CONSTRAINT "crisis_monitoring_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
