ALTER TABLE "ProductMessage"
RENAME COLUMN "deletedAt" TO "deleted_at";

ALTER TABLE "StreamMessage"
RENAME COLUMN "deletedAt" TO "deleted_at";
