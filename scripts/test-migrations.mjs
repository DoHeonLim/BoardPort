/**
 * File Name : scripts/test-migrations.mjs
 * Description : BoardPort 도메인 migration PostgreSQL 통합 테스트 순차 실행
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   공통 로컬 DB URL로 전체 migration 통합 테스트 실행
 * 2026.09.03  임도헌   Modified  Docker 실행기와 도메인별 테스트 대상 정의 공유
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { migrationTestTargets } from "./migration-test-targets.mjs";

const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
const isLocalHost = ["127.0.0.1", "localhost", "::1"].includes(
  parsedUrl.hostname
);
const isDedicatedDatabase = parsedUrl.pathname === "/boardport_migration_test";

// 하위 테스트가 table을 재구성하므로 운영 DB나 일반 개발 DB에서는 실행하지 않는다.
if (!isLocalHost || !isDedicatedDatabase) {
  throw new Error(
    "Migration tests must use the local boardport_migration_test database."
  );
}

for (const migrationTest of migrationTestTargets) {
  console.log(`\n=== ${migrationTest.name} migration test ===`);
  execFileSync(process.execPath, [resolve("scripts", migrationTest.script)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      [migrationTest.envName]: databaseUrl,
    },
    stdio: "inherit",
  });
}

console.log("\nAll migration integration tests passed.");
