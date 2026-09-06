/**
 * File Name : scripts/test-auth-session-migration.mjs
 * Description : User sessionVersion migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   기존 사용자 기본값과 세션 버전 증가를 실제 PostgreSQL로 검증
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.AUTH_SESSION_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("AUTH_SESSION_MIGRATION_TEST_DATABASE_URL is required.");
const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error("Auth session migration test must use the local boardport_migration_test database.");
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve("prisma.auth-session-migration-test.config.ts");
const migrationFile = resolve(
  "prisma/migrations/20260823190000_add_user_session_version/migration.sql"
);

function execute(args, input) {
  execFileSync(process.execPath, [prismaCli, "db", "execute", "--config", prismaConfig, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, AUTH_SESSION_MIGRATION_TEST_DATABASE_URL: databaseUrl },
    input,
    stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
  });
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "User" CASCADE;
CREATE TABLE "User" ("id" serial PRIMARY KEY, "email" text NOT NULL);
INSERT INTO "User" ("email") VALUES ('existing@example.com');
`;

const assertionSql = String.raw`
DO $$
DECLARE current_version integer;
BEGIN
  SELECT "sessionVersion" INTO current_version FROM "User" WHERE "email" = 'existing@example.com';
  IF current_version <> 1 THEN
    RAISE EXCEPTION 'existing user did not receive sessionVersion default';
  END IF;
  UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE "email" = 'existing@example.com';
  SELECT "sessionVersion" INTO current_version FROM "User" WHERE "email" = 'existing@example.com';
  IF current_version <> 2 THEN
    RAISE EXCEPTION 'sessionVersion increment failed';
  END IF;
END $$;
`;

let setupCompleted = false;
try {
  execute(["--stdin"], setupSql);
  setupCompleted = true;
  execute(["--file", migrationFile]);
  execute(["--stdin"], assertionSql);
  console.log("Auth session migration integration test passed.");
} finally {
  if (setupCompleted) execute(["--stdin"], 'DROP TABLE IF EXISTS "User" CASCADE;');
}
