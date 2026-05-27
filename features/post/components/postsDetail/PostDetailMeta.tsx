/**
 * File Name : features/post/components/postDetail/PostDetailMeta.tsx
 * Description : 게시글 상세 메타 정보 (좋아요 버튼, 조회수, 댓글 수, 작성일)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Meta 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 아이콘/텍스트 색상 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.05.18  임도헌   Modified  상세 메타에 댓글 수 표시 및 post stats 캐시 연동
 * 2026.05.18  임도헌   Modified  상세 통계 아이콘을 목록 카드와 같은 solid 문법으로 통일
 * 2026.05.26  임도헌   Modified  initialData 기반 stats query에 local queryFn을 부여해 refetch 경고 방지
 */
"use client";

import PostLikeButton from "@/features/post/components/PostLikeButton";
import { ChatBubbleLeftIcon, EyeIcon } from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface PostDetailMetaProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
  views: number;
  commentCount: number;
  createdAt: string;
}

/**
 * 게시글 하단의 메타 정보 영역
 * - 좌측: 좋아요 버튼 (PostLikeButton)
 * - 우측: 조회수, 댓글 수, 작성 시간 (TimeAgo)
 * - 댓글 수는 댓글 작성/삭제 mutation이 갱신하는 post stats 캐시 기준으로 표시
 */
export default function PostDetailMeta({
  postId,
  isLiked,
  likeCount,
  views,
  commentCount,
  createdAt,
}: PostDetailMetaProps) {
  const queryClient = useQueryClient();
  const statsQueryKey = queryKeys.posts.stats(postId);
  const initialStats = { commentCount };
  const { data: stats } = useQuery({
    queryKey: statsQueryKey,
    queryFn: async () =>
      queryClient.getQueryData<typeof initialStats>(statsQueryKey) ??
      initialStats,
    initialData: initialStats,
    staleTime: Infinity,
    enabled: false,
  });

  return (
    <div className="flex items-center justify-between">
      <PostLikeButton isLiked={isLiked} likeCount={likeCount} postId={postId} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <EyeIcon className="size-4" />
          <span>{views.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <ChatBubbleLeftIcon className="size-4" />
          <span>{stats.commentCount.toLocaleString()}</span>
        </div>
        <span className="text-border">|</span>
        <TimeAgo date={createdAt} />
      </div>
    </div>
  );
}
