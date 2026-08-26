/**
 * File Name : scripts/test-chat-idempotency-migration.mjs
 * Description : 상품 채팅방·메시지·약속 멱등성 migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   legacy 중복 병합·요청 ID·PENDING 단일 제약을 실제 PostgreSQL로 검증
 * 2026.08.26  임도헌   Modified  운영과 같은 SQL 문장별 commit 경계로 migration 실행
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL is required.");
}
const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error(
    "Chat idempotency migration test must use the local boardport_migration_test database."
  );
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve(
  "prisma.chat-idempotency-migration-test.config.ts"
);
const migrationFile = resolve(
  "prisma/migrations/20260826200000_add_chat_idempotency/migration.sql"
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
        CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL: databaseUrl,
      },
      input,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    }
  );
}

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
      if (char === "'" && next === "'") {
        index += 1;
      } else if (char === "'") {
        singleQuoted = false;
      }
      continue;
    }
    if (doubleQuoted) {
      if (char === '"' && next === '"') {
        index += 1;
      } else if (char === '"') {
        doubleQuoted = false;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      lineComment = true;
      index += 1;
    } else if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
    } else if (char === "'") {
      singleQuoted = true;
    } else if (char === '"') {
      doubleQuoted = true;
    } else if (char === "$") {
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

/** 운영 migration 실행기처럼 각 SQL 문장을 별도 implicit transaction으로 실행한다. */
async function executeMigrationStatementByStatement() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const migrationSql = readFileSync(migrationFile, "utf8");
    for (const statement of splitSqlStatements(migrationSql)) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "_ProductChatRoomToUser" CASCADE;
DROP TABLE IF EXISTS "_BoardPortChatRoomMerge" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Appointment" CASCADE;
DROP TABLE IF EXISTS "ProductMessage" CASCADE;
DROP TABLE IF EXISTS "ProductChatRoom" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" ("id" integer PRIMARY KEY);
CREATE TABLE "Product" (
  "id" integer PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "User"("id")
);
CREATE TABLE "ProductChatRoom" (
  "id" text PRIMARY KEY,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "productId" integer NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE TABLE "ProductMessage" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "User"("id"),
  "productChatRoomId" text REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE
);
CREATE TABLE "Appointment" (
  "id" serial PRIMARY KEY,
  "status" text NOT NULL DEFAULT 'PENDING',
  "chatRoomId" text NOT NULL REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE,
  "proposerId" integer NOT NULL,
  "receiverId" integer NOT NULL,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Notification" (
  "id" serial PRIMARY KEY,
  "link" text
);
CREATE TABLE "_ProductChatRoomToUser" (
  "A" text NOT NULL,
  "B" integer NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("A") REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE,
  PRIMARY KEY ("A", "B")
);

INSERT INTO "User" ("id") VALUES (1), (2), (3);
INSERT INTO "Product" ("id", "userId") VALUES (10, 1), (11, 1);
INSERT INTO "ProductChatRoom" ("id", "created_at", "productId") VALUES
  ('room-canonical', '2026-08-01', 10),
  ('room-duplicate', '2026-08-02', 10),
  ('room-unrecoverable', '2026-08-03', 11);
INSERT INTO "_ProductChatRoomToUser" ("A", "B") VALUES
  ('room-canonical', 1), ('room-canonical', 2),
  ('room-duplicate', 1), ('room-duplicate', 2),
  ('room-unrecoverable', 1);
INSERT INTO "ProductMessage" ("userId", "productChatRoomId") VALUES
  (2, 'room-canonical'), (2, 'room-duplicate');
INSERT INTO "Appointment"
  ("status", "chatRoomId", "proposerId", "receiverId", "updated_at")
VALUES
  ('PENDING', 'room-canonical', 2, 1, '2026-08-01'),
  ('PENDING', 'room-duplicate', 2, 1, '2026-08-02');
INSERT INTO "Notification" ("link") VALUES
  ('/chats/room-duplicate'),
  ('/chats/room-duplicate?from=notification'),
  ('/chats/room-unrecoverable');
`;

const assertionSql = String.raw`
DO $$
DECLARE
  room_count integer;
  pending_count integer;
  moved_message_count integer;
  rewritten_notification_count integer;
  unrecoverable_count integer;
BEGIN
  SELECT count(*) INTO room_count
  FROM "ProductChatRoom"
  WHERE "productId" = 10 AND "buyerId" = 2;
  IF room_count <> 1 THEN
    RAISE EXCEPTION 'legacy duplicate chat rooms were not merged';
  END IF;

  SELECT count(*) INTO moved_message_count
  FROM "ProductMessage"
  WHERE "productChatRoomId" = 'room-canonical';
  IF moved_message_count <> 2 THEN
    RAISE EXCEPTION 'duplicate room messages were not moved';
  END IF;

  SELECT count(*) INTO pending_count
  FROM "Appointment"
  WHERE "chatRoomId" = 'room-canonical' AND "status" = 'PENDING';
  IF pending_count <> 1 THEN
    RAISE EXCEPTION 'legacy pending appointments were not normalized';
  END IF;

  SELECT count(*) INTO rewritten_notification_count
  FROM "Notification"
  WHERE "link" IN (
    '/chats/room-canonical',
    '/chats/room-canonical?from=notification'
  );
  IF rewritten_notification_count <> 2 THEN
    RAISE EXCEPTION 'duplicate room notification links were not rewritten';
  END IF;

  SELECT
    (SELECT count(*) FROM "ProductChatRoom" WHERE "id" = 'room-unrecoverable')
      +
    (SELECT count(*) FROM "Notification" WHERE "link" = '/chats/room-unrecoverable')
  INTO unrecoverable_count;
  IF unrecoverable_count <> 0 THEN
    RAISE EXCEPTION 'unrecoverable empty legacy room was not cleaned up';
  END IF;

  BEGIN
    INSERT INTO "ProductChatRoom"
      ("id", "productId", "buyerId")
    VALUES ('room-again', 10, 2);
    RAISE EXCEPTION 'duplicate product/buyer chat room was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO "ProductMessage"
    ("userId", "productChatRoomId", "clientMessageId")
  VALUES (2, 'room-canonical', 'same-client-request');
  BEGIN
    INSERT INTO "ProductMessage"
      ("userId", "productChatRoomId", "clientMessageId")
    VALUES (2, 'room-canonical', 'same-client-request');
    RAISE EXCEPTION 'duplicate client message request was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO "Appointment"
      ("status", "chatRoomId", "proposerId", "receiverId")
    VALUES ('PENDING', 'room-canonical', 2, 1);
    RAISE EXCEPTION 'second pending appointment was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;
`;

let setupCompleted = false;
try {
  execute(["--stdin"], setupSql);
  setupCompleted = true;
  await executeMigrationStatementByStatement();
  execute(["--stdin"], assertionSql);
  console.log("Chat idempotency migration integration test passed.");
} finally {
  if (setupCompleted) {
    execute(
      ["--stdin"],
      'DROP TABLE IF EXISTS "_BoardPortChatRoomMerge", "_ProductChatRoomToUser", "Notification", "Appointment", "ProductMessage", "ProductChatRoom", "Product", "User" CASCADE;'
    );
  }
}
