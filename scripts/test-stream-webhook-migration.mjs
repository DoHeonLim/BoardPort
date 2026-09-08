/**
 * File Name : scripts/test-stream-webhook-migration.mjs
 * Description : Stream webhook 멱등성 migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   provider 시각 backfill·inbox/outbox 제약·재실행 안전성 검증
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.STREAM_WEBHOOK_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("STREAM_WEBHOOK_MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error(
    "Stream webhook migration test must use the local boardport_migration_test database."
  );
}

const migrationFile = resolve(
  "prisma/migrations/20260826233000_add_stream_webhook_idempotency/migration.sql"
);

/** SQL 문자열을 quote·comment·dollar block을 보존하며 최상위 문장 단위로 나눈다. */
function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (singleQuoted) {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") singleQuoted = false;
      continue;
    }
    if (doubleQuoted) {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') doubleQuoted = false;
      continue;
    }

    if (char === "-" && next === "-") {
      lineComment = true;
      index += 1;
    } else if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
    } else if (char === "'") singleQuoted = true;
    else if (char === '"') doubleQuoted = true;
    else if (char === "$") {
      const tag = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) {
        dollarTag = tag;
        index += tag.length - 1;
      }
    } else if (char === ";") {
      const statement = sql.slice(start, index + 1).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  const remainder = sql.slice(start).trim();
  if (remainder) statements.push(remainder);
  return statements;
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "StreamWebhookOutbox" CASCADE;
DROP TABLE IF EXISTS "CloudflareWebhookEvent" CASCADE;
DROP TABLE IF EXISTS "VodAsset" CASCADE;
DROP TABLE IF EXISTS "PostVideo" CASCADE;
DROP TABLE IF EXISTS "Broadcast" CASCADE;

CREATE TABLE "Broadcast" (
  "id" serial PRIMARY KEY,
  "liveInputId" integer NOT NULL,
  "started_at" timestamp(3),
  "ended_at" timestamp(3)
);
CREATE TABLE "VodAsset" (
  "id" serial PRIMARY KEY,
  "ready_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PostVideo" (
  "id" serial PRIMARY KEY,
  "status" text NOT NULL,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "Broadcast" ("liveInputId", "started_at", "ended_at")
VALUES (10, '2026-08-26 01:00:00', '2026-08-26 02:00:00');
INSERT INTO "VodAsset" ("ready_at", "created_at")
VALUES ('2026-08-26 02:05:00', '2026-08-26 02:01:00');
INSERT INTO "PostVideo" ("status", "updated_at")
VALUES ('READY', '2026-08-26 02:10:00'), ('PROCESSING', '2026-08-26 02:11:00');
`;

const assertionSql = String.raw`
DO $$
DECLARE
  event_id integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Broadcast"
    WHERE "providerSessionStartedAt" = "started_at"
      AND "providerSessionEndedAt" = "ended_at"
      AND "lastProviderEventAt" = "ended_at"
  ) THEN
    RAISE EXCEPTION 'broadcast provider timestamps were not backfilled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "VodAsset"
    WHERE "providerCreatedAt" = "ready_at"
      AND "lastProviderEventAt" = "ready_at"
  ) THEN
    RAISE EXCEPTION 'vod provider timestamps were not backfilled';
  END IF;

  IF (SELECT count(*) FROM "PostVideo" WHERE "lastProviderEventAt" IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'only terminal post videos should be backfilled';
  END IF;

  INSERT INTO "CloudflareWebhookEvent" (
    "source", "eventType", "payloadHash", "payload", "eventAt"
  ) VALUES (
    'STREAM', 'video.ready', 'payload-hash-1', '{}'::jsonb, CURRENT_TIMESTAMP
  ) RETURNING "id" INTO event_id;

  INSERT INTO "StreamWebhookOutbox" (
    "dedupeKey", "kind", "payload", "webhookEventId"
  ) VALUES ('stream-webhook:1:cache', 'REVALIDATE_BROADCAST', '{}'::jsonb, event_id);

  BEGIN
    INSERT INTO "CloudflareWebhookEvent" (
      "source", "eventType", "payloadHash", "payload", "eventAt"
    ) VALUES (
      'STREAM', 'video.ready', 'payload-hash-1', '{}'::jsonb, CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'duplicate payload hash was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO "StreamWebhookOutbox" (
      "dedupeKey", "kind", "payload", "webhookEventId"
    ) VALUES ('stream-webhook:1:cache', 'REVALIDATE_BROADCAST', '{}'::jsonb, event_id);
    RAISE EXCEPTION 'duplicate outbox key was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE "CloudflareWebhookEvent" SET "status" = 'UNKNOWN' WHERE "id" = event_id;
    RAISE EXCEPTION 'invalid inbox status was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  DELETE FROM "CloudflareWebhookEvent" WHERE "id" = event_id;
  IF EXISTS (SELECT 1 FROM "StreamWebhookOutbox" WHERE "webhookEventId" = event_id) THEN
    RAISE EXCEPTION 'outbox row did not cascade with inbox row';
  END IF;
END;
$$;
`;

const cleanupSql = String.raw`
DROP TABLE IF EXISTS "StreamWebhookOutbox" CASCADE;
DROP TABLE IF EXISTS "CloudflareWebhookEvent" CASCADE;
DROP TABLE IF EXISTS "VodAsset" CASCADE;
DROP TABLE IF EXISTS "PostVideo" CASCADE;
DROP TABLE IF EXISTS "Broadcast" CASCADE;
`;

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(setupSql);
  const statements = splitSqlStatements(readFileSync(migrationFile, "utf8"));
  for (const statement of statements) await client.query(statement);
  // 실패 뒤 재배포 시에도 이미 생성된 객체 때문에 중단되지 않아야 한다.
  for (const statement of statements) await client.query(statement);
  await client.query(assertionSql);
  console.log("Stream webhook migration integration test passed.");
} finally {
  await client.query(cleanupSql);
  await client.end();
}
