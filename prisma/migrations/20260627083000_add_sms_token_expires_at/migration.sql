-- Add SMS token TTL so old verification codes cannot remain valid indefinitely.
ALTER TABLE "SMSToken" ADD COLUMN "expires_at" TIMESTAMP(3);

UPDATE "SMSToken"
SET "expires_at" = "created_at" + INTERVAL '10 minutes'
WHERE "expires_at" IS NULL;

ALTER TABLE "SMSToken" ALTER COLUMN "expires_at" SET NOT NULL;

CREATE INDEX "SMSToken_expires_at_idx" ON "SMSToken"("expires_at");

-- Store hashed actor keys for low-volume auth abuse controls.
CREATE TABLE "AuthRateLimitEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthRateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthRateLimitEvent_kind_keyHash_created_at_idx" ON "AuthRateLimitEvent"("kind", "keyHash", "created_at");
