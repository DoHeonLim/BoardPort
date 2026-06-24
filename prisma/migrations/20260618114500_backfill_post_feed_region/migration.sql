-- Backfill existing posts so current local-feed behavior is preserved.
-- The add-column migration may already be applied in some environments, so keep this idempotent.
UPDATE "Post"
SET
  "feedRegion1" = COALESCE("feedRegion1", "region1"),
  "feedRegion2" = COALESCE("feedRegion2", "region2"),
  "feedRegion3" = COALESCE("feedRegion3", "region3")
WHERE
  "feedRegion1" IS NULL
  OR "feedRegion2" IS NULL
  OR "feedRegion3" IS NULL;
