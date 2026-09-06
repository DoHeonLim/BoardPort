/**
 * File Name : scripts/test-media-asset-migration.mjs
 * Description : MediaAsset 소유권 관리 migration PostgreSQL 통합 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   기존 이미지 backfill·제약·사용자 cascade를 실제 PostgreSQL로 검증
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.MEDIA_MIGRATION_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("MEDIA_MIGRATION_TEST_DATABASE_URL is required.");
const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname) ||
  parsedUrl.pathname !== "/boardport_migration_test"
) {
  throw new Error("Media migration test must use the local boardport_migration_test database.");
}

const prismaCli = resolve("node_modules/prisma/build/index.js");
const prismaConfig = resolve("prisma.media-migration-test.config.ts");
const migrationFile = resolve(
  "prisma/migrations/20260822200000_add_media_asset_ownership/migration.sql"
);

function execute(args, input) {
  execFileSync(process.execPath, [prismaCli, "db", "execute", "--config", prismaConfig, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, MEDIA_MIGRATION_TEST_DATABASE_URL: databaseUrl },
    input,
    stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
  });
}

const setupSql = String.raw`
DROP TABLE IF EXISTS "MediaAsset", "PostImage", "ProductImage", "ProductMessage", "Broadcast", "LiveInput", "Post", "Product", "User" CASCADE;
DROP TYPE IF EXISTS "MediaAssetPurpose", "MediaAssetState" CASCADE;
CREATE TABLE "User" ("id" integer PRIMARY KEY, "avatar" text);
CREATE TABLE "Product" ("id" integer PRIMARY KEY, "userId" integer NOT NULL);
CREATE TABLE "ProductImage" ("id" integer PRIMARY KEY, "url" text NOT NULL, "productId" integer NOT NULL);
CREATE TABLE "Post" ("id" integer PRIMARY KEY, "userId" integer NOT NULL);
CREATE TABLE "PostImage" ("id" integer PRIMARY KEY, "url" text NOT NULL, "postId" integer NOT NULL);
CREATE TABLE "ProductMessage" ("id" integer PRIMARY KEY, "image" text, "userId" integer NOT NULL);
CREATE TABLE "LiveInput" ("id" integer PRIMARY KEY, "userId" integer NOT NULL);
CREATE TABLE "Broadcast" ("id" integer PRIMARY KEY, "thumbnail" text, "liveInputId" integer NOT NULL);
INSERT INTO "User" VALUES (1, 'https://github.com/avatar.png'), (2, 'https://imagedelivery.net/account/avatar-id/avatar');
INSERT INTO "Product" VALUES (10, 1);
INSERT INTO "ProductImage" VALUES (11, 'https://imagedelivery.net/account/product-id', 10);
INSERT INTO "Post" VALUES (20, 1);
INSERT INTO "PostImage" VALUES (21, 'https://imagedelivery.net/account/post-id/public', 20);
INSERT INTO "ProductMessage" VALUES (30, 'https://imagedelivery.net/account/chat-id', 1);
INSERT INTO "LiveInput" VALUES (40, 1);
INSERT INTO "Broadcast" VALUES (50, 'https://imagedelivery.net/account/stream-id', 40);
`;

const assertionSql = String.raw`
DO $$
BEGIN
  IF (SELECT count(*) FROM "MediaAsset" WHERE "state" = 'ATTACHED') <> 5 THEN
    RAISE EXCEPTION 'expected five backfilled media assets';
  END IF;
  IF EXISTS (SELECT 1 FROM "MediaAsset" WHERE "deliveryUrl" LIKE '%/public' OR "deliveryUrl" LIKE '%/avatar') THEN
    RAISE EXCEPTION 'delivery URL variants were not normalized';
  END IF;
  BEGIN
    INSERT INTO "MediaAsset" (
      "id", "providerAssetId", "deliveryUrl", "purpose", "state",
      "expires_at", "updated_at", "ownerId"
    ) VALUES ('invalid', 'invalid', 'https://imagedelivery.net/account/invalid', 'PRODUCT_IMAGE', 'ATTACHED', now(), now(), 1);
    RAISE EXCEPTION 'attached asset without entity was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  DELETE FROM "User" WHERE "id" = 2;
  IF EXISTS (SELECT 1 FROM "MediaAsset" WHERE "ownerId" = 2) THEN
    RAISE EXCEPTION 'owner cascade did not remove media asset rows';
  END IF;
END $$;
`;

const cleanupSql = String.raw`
DROP TABLE IF EXISTS "MediaAsset", "PostImage", "ProductImage", "ProductMessage", "Broadcast", "LiveInput", "Post", "Product", "User" CASCADE;
DROP TYPE IF EXISTS "MediaAssetPurpose", "MediaAssetState" CASCADE;
`;

let setupCompleted = false;
try {
  execute(["--stdin"], setupSql);
  setupCompleted = true;
  execute(["--file", migrationFile]);
  execute(["--stdin"], assertionSql);
  console.log("MediaAsset ownership migration integration test passed.");
} finally {
  if (setupCompleted) execute(["--stdin"], cleanupSql);
}
