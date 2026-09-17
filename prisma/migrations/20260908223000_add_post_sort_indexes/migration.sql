-- File Name : prisma/migrations/20260908223000_add_post_sort_indexes/migration.sql
-- Description : 게시글 조회·좋아요 정렬용 인덱스 추가
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.09.08  임도헌   Created   조회순 복합 인덱스와 게시글별 좋아요 집계 인덱스 추가

-- 조회수 동률에서 생성 시각과 ID까지 같은 방향으로 이어지는 목록 정렬 지원
CREATE INDEX "Post_views_created_at_id_idx"
ON "Post"("views" DESC, "created_at" DESC, "id" DESC);

-- (userId, postId) 기본키로 지원되지 않는 게시글별 좋아요 집계 경로 보완
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
