/**
 * File Name : scripts/test-migrations.mjs
 * Description : BoardPort 도메인 migration PostgreSQL 통합 테스트 순차 실행
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   공통 로컬 DB URL로 전체 migration 통합 테스트 실행
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

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

const migrationTests = [
  {
    name: "Push ownership",
    envName: "PUSH_MIGRATION_TEST_DATABASE_URL",
    script: "test-push-ownership-migration.mjs",
  },
  {
    name: "Realtime authorization",
    envName: "REALTIME_MIGRATION_TEST_DATABASE_URL",
    script: "test-realtime-authorization-migration.mjs",
  },
  {
    name: "MediaAsset ownership",
    envName: "MEDIA_MIGRATION_TEST_DATABASE_URL",
    script: "test-media-asset-migration.mjs",
  },
  {
    name: "Auth session",
    envName: "AUTH_SESSION_MIGRATION_TEST_DATABASE_URL",
    script: "test-auth-session-migration.mjs",
  },
  {
    name: "Report moderation",
    envName: "REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL",
    script: "test-report-moderation-migration.mjs",
  },
  {
    name: "Chat idempotency",
    envName: "CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL",
    script: "test-chat-idempotency-migration.mjs",
  },
  {
    name: "Product trade",
    envName: "PRODUCT_TRADE_MIGRATION_TEST_DATABASE_URL",
    script: "test-product-trade-migration.mjs",
  },
  {
    name: "Stream webhook",
    envName: "STREAM_WEBHOOK_MIGRATION_TEST_DATABASE_URL",
    script: "test-stream-webhook-migration.mjs",
  },
  {
    name: "VOD pagination",
    envName: "VOD_PAGINATION_MIGRATION_TEST_DATABASE_URL",
    script: "test-vod-pagination-migration.mjs",
  },
];

for (const migrationTest of migrationTests) {
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
