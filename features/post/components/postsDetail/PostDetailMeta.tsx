/**
 * File Name : features/post/components/postDetail/PostDetailMeta.tsx
 * Description : 게시글 상세 메타 정보 (좋아요 버튼, 조회수, 작성일)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Meta 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 아이콘/텍스트 색상 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import PostLikeButton from "@/features/post/components/PostLikeButton";
import { EyeIcon } from "@heroicons/react/24/outline";
import TimeAgo from "@/components/ui/TimeAgo";

interface PostDetailMetaProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
  views: number;
  createdAt: string;
}

/**
 * 게시글 하단의 메타 정보 영역입니다.
 * - 좌측: 좋아요 버튼 (PostLikeButton)
 * - 우측: 조회수 및 작성 시간 (TimeAgo)
 */
export default function PostDetailMeta({
  postId,
  isLiked,
  likeCount,
  views,
  createdAt,
}: PostDetailMetaProps) {
  return (
    <div className="flex items-center justify-between">
      <PostLikeButton isLiked={isLiked} likeCount={likeCount} postId={postId} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <EyeIcon className="size-4" />
          <span>{views.toLocaleString()}</span>
        </div>
        <span className="text-border">|</span>
        <TimeAgo date={createdAt} />
      </div>
    </div>
  );
}
