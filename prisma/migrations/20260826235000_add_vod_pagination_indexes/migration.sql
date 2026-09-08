-- 최신순·인기순 복합 커서가 정렬과 같은 인덱스를 사용하도록 보강한다.
CREATE INDEX "VodAsset_ready_at_id_idx"
ON "VodAsset"("ready_at" DESC, "id" DESC);

CREATE INDEX "VodAsset_views_ready_at_id_idx"
ON "VodAsset"("views" DESC, "ready_at" DESC, "id" DESC);

DROP INDEX IF EXISTS "VodAsset_ready_at_idx";
DROP INDEX IF EXISTS "VodAsset_views_idx";
