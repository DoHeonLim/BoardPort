/**
 * File Name : scripts/test-push-ownership-migration.mjs
 * Description : Push endpoint 소유권 migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   중복 정리, 상태 CHECK와 구버전 쓰기 차단을 실제 DB에서 검증
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.PUSH_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("PUSH_MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
const isLocalHost = ["127.0.0.1", "localhost", "::1"].includes(
  parsedUrl.hostname
);
const isDedicatedDatabase = parsedUrl.pathname === "/boardport_migration_test";

// 이 테스트는 PushSubscription을 drop/recreate하므로 전용 로컬 DB 외에는
// 어떤 주소도 허용하지 않는다. CI와 개발 환경 모두 같은 안전장치를 사용한다.
if (!isLocalHost || !isDedicatedDatabase) {
  throw new Error(
    "Push migration test must use the local boardport_migration_test database."
  );
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve("prisma.push-migration-test.config.ts");
const migrationFile = resolve(
  "prisma/migrations/20260813090000_enforce_push_endpoint_ownership/migration.sql"
);

function runPrisma(args, input) {
  execFileSync(
    process.execPath,
    [prismaCli, "db", "execute", "--config", prismaConfig, ...args],
    {
      cwd: process.cwd(),
      env: { ...process.env, PUSH_MIGRATION_TEST_DATABASE_URL: databaseUrl },
      input,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    }
  );
}

function executeSql(sql) {
  runPrisma(["--stdin"], sql);
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "PushSubscription";

CREATE TABLE "PushSubscription" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_userId_key"
ON "PushSubscription"("endpoint", "userId");

INSERT INTO "PushSubscription"
  ("id", "userId", "endpoint", "p256dh", "auth", "created_at", "updated_at", "isActive")
VALUES
  (1, 10, 'https://fcm.googleapis.com/fcm/send/duplicate', 'old-key', 'old-auth', '2026-08-01', '2026-08-01', true),
  (2, 20, 'https://fcm.googleapis.com/fcm/send/duplicate', 'new-key', 'new-auth', '2026-08-02', '2026-08-02', true),
  (3, 30, 'https://fcm.googleapis.com/fcm/send/inactive', 'inactive-key', 'inactive-auth', '2026-08-03', '2026-08-03', false);
`;

const assertionSql = String.raw`
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "PushSubscription") <> 2 THEN
    RAISE EXCEPTION 'duplicate endpoint cleanup did not keep exactly two rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "PushSubscription"
    WHERE "id" = 2
      AND "isActive" = false
      AND "requires_ownership_verification" = true
      AND "allows_automatic_reactivation" = true
  ) THEN
    RAISE EXCEPTION 'newest active duplicate did not retain one-time recovery state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "PushSubscription"
    WHERE "id" = 3
      AND "isActive" = false
      AND "requires_ownership_verification" = true
      AND "allows_automatic_reactivation" = false
  ) THEN
    RAISE EXCEPTION 'legacy inactive row received automatic recovery eligibility';
  END IF;

  BEGIN
    INSERT INTO "PushSubscription"
      ("id", "userId", "endpoint", "p256dh", "auth", "isActive")
    VALUES
      (40, 40, 'https://fcm.googleapis.com/fcm/send/duplicate', 'other-key', 'other-auth', false);
    RAISE EXCEPTION 'endpoint-only unique constraint accepted a duplicate';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE "PushSubscription"
    SET "isActive" = true
    WHERE "id" = 2;
    RAISE EXCEPTION 'legacy active write bypassed ownership verification CHECK';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  UPDATE "PushSubscription"
  SET
    "isActive" = true,
    "requires_ownership_verification" = false,
    "allows_automatic_reactivation" = false
  WHERE "id" = 2;

  IF NOT EXISTS (
    SELECT 1 FROM "PushSubscription"
    WHERE "id" = 2
      AND "isActive" = true
      AND "requires_ownership_verification" = false
      AND "allows_automatic_reactivation" = false
  ) THEN
    RAISE EXCEPTION 'guarded activation state was not accepted';
  END IF;
END $$;
`;

try {
  executeSql(setupSql);
  runPrisma(["--file", migrationFile]);
  executeSql(assertionSql);
  console.log("Push ownership migration integration test passed.");
} finally {
  executeSql('DROP TABLE IF EXISTS "PushSubscription";');
}
