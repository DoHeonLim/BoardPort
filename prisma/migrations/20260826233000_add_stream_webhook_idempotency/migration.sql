-- File Name : prisma/migrations/20260826233000_add_stream_webhook_idempotency/migration.sql
-- Description : Cloudflare webhook 중복·역순 처리 방지와 post-commit outbox 추가
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.08.26  임도헌   Created   inbox/outbox, provider 세션 시각, terminal event 순서 필드 추가

ALTER TABLE "Broadcast"
ADD COLUMN IF NOT EXISTS "providerSessionStartedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "providerSessionEndedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastProviderEventAt" TIMESTAMP(3);

UPDATE "Broadcast"
SET
  "providerSessionStartedAt" = COALESCE("providerSessionStartedAt", "started_at"),
  "providerSessionEndedAt" = COALESCE("providerSessionEndedAt", "ended_at"),
  "lastProviderEventAt" = COALESCE(
    "lastProviderEventAt",
    "ended_at",
    "started_at"
  )
WHERE "started_at" IS NOT NULL OR "ended_at" IS NOT NULL;

ALTER TABLE "VodAsset"
ADD COLUMN IF NOT EXISTS "providerCreatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastProviderEventAt" TIMESTAMP(3);

UPDATE "VodAsset"
SET
  "providerCreatedAt" = COALESCE("providerCreatedAt", "ready_at", "created_at"),
  "lastProviderEventAt" = COALESCE("lastProviderEventAt", "ready_at", "created_at");

ALTER TABLE "PostVideo"
ADD COLUMN IF NOT EXISTS "lastProviderEventAt" TIMESTAMP(3);

UPDATE "PostVideo"
SET "lastProviderEventAt" = COALESCE("lastProviderEventAt", "updated_at")
WHERE "status" IN ('READY', 'FAILED');

CREATE TABLE IF NOT EXISTS "CloudflareWebhookEvent" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "liveInputUid" TEXT,
  "assetUid" TEXT,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "lastError" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudflareWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StreamWebhookOutbox" (
  "id" SERIAL NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "lastError" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "webhookEventId" INTEGER NOT NULL,
  CONSTRAINT "StreamWebhookOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CloudflareWebhookEvent_payloadHash_key"
ON "CloudflareWebhookEvent"("payloadHash");
CREATE INDEX IF NOT EXISTS "CloudflareWebhookEvent_status_available_at_idx"
ON "CloudflareWebhookEvent"("status", "available_at");
CREATE INDEX IF NOT EXISTS "CloudflareWebhookEvent_eventType_eventAt_idx"
ON "CloudflareWebhookEvent"("eventType", "eventAt");
CREATE INDEX IF NOT EXISTS "CloudflareWebhookEvent_liveInputUid_eventAt_idx"
ON "CloudflareWebhookEvent"("liveInputUid", "eventAt");
CREATE INDEX IF NOT EXISTS "CloudflareWebhookEvent_assetUid_idx"
ON "CloudflareWebhookEvent"("assetUid");

CREATE UNIQUE INDEX IF NOT EXISTS "StreamWebhookOutbox_dedupeKey_key"
ON "StreamWebhookOutbox"("dedupeKey");
CREATE INDEX IF NOT EXISTS "StreamWebhookOutbox_status_available_at_idx"
ON "StreamWebhookOutbox"("status", "available_at");
CREATE INDEX IF NOT EXISTS "StreamWebhookOutbox_webhookEventId_idx"
ON "StreamWebhookOutbox"("webhookEventId");

ALTER TABLE "CloudflareWebhookEvent"
DROP CONSTRAINT IF EXISTS "CloudflareWebhookEvent_source_check",
DROP CONSTRAINT IF EXISTS "CloudflareWebhookEvent_status_check",
DROP CONSTRAINT IF EXISTS "CloudflareWebhookEvent_attempts_check";

ALTER TABLE "CloudflareWebhookEvent"
ADD CONSTRAINT "CloudflareWebhookEvent_source_check"
CHECK ("source" IN ('STREAM', 'DESTINATION')),
ADD CONSTRAINT "CloudflareWebhookEvent_status_check"
CHECK ("status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED')),
ADD CONSTRAINT "CloudflareWebhookEvent_attempts_check"
CHECK ("attempts" >= 0);

ALTER TABLE "StreamWebhookOutbox"
DROP CONSTRAINT IF EXISTS "StreamWebhookOutbox_status_check",
DROP CONSTRAINT IF EXISTS "StreamWebhookOutbox_attempts_check",
DROP CONSTRAINT IF EXISTS "StreamWebhookOutbox_webhookEventId_fkey";

ALTER TABLE "StreamWebhookOutbox"
ADD CONSTRAINT "StreamWebhookOutbox_status_check"
CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
ADD CONSTRAINT "StreamWebhookOutbox_attempts_check"
CHECK ("attempts" >= 0),
ADD CONSTRAINT "StreamWebhookOutbox_webhookEventId_fkey"
FOREIGN KEY ("webhookEventId") REFERENCES "CloudflareWebhookEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Broadcast_liveInputId_providerSessionStartedAt_providerSessionEndedAt_idx"
ON "Broadcast"("liveInputId", "providerSessionStartedAt", "providerSessionEndedAt");
