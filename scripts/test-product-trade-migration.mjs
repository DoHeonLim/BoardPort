/**
 * File Name : scripts/test-product-trade-migration.mjs
 * Description : 상품 거래 상태 불변식 migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   legacy 정규화·CHECK·사용자 삭제 연동을 실제 PostgreSQL로 검증
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.PRODUCT_TRADE_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("PRODUCT_TRADE_MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error(
    "Product trade migration test must use the local boardport_migration_test database."
  );
}

const migrationFile = resolve(
  "prisma/migrations/20260826230000_add_product_trade_invariants/migration.sql"
);

/**
 * SQL 문자열을 quote·comment·dollar block을 보존하며 최상위 문장 단위로 나눈다.
 *
 * @param {string} sql - migration SQL 원문
 * @returns {string[]} 실행 순서를 보존한 SQL 문장 목록
 */
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
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP FUNCTION IF EXISTS "boardport_normalize_product_trade_state"() CASCADE;

CREATE TABLE "User" (
  "id" integer PRIMARY KEY
);

CREATE TABLE "Product" (
  "id" integer PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reservation_userId" integer REFERENCES "User"("id") ON DELETE SET NULL,
  "reservation_at" timestamp(3),
  "purchase_userId" integer REFERENCES "User"("id") ON DELETE SET NULL,
  "purchased_at" timestamp(3)
);

INSERT INTO "User" ("id") VALUES (1), (2), (3);
INSERT INTO "Product" (
  "id", "userId", "reservation_userId", "reservation_at",
  "purchase_userId", "purchased_at"
) VALUES
  (10, 1, 2, '2026-08-20', 3, '2026-08-21'),
  (11, 1, 1, '2026-08-20', NULL, NULL),
  (12, 1, 2, NULL, NULL, NULL),
  (13, 1, NULL, '2026-08-20', NULL, NULL),
  (14, 1, NULL, NULL, NULL, NULL);
`;

const assertionSql = String.raw`
DO $$
DECLARE
  cleared_reservation_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 10
      AND "reservation_userId" IS NULL
      AND "reservation_at" IS NULL
      AND "purchase_userId" = 3
      AND "purchased_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'completed purchase did not win legacy conflict';
  END IF;

  SELECT count(*) INTO cleared_reservation_count
  FROM "Product"
  WHERE "id" IN (11, 13)
    AND "reservation_userId" IS NULL
    AND "reservation_at" IS NULL;
  IF cleared_reservation_count <> 2 THEN
    RAISE EXCEPTION 'invalid legacy reservation state was not cleared';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 12
      AND "reservation_userId" = 2
      AND "reservation_at" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'missing legacy reservation timestamp was not repaired';
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE "Product"
    SET "reservation_userId" = 2,
        "reservation_at" = CURRENT_TIMESTAMP,
        "purchase_userId" = 3,
        "purchased_at" = CURRENT_TIMESTAMP
    WHERE "id" = 14;
    RAISE EXCEPTION 'exclusive trade party constraint accepted invalid state';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE "Product"
    SET "reservation_userId" = 1,
        "reservation_at" = CURRENT_TIMESTAMP
    WHERE "id" = 14;
    RAISE EXCEPTION 'seller trade party constraint accepted invalid state';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    UPDATE "Product"
    SET "purchase_userId" = 3,
        "purchased_at" = NULL
    WHERE "id" = 14;
    RAISE EXCEPTION 'purchase pair constraint accepted invalid state';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

DELETE FROM "User" WHERE "id" = 2;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 12
      AND "reservation_userId" IS NULL
      AND "reservation_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'ON DELETE SET NULL did not clear reservation timestamp';
  END IF;
END;
$$;
`;

const cleanupSql = String.raw`
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP FUNCTION IF EXISTS "boardport_normalize_product_trade_state"() CASCADE;
`;

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(setupSql);
  const migrationSql = readFileSync(migrationFile, "utf8");
  for (const statement of splitSqlStatements(migrationSql)) {
    await client.query(statement);
  }
  await client.query(assertionSql);
  console.log("Product trade migration integration test passed.");
} finally {
  await client.query(cleanupSql);
  await client.end();
}
