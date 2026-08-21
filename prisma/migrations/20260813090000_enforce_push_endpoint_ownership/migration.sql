-- File Name : prisma/migrations/20260813090000_enforce_push_endpoint_ownership/migration.sql
-- Description : Push endpoint 단일 소유권과 fail-closed 재검증 제약 적용
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.08.13  임도헌   Created   중복 endpoint 정리와 소유권 재검증 상태 migration 추가
-- 2026.08.21  임도헌   Modified  구버전 쓰기 차단과 coordinated cutover 조건 설명 보완

-- A browser Push endpoint can belong to only one BoardPort account at a time.
-- Lock the table so duplicate cleanup and unique-index replacement are atomic
-- with respect to concurrent subscription writes during deployment.
BEGIN;

LOCK TABLE "PushSubscription" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "PushSubscription"
ADD COLUMN "requires_ownership_verification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allows_automatic_reactivation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PushSubscription"
ALTER COLUMN "isActive" SET DEFAULT false;

-- Historical rows may contain the same endpoint for multiple users. Keep the
-- most recently created row (then the largest id for deterministic ties).
WITH ranked_subscriptions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "endpoint"
      ORDER BY "created_at" DESC, "id" DESC
    ) AS row_number
  FROM "PushSubscription"
)
DELETE FROM "PushSubscription" AS subscription
USING ranked_subscriptions AS ranked
WHERE subscription."id" = ranked."id"
  AND ranked.row_number > 1;

-- Existing ownership and display-guard support cannot be proven from legacy
-- rows. Only rows that were active before this migration receive one-time
-- automatic recovery eligibility. Previously inactive rows remain blocked so
-- a logout, explicit OFF, or delivery failure is not silently undone.
UPDATE "PushSubscription"
SET "allows_automatic_reactivation" = true
WHERE "isActive" = true;

UPDATE "PushSubscription"
SET "isActive" = false;

-- Keep PushSubscription_endpoint_userId_key only for Prisma selector source
-- compatibility during the cutover. This does not provide functional rolling
-- compatibility: old instances write isActive=true without clearing the new
-- verification marker, so the CHECK below intentionally rejects those writes.
-- Stop or drain old Push write traffic before applying this migration. The
-- redundant compound index can be removed in a later contract migration.

CREATE UNIQUE INDEX "PushSubscription_endpoint_key"
ON "PushSubscription"("endpoint");

-- Old application instances only write isActive and do not know about the
-- verification marker. Prevent them from reactivating a fail-closed legacy row
-- before a new instance verifies endpoint+p256dh+auth. New active writes always
-- clear the marker in the same statement.
ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_active_ownership_verification_check"
CHECK (
  NOT "isActive"
  OR (
    NOT "requires_ownership_verification"
    AND NOT "allows_automatic_reactivation"
  )
),
ADD CONSTRAINT "PushSubscription_automatic_reactivation_state_check"
CHECK (
  NOT "allows_automatic_reactivation"
  OR ("requires_ownership_verification" AND NOT "isActive")
);

COMMIT;
