/**
 * File Name : scripts/test-vod-pagination-migration.mjs
 * Description : 다시보기 복합 커서 인덱스와 다중 페이지 순회 PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   비단조 ID·정렬 동률 데이터의 최신·인기 3페이지 이상 무손실 순회 검증
 * 2026.08.27  임도헌   Modified  다중 페이지 검증 helper의 입력·반환 JSDoc 보강
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.VOD_PAGINATION_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("VOD_PAGINATION_MIGRATION_TEST_DATABASE_URL is required.");
}

const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error(
    "VOD pagination migration test must use the local boardport_migration_test database."
  );
}

const migrationFile = resolve(
  "prisma/migrations/20260826235000_add_vod_pagination_indexes/migration.sql"
);
const migrationSql = readFileSync(migrationFile, "utf8");
const client = new pg.Client({ connectionString: databaseUrl });
const PAGE_SIZE = 2;

/**
 * 두 배열이 순서까지 같은지 검사한다.
 *
 * @param {number[]} actual - 실제 페이지 순회 ID
 * @param {number[]} expected - 기대 정렬 ID
 * @param {string} label - 오류에 표시할 정렬 이름
 */
function assertIds(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} pagination mismatch: expected ${expected.join(",")}, received ${actual.join(",")}`
    );
  }
  if (new Set(actual).size !== actual.length) {
    throw new Error(`${label} pagination returned duplicate IDs.`);
  }
}

/**
 * 최신순 복합 커서 조건으로 마지막 페이지까지 순회한다.
 *
 * @returns {Promise<number[]>} 순서대로 수집한 VOD ID
 */
async function collectLatestIds() {
  const ids = [];
  let cursor = null;

  do {
    const params = cursor
      ? [cursor.ready_at, cursor.id, PAGE_SIZE]
      : [PAGE_SIZE];
    const where = cursor
      ? `WHERE "ready_at" < $1
          OR ("ready_at" = $1 AND "id" < $2)`
      : "";
    const limitParam = cursor ? "$3" : "$1";
    const result = await client.query(
      `SELECT "id", "ready_at", "views"
       FROM "VodAsset"
       ${where}
       ORDER BY "ready_at" DESC, "id" DESC
       LIMIT ${limitParam}`,
      params
    );

    ids.push(...result.rows.map((row) => row.id));
    cursor = result.rows.at(-1) ?? null;
    if (result.rows.length < PAGE_SIZE) break;
  } while (cursor);

  return ids;
}

/**
 * 인기순 복합 커서 조건으로 마지막 페이지까지 순회한다.
 *
 * @returns {Promise<number[]>} 순서대로 수집한 VOD ID
 */
async function collectPopularIds() {
  const ids = [];
  let cursor = null;

  do {
    const params = cursor
      ? [cursor.views, cursor.ready_at, cursor.id, PAGE_SIZE]
      : [PAGE_SIZE];
    const where = cursor
      ? `WHERE "views" < $1
          OR ("views" = $1 AND "ready_at" < $2)
          OR ("views" = $1 AND "ready_at" = $2 AND "id" < $3)`
      : "";
    const limitParam = cursor ? "$4" : "$1";
    const result = await client.query(
      `SELECT "id", "ready_at", "views"
       FROM "VodAsset"
       ${where}
       ORDER BY "views" DESC, "ready_at" DESC, "id" DESC
       LIMIT ${limitParam}`,
      params
    );

    ids.push(...result.rows.map((row) => row.id));
    cursor = result.rows.at(-1) ?? null;
    if (result.rows.length < PAGE_SIZE) break;
  } while (cursor);

  return ids;
}

await client.connect();
try {
  await client.query('DROP TABLE IF EXISTS "VodAsset" CASCADE');
  await client.query(`
    CREATE TABLE "VodAsset" (
      "id" integer PRIMARY KEY,
      "ready_at" timestamp(3),
      "views" integer NOT NULL DEFAULT 0
    );
    CREATE INDEX "VodAsset_ready_at_idx" ON "VodAsset"("ready_at");
    CREATE INDEX "VodAsset_views_idx" ON "VodAsset"("views");
  `);
  await client.query(migrationSql);
  await client.query(`
    INSERT INTO "VodAsset" ("id", "ready_at", "views") VALUES
      (1,  '2026-08-26 12:00:00', 5),
      (90, '2026-08-26 11:00:00', 10),
      (2,  '2026-08-26 11:00:00', 10),
      (80, '2026-08-26 10:00:00', 3),
      (3,  '2026-08-26 09:00:00', 10),
      (70, '2026-08-26 09:00:00', 3),
      (4,  '2026-08-26 08:00:00', 7);
  `);

  const indexResult = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'VodAsset';
  `);
  const indexNames = new Set(indexResult.rows.map((row) => row.indexname));
  if (
    !indexNames.has("VodAsset_ready_at_id_idx") ||
    !indexNames.has("VodAsset_views_ready_at_id_idx")
  ) {
    throw new Error("VOD composite pagination indexes were not created.");
  }

  assertIds(await collectLatestIds(), [1, 90, 2, 80, 70, 3, 4], "latest");
  assertIds(await collectPopularIds(), [90, 2, 3, 4, 1, 80, 70], "popular");

  console.log("VOD pagination migration integration test passed.");
} finally {
  await client.query('DROP TABLE IF EXISTS "VodAsset" CASCADE');
  await client.end();
}
