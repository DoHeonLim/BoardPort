/**
 * File Name : components/post/postDetail/PostDetailMeta
 * Description : 게시글 상세 메타 정보 (좋아요 버튼, 조회수, 작성일)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Meta 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 아이콘/텍스트 색상 통일
 */
"use client";

import PostLikeButton from "@/components/post/PostLikeButton";
import { EyeIcon } from "@heroicons/react/24/outline";
import TimeAgo from "@/components/ui/TimeAgo";

interface PostDetailMetaProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
  views: number;
  createdAt: string;
}
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
