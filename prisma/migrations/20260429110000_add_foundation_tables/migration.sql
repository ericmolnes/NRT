-- Committed schema delta from ba8dbb3 to HEAD.
-- This migration creates the platform foundation tables and includes committed
-- form-filter/contractor-index changes that were already in HEAD before the
-- current RecMan rawJson and personnel course-document migrations.

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('MINIMUM', 'USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SystemNotificationKind" AS ENUM ('ACCESS_REQUEST', 'SYNC_CONFLICT', 'SYNC_FAILURE', 'AI_ACTION', 'DOCUMENT_REVIEW', 'SUPPLIER_REVIEW', 'GENERIC');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ChangeActorType" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('USER_ACTION', 'AI_ASSISTANT', 'RECMAN_SYNC', 'POWEROFFICE_SYNC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('RECMAN', 'POWEROFFICE');

-- CreateEnum
CREATE TYPE "SyncConflictStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SyncResolution" AS ENUM ('KEEP_LOCAL', 'KEEP_REMOTE', 'MERGED', 'MANUAL');

-- CreateEnum
CREATE TYPE "AiActionMode" AS ENUM ('PLAN', 'ASK', 'AUTO', 'ADMIN_BYPASS');

-- CreateEnum
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "EvaluationLink" ADD COLUMN     "categoriesFilter" JSONB,
ADD COLUMN     "departmentsFilter" JSONB;

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" TEXT NOT NULL,
    "entraId" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "level" "AccessLevel" NOT NULL DEFAULT 'MINIMUM',
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "userAccessId" TEXT,
    "entraId" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "requestedLevel" "AccessLevel" NOT NULL DEFAULT 'USER',
    "reason" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotification" (
    "id" TEXT NOT NULL,
    "kind" "SystemNotificationKind" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "targetUserId" TEXT,
    "targetLevel" "AccessLevel",
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "actorType" "ChangeActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "source" "ChangeSource" NOT NULL,
    "summary" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLogEntry" (
    "id" TEXT NOT NULL,
    "changeLogId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncConflict" (
    "id" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT,
    "field" TEXT NOT NULL,
    "localValue" JSONB,
    "remoteValue" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SyncConflictStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "resolution" "SyncResolution",
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "notes" TEXT,
    "changeLogId" TEXT,

    CONSTRAINT "SyncConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiActionRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "mode" "AiActionMode" NOT NULL DEFAULT 'ASK',
    "prompt" TEXT,
    "summary" TEXT,
    "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "changeLogId" TEXT,

    CONSTRAINT "AiActionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_entraId_key" ON "UserAccess"("entraId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccess_email_key" ON "UserAccess"("email");

-- CreateIndex
CREATE INDEX "UserAccess_level_idx" ON "UserAccess"("level");

-- CreateIndex
CREATE INDEX "UserAccess_entraId_idx" ON "UserAccess"("entraId");

-- CreateIndex
CREATE INDEX "UserAccess_email_idx" ON "UserAccess"("email");

-- CreateIndex
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");

-- CreateIndex
CREATE INDEX "AccessRequest_userAccessId_idx" ON "AccessRequest"("userAccessId");

-- CreateIndex
CREATE INDEX "AccessRequest_email_idx" ON "AccessRequest"("email");

-- CreateIndex
CREATE INDEX "AccessRequest_entraId_idx" ON "AccessRequest"("entraId");

-- CreateIndex
CREATE INDEX "AccessRequest_createdAt_idx" ON "AccessRequest"("createdAt");

-- CreateIndex
CREATE INDEX "SystemNotification_kind_idx" ON "SystemNotification"("kind");

-- CreateIndex
CREATE INDEX "SystemNotification_targetUserId_idx" ON "SystemNotification"("targetUserId");

-- CreateIndex
CREATE INDEX "SystemNotification_targetLevel_idx" ON "SystemNotification"("targetLevel");

-- CreateIndex
CREATE INDEX "SystemNotification_readAt_idx" ON "SystemNotification"("readAt");

-- CreateIndex
CREATE INDEX "SystemNotification_targetUserId_readAt_idx" ON "SystemNotification"("targetUserId", "readAt");

-- CreateIndex
CREATE INDEX "SystemNotification_createdAt_idx" ON "SystemNotification"("createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_actorType_idx" ON "ChangeLog"("actorType");

-- CreateIndex
CREATE INDEX "ChangeLog_actorId_idx" ON "ChangeLog"("actorId");

-- CreateIndex
CREATE INDEX "ChangeLog_source_idx" ON "ChangeLog"("source");

-- CreateIndex
CREATE INDEX "ChangeLog_runId_idx" ON "ChangeLog"("runId");

-- CreateIndex
CREATE INDEX "ChangeLog_createdAt_idx" ON "ChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_changeLogId_idx" ON "ChangeLogEntry"("changeLogId");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_model_recordId_idx" ON "ChangeLogEntry"("model", "recordId");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_rolledBackAt_idx" ON "ChangeLogEntry"("rolledBackAt");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_changeLogId_rolledBackAt_idx" ON "ChangeLogEntry"("changeLogId", "rolledBackAt");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_createdAt_idx" ON "ChangeLogEntry"("createdAt");

-- CreateIndex
CREATE INDEX "SyncConflict_source_idx" ON "SyncConflict"("source");

-- CreateIndex
CREATE INDEX "SyncConflict_model_recordId_idx" ON "SyncConflict"("model", "recordId");

-- CreateIndex
CREATE INDEX "SyncConflict_status_idx" ON "SyncConflict"("status");

-- CreateIndex
CREATE INDEX "SyncConflict_detectedAt_idx" ON "SyncConflict"("detectedAt");

-- CreateIndex
CREATE INDEX "SyncConflict_status_detectedAt_idx" ON "SyncConflict"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "AiActionRun_userId_idx" ON "AiActionRun"("userId");

-- CreateIndex
CREATE INDEX "AiActionRun_mode_idx" ON "AiActionRun"("mode");

-- CreateIndex
CREATE INDEX "AiActionRun_status_idx" ON "AiActionRun"("status");

-- CreateIndex
CREATE INDEX "AiActionRun_startedAt_idx" ON "AiActionRun"("startedAt");

-- CreateIndex
CREATE INDEX "AiActionRun_userId_startedAt_idx" ON "AiActionRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ContractorPeriod_recmanCandidateId_endDate_idx" ON "ContractorPeriod"("recmanCandidateId", "endDate");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_userAccessId_fkey" FOREIGN KEY ("userAccessId") REFERENCES "UserAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLogEntry" ADD CONSTRAINT "ChangeLogEntry_changeLogId_fkey" FOREIGN KEY ("changeLogId") REFERENCES "ChangeLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncConflict" ADD CONSTRAINT "SyncConflict_changeLogId_fkey" FOREIGN KEY ("changeLogId") REFERENCES "ChangeLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActionRun" ADD CONSTRAINT "AiActionRun_changeLogId_fkey" FOREIGN KEY ("changeLogId") REFERENCES "ChangeLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
