-- 2026.08.21: 신규 LiveInput은 signed playback을 기본값으로 기록한다.
-- Cloudflare 원격 자산은 이 DB migration만으로 바뀌지 않으므로 별도 backfill runbook을 수행해야 한다.
ALTER TABLE "LiveInput"
ALTER COLUMN "requireSignedURLs" SET DEFAULT true;

UPDATE "LiveInput"
SET "requireSignedURLs" = true
WHERE "requireSignedURLs" = false;
