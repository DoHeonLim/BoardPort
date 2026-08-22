/**
 * File Name : scripts/test-realtime-authorization-migration.mjs
 * Description : Supabase Realtime Authorization migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   topic별 SELECT 허용과 클라이언트 INSERT 거절을 실제 RLS로 검증
 * 2026.08.22  임도헌   Modified  전용 helper schema USAGE와 public data 차단을 함께 검증
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.REALTIME_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("REALTIME_MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
const isLocalHost = ["127.0.0.1", "localhost", "::1"].includes(
  parsedUrl.hostname
);
const isDedicatedDatabase = parsedUrl.pathname === "/boardport_migration_test";

if (!isLocalHost || !isDedicatedDatabase) {
  throw new Error(
    "Realtime migration test must use the local boardport_migration_test database."
  );
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve("prisma.realtime-migration-test.config.ts");
const migrationFiles = [
  resolve(
    "prisma/migrations/20260821180000_secure_realtime_channels/migration.sql"
  ),
  resolve(
    "prisma/migrations/20260822171000_move_realtime_authorization_helper/migration.sql"
  ),
];

function runPrisma(args, input) {
  execFileSync(
    process.execPath,
    [prismaCli, "db", "execute", "--config", prismaConfig, ...args],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        REALTIME_MIGRATION_TEST_DATABASE_URL: databaseUrl,
      },
      input,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    }
  );
}

function executeSql(sql) {
  runPrisma(["--stdin"], sql);
}

const setupSql = String.raw`
DROP SCHEMA IF EXISTS realtime CASCADE;
DROP SCHEMA IF EXISTS boardport_private CASCADE;
DROP TABLE IF EXISTS "Block", "Follow", "StreamChatRoom", "Broadcast", "LiveInput", "_ProductChatRoomToUser" CASCADE;
DROP TYPE IF EXISTS "StreamVisibility" CASCADE;
DROP FUNCTION IF EXISTS public.boardport_realtime_can_read_topic(text);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

CREATE TYPE "StreamVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TABLE "_ProductChatRoomToUser" ("A" text NOT NULL, "B" integer NOT NULL);
CREATE TABLE "LiveInput" ("id" integer PRIMARY KEY, "userId" integer NOT NULL);
CREATE TABLE "Broadcast" (
  "id" integer PRIMARY KEY,
  "liveInputId" integer NOT NULL,
  "visibility" "StreamVisibility" NOT NULL
);
CREATE TABLE "StreamChatRoom" (
  "id" integer PRIMARY KEY,
  "broadcastId" integer NOT NULL
);
CREATE TABLE "Follow" ("followerId" integer NOT NULL, "followingId" integer NOT NULL);
CREATE TABLE "Block" ("blockerId" integer NOT NULL, "blockedId" integer NOT NULL);

CREATE SCHEMA realtime;
CREATE TABLE realtime.messages (
  id bigserial PRIMARY KEY,
  topic text NOT NULL,
  extension text NOT NULL
);
CREATE FUNCTION realtime.topic()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT current_setting('realtime.topic', true) $$;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT SELECT, INSERT ON realtime.messages TO authenticated;

INSERT INTO "_ProductChatRoomToUser" ("A", "B") VALUES ('product-a', 1), ('product-b', 2);
INSERT INTO "LiveInput" ("id", "userId") VALUES (10, 10), (20, 20);
INSERT INTO "Broadcast" ("id", "liveInputId", "visibility") VALUES
  (100, 10, 'PUBLIC'),
  (101, 10, 'FOLLOWERS'),
  (102, 10, 'PRIVATE'),
  (103, 20, 'PUBLIC');
INSERT INTO "StreamChatRoom" ("id", "broadcastId") VALUES
  (1000, 100), (1001, 101), (1002, 102), (1003, 103);
INSERT INTO "Follow" ("followerId", "followingId") VALUES (1, 10);
INSERT INTO "Block" ("blockerId", "blockedId") VALUES (1, 20);
INSERT INTO realtime.messages (topic, extension) VALUES ('probe', 'broadcast');
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`;

const assertionSql = String.raw`
SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","boardport_user_id":1,"unlocked_broadcast_ids":["102"]}';

DO $$
BEGIN
  IF NOT boardport_private.boardport_realtime_can_read_topic('user:1:notifications') THEN
    RAISE EXCEPTION 'own notification topic was denied';
  END IF;

  BEGIN
    PERFORM 1 FROM public."LiveInput" LIMIT 1;
    RAISE EXCEPTION 'Realtime JWT role retained Prisma table access';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  IF boardport_private.boardport_realtime_can_read_topic('user:2:notifications') THEN
    RAISE EXCEPTION 'another user notification topic was allowed';
  END IF;
  IF NOT boardport_private.boardport_realtime_can_read_topic('user:1:chat-rooms') THEN
    RAISE EXCEPTION 'own chat room list topic was denied';
  END IF;
  IF NOT boardport_private.boardport_realtime_can_read_topic('product-room:product-a')
    OR boardport_private.boardport_realtime_can_read_topic('product-room:product-b') THEN
    RAISE EXCEPTION 'product chat membership boundary failed';
  END IF;
  IF NOT boardport_private.boardport_realtime_can_read_topic('stream:status')
    OR NOT boardport_private.boardport_realtime_can_read_topic('stream-room:1000')
    OR NOT boardport_private.boardport_realtime_can_read_topic('stream-room:1001')
    OR NOT boardport_private.boardport_realtime_can_read_topic('stream-room:1002')
    OR boardport_private.boardport_realtime_can_read_topic('stream-room:1003') THEN
    RAISE EXCEPTION 'stream visibility/follow/unlock/block boundary failed';
  END IF;

  PERFORM set_config('realtime.topic', 'user:2:notifications', false);
  IF (SELECT count(*) FROM realtime.messages) <> 0 THEN
    RAISE EXCEPTION 'unauthorized realtime SELECT policy allowed rows';
  END IF;
  PERFORM set_config('realtime.topic', 'user:1:notifications', false);
  IF (SELECT count(*) FROM realtime.messages) <> 1 THEN
    RAISE EXCEPTION 'authorized realtime SELECT policy denied rows';
  END IF;

  BEGIN
    INSERT INTO realtime.messages (id, topic, extension)
    VALUES (99, 'user:1:notifications', 'broadcast');
    RAISE EXCEPTION 'authenticated client INSERT was allowed';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
`;

const cleanupSql = String.raw`
DROP SCHEMA IF EXISTS realtime CASCADE;
DROP SCHEMA IF EXISTS boardport_private CASCADE;
DROP TABLE IF EXISTS "Block", "Follow", "StreamChatRoom", "Broadcast", "LiveInput", "_ProductChatRoomToUser" CASCADE;
DROP TYPE IF EXISTS "StreamVisibility" CASCADE;
DROP FUNCTION IF EXISTS public.boardport_realtime_can_read_topic(text);
`;

try {
  executeSql(setupSql);
  for (const migrationFile of migrationFiles) {
    runPrisma(["--file", migrationFile]);
  }
  executeSql(assertionSql);
  console.log("Realtime authorization migration integration test passed.");
} finally {
  executeSql(cleanupSql);
}
