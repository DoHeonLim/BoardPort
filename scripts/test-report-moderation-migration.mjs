/**
 * File Name : scripts/test-report-moderation-migration.mjs
 * Description : 신고 처리 claim·멱등 키·outbox migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   동시 claim·rollback·고유 키·상태 제약을 실제 PostgreSQL로 검증
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL is required.");
}
const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error(
    "Report moderation migration test must use the local boardport_migration_test database."
  );
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve(
  "prisma.report-moderation-migration-test.config.ts"
);
const migrationFile = resolve(
  "prisma/migrations/20260826120000_add_report_moderation_idempotency/migration.sql"
);

/** 지정한 로컬 테스트 DB에 Prisma db execute 명령을 실행한다. */
function execute(args, input) {
  execFileSync(
    process.execPath,
    [prismaCli, "db", "execute", "--config", prismaConfig, ...args],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL: databaseUrl,
      },
      input,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    }
  );
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "ModerationOutbox" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Report" CASCADE;

CREATE TABLE "Report" (
  "id" serial PRIMARY KEY,
  "status" text NOT NULL DEFAULT 'PENDING'
);
CREATE TABLE "AuditLog" (
  "id" serial PRIMARY KEY,
  "adminId" integer NOT NULL,
  "action" text NOT NULL,
  "targetType" text NOT NULL,
  "targetId" integer NOT NULL,
  "reason" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Notification" (
  "id" serial PRIMARY KEY
);
INSERT INTO "Report" ("status") VALUES ('PENDING');
`;

const assertionSql = String.raw`
DO $$
BEGIN
  BEGIN
    UPDATE "Report" SET "status" = 'UNKNOWN' WHERE "id" = 1;
    RAISE EXCEPTION 'invalid report status was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO "AuditLog"
    ("adminId", "action", "targetType", "targetId", "idempotencyKey")
  VALUES (1, 'RESOLVE_REPORT', 'REPORT', 1, 'report:1:RESOLVED:WARN');
  BEGIN
    INSERT INTO "AuditLog"
      ("adminId", "action", "targetType", "targetId", "idempotencyKey")
    VALUES (2, 'RESOLVE_REPORT', 'REPORT', 1, 'report:1:RESOLVED:WARN');
    RAISE EXCEPTION 'duplicate report action idempotency key was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO "ModerationOutbox" ("dedupeKey", "kind", "payload")
  VALUES ('report:1:notification', 'ADMIN_NOTIFICATION', '{}'::jsonb);
  BEGIN
    INSERT INTO "ModerationOutbox" ("dedupeKey", "kind", "payload")
    VALUES ('report:1:notification', 'ADMIN_NOTIFICATION', '{}'::jsonb);
    RAISE EXCEPTION 'duplicate moderation outbox key was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;
`;

/** 두 연결의 조건부 claim 경쟁과 transaction rollback 원자성을 실제 PostgreSQL에서 검증한다. */
async function verifyConcurrentClaimAndRollback() {
  const first = new pg.Client({ connectionString: databaseUrl });
  const second = new pg.Client({ connectionString: databaseUrl });
  await Promise.all([first.connect(), second.connect()]);

  try {
    await first.query("BEGIN");
    const firstClaim = await first.query(
      `UPDATE "Report" SET "status" = 'PROCESSING' WHERE "id" = 1 AND "status" = 'PENDING' RETURNING "id"`
    );
    if (firstClaim.rowCount !== 1) throw new Error("first report claim failed");

    await second.query("BEGIN");
    const secondClaimPromise = second.query(
      `UPDATE "Report" SET "status" = 'PROCESSING' WHERE "id" = 1 AND "status" = 'PENDING' RETURNING "id"`
    );
    await first.query(
      `UPDATE "Report" SET "status" = 'RESOLVED' WHERE "id" = 1 AND "status" = 'PROCESSING'`
    );
    await first.query("COMMIT");
    const secondClaim = await secondClaimPromise;
    if (secondClaim.rowCount !== 0) {
      throw new Error("concurrent report claim was not rejected");
    }
    await second.query("ROLLBACK");

    await first.query(
      `UPDATE "Report" SET "status" = 'PENDING' WHERE "id" = 1`
    );
    await first.query("BEGIN");
    await first.query(
      `UPDATE "Report" SET "status" = 'PROCESSING' WHERE "id" = 1 AND "status" = 'PENDING'`
    );
    await first.query(
      `INSERT INTO "AuditLog" ("adminId", "action", "targetType", "targetId") VALUES (1, 'ADD_STRIKE', 'USER', 10)`
    );
    await first.query("ROLLBACK");

    const rollbackState = await first.query(
      `SELECT "status", (SELECT count(*)::int FROM "AuditLog" WHERE "action" = 'ADD_STRIKE') AS strike_count FROM "Report" WHERE "id" = 1`
    );
    if (
      rollbackState.rows[0]?.status !== "PENDING" ||
      rollbackState.rows[0]?.strike_count !== 0
    ) {
      throw new Error("report claim and strike did not roll back atomically");
    }
  } finally {
    await Promise.allSettled([first.end(), second.end()]);
  }
}

let setupCompleted = false;
try {
  execute(["--stdin"], setupSql);
  setupCompleted = true;
  execute(["--file", migrationFile]);
  execute(["--stdin"], assertionSql);
  await verifyConcurrentClaimAndRollback();
  console.log("Report moderation migration integration test passed.");
} finally {
  if (setupCompleted) {
    execute(
      ["--stdin"],
      'DROP TABLE IF EXISTS "ModerationOutbox", "AuditLog", "Notification", "Report" CASCADE;'
    );
  }
}
