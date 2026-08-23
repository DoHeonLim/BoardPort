-- Cloudflare Images ownership ledger
-- Existing first-party imagedelivery.net assets are backfilled before application
-- writes switch to mandatory owner/purpose checks.

CREATE TYPE "MediaAssetPurpose" AS ENUM (
  'USER_AVATAR',
  'PRODUCT_IMAGE',
  'POST_IMAGE',
  'CHAT_IMAGE',
  'STREAM_THUMBNAIL'
);

CREATE TYPE "MediaAssetState" AS ENUM (
  'PENDING',
  'ATTACHED',
  'ORPHANED',
  'DELETED'
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'CLOUDFLARE_IMAGES',
  "providerAssetId" TEXT NOT NULL,
  "deliveryUrl" TEXT NOT NULL,
  "purpose" "MediaAssetPurpose" NOT NULL,
  "state" "MediaAssetState" NOT NULL DEFAULT 'PENDING',
  "linkedEntityId" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attached_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "ownerId" INTEGER NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAsset_attached_link_check" CHECK (
    ("state" = 'ATTACHED' AND "linkedEntityId" IS NOT NULL)
    OR ("state" <> 'ATTACHED' AND "linkedEntityId" IS NULL)
  )
);

CREATE UNIQUE INDEX "MediaAsset_providerAssetId_key"
  ON "MediaAsset"("providerAssetId");
CREATE INDEX "MediaAsset_ownerId_purpose_state_idx"
  ON "MediaAsset"("ownerId", "purpose", "state");
CREATE INDEX "MediaAsset_purpose_linkedEntityId_idx"
  ON "MediaAsset"("purpose", "linkedEntityId");
CREATE INDEX "MediaAsset_state_expires_at_idx"
  ON "MediaAsset"("state", "expires_at");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL fallback IDs are opaque text; subsequent Prisma writes use cuid().
INSERT INTO "MediaAsset" (
  "id", "providerAssetId", "deliveryUrl", "purpose", "state",
  "linkedEntityId", "expires_at", "attached_at", "updated_at", "ownerId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || u."id"::text),
  split_part(u."avatar", '/', 5),
  regexp_replace(u."avatar", '/(public|avatar)$', ''),
  'USER_AVATAR'::"MediaAssetPurpose",
  'ATTACHED'::"MediaAssetState",
  u."id"::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  u."id"
FROM "User" u
WHERE u."avatar" ~ '^https://imagedelivery\.net/[^/]+/[A-Za-z0-9_-]+(/[^/?#]+)?$'
ON CONFLICT ("providerAssetId") DO NOTHING;

INSERT INTO "MediaAsset" (
  "id", "providerAssetId", "deliveryUrl", "purpose", "state",
  "linkedEntityId", "expires_at", "attached_at", "updated_at", "ownerId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || pi."id"::text),
  split_part(pi."url", '/', 5),
  regexp_replace(pi."url", '/public$', ''),
  'PRODUCT_IMAGE'::"MediaAssetPurpose",
  'ATTACHED'::"MediaAssetState",
  p."id"::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  p."userId"
FROM "ProductImage" pi
JOIN "Product" p ON p."id" = pi."productId"
WHERE pi."url" ~ '^https://imagedelivery\.net/[^/]+/[A-Za-z0-9_-]+(/[^/?#]+)?$'
ON CONFLICT ("providerAssetId") DO NOTHING;

INSERT INTO "MediaAsset" (
  "id", "providerAssetId", "deliveryUrl", "purpose", "state",
  "linkedEntityId", "expires_at", "attached_at", "updated_at", "ownerId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || pi."id"::text),
  split_part(pi."url", '/', 5),
  regexp_replace(pi."url", '/public$', ''),
  'POST_IMAGE'::"MediaAssetPurpose",
  'ATTACHED'::"MediaAssetState",
  p."id"::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  p."userId"
FROM "PostImage" pi
JOIN "Post" p ON p."id" = pi."postId"
WHERE pi."url" ~ '^https://imagedelivery\.net/[^/]+/[A-Za-z0-9_-]+(/[^/?#]+)?$'
ON CONFLICT ("providerAssetId") DO NOTHING;

INSERT INTO "MediaAsset" (
  "id", "providerAssetId", "deliveryUrl", "purpose", "state",
  "linkedEntityId", "expires_at", "attached_at", "updated_at", "ownerId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || pm."id"::text),
  split_part(pm."image", '/', 5),
  regexp_replace(pm."image", '/public$', ''),
  'CHAT_IMAGE'::"MediaAssetPurpose",
  'ATTACHED'::"MediaAssetState",
  pm."id"::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  pm."userId"
FROM "ProductMessage" pm
WHERE pm."image" ~ '^https://imagedelivery\.net/[^/]+/[A-Za-z0-9_-]+(/[^/?#]+)?$'
ON CONFLICT ("providerAssetId") DO NOTHING;

INSERT INTO "MediaAsset" (
  "id", "providerAssetId", "deliveryUrl", "purpose", "state",
  "linkedEntityId", "expires_at", "attached_at", "updated_at", "ownerId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || b."id"::text),
  split_part(b."thumbnail", '/', 5),
  regexp_replace(b."thumbnail", '/public$', ''),
  'STREAM_THUMBNAIL'::"MediaAssetPurpose",
  'ATTACHED'::"MediaAssetState",
  b."id"::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  li."userId"
FROM "Broadcast" b
JOIN "LiveInput" li ON li."id" = b."liveInputId"
WHERE b."thumbnail" ~ '^https://imagedelivery\.net/[^/]+/[A-Za-z0-9_-]+(/[^/?#]+)?$'
ON CONFLICT ("providerAssetId") DO NOTHING;
