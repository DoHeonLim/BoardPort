/**
 * File Name : components/post/PostCard/PostCardMeta
 * Description : 게시글 메타데이터 (조회수, 좋아요, 댓글, 시간)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */
"use client";

import {
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";

interface PostCardMetaProps {
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
}

export default function PostCardMeta({
  views,
  likes,
  comments,
  createdAt,
}: PostCardMetaProps) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted my-1.5">
      <div className="flex items-center gap-0.5">
        <HeartIcon
          className={cn(
            "size-3 sm:size-3.5",
            likes > 0 ? "text-rose-500" : "text-muted/70"
          )}
        />
        <span>{likes}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <ChatBubbleLeftIcon className="size-3 sm:size-3.5 text-muted/70" />
        <span>{comments}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <EyeIcon className="size-3 sm:size-3.5 text-muted/70" />
        <span>{views}</span>
      </div>

      <span className="text-border text-[8px] sm:text-[10px]">|</span>

      <TimeAgo date={createdAt} className="text-muted whitespace-nowrap" />
    </div>
  );
}
