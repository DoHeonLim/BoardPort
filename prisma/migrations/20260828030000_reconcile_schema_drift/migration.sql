-- File Name : prisma/migrations/20260828030000_reconcile_schema_drift/migration.sql
-- Description : Prisma schema와 PostgreSQL 적용 결과의 명명·기본값 차이 보정
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.08.28  임도헌   Created   방송 세션 인덱스 이름 고정 및 @updatedAt 컬럼 DB 기본값 제거

-- PostgreSQL은 63자를 넘는 식별자를 자동 절단하므로, schema.prisma에 명시한
-- 짧은 이름으로 고정해 이후 schema drift 검사가 같은 인덱스로 인식하게 한다.
ALTER INDEX IF EXISTS
"Broadcast_liveInputId_providerSessionStartedAt_providerSessionE"
RENAME TO "Broadcast_liveInputId_providerSessionStartedAt_providerSess_idx";

-- Prisma의 @updatedAt은 Client가 쓰기 시각을 채우는 규칙이며 DB DEFAULT를
-- 의미하지 않으므로, 기존 수동 migration에만 남은 기본값을 제거한다.
ALTER TABLE "CloudflareWebhookEvent"
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "ModerationOutbox"
ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "StreamWebhookOutbox"
ALTER COLUMN "updated_at" DROP DEFAULT;
