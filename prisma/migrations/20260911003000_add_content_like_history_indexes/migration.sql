-- File Name : prisma/migrations/20260911003000_add_content_like_history_indexes/migration.sql
-- Description : 게시글·다시보기 찜한 내역 최신순 조회 인덱스 추가
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.09.11  임도헌   Created   사용자별 좋아요 생성 시각·콘텐츠 ID 복합 인덱스 추가

CREATE INDEX "PostLike_userId_created_at_postId_idx"
ON "PostLike"("userId", "created_at" DESC, "postId" DESC);

CREATE INDEX "RecordingLike_userId_created_at_vodId_idx"
ON "RecordingLike"("userId", "created_at" DESC, "vodId" DESC);
