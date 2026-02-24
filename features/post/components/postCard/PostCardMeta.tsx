/**
 * File Name : features/post/components/postCard/PostCardMeta.tsx
 * Description : 게시글 메타데이터 (조회수, 좋아요, 댓글, 시간)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.15  임도헌   Modified  위치 정보(region) 표시 추가
 */
"use client";

import {
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";

interface PostCardMetaProps {
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  region2?: string | null;
  region3?: string | null;
}

/**
 * 게시글의 통계 정보(좋아요, 댓글, 조회수)와 작성 시간을 표시
 * 좋아요가 있는 경우 아이콘 색상을 강조
 */
export default function PostCardMeta({
  views,
  likes,
  comments,
  createdAt,
  region2,
  region3,
}: PostCardMetaProps) {
  // 동 단위까지만 표시 (예: "서초구 방배동")
  const locationText = [region2, region3].filter(Boolean).join(" ");

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

      {locationText && (
        <>
          <div
            className="flex items-center gap-0.5 truncate max-w-[80px] sm:max-w-[100px]"
            title={locationText}
          >
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
          <span className="text-border text-[8px] sm:text-[10px] shrink-0">
            |
          </span>
        </>
      )}

      <TimeAgo date={createdAt} className="text-muted whitespace-nowrap" />
    </div>
  );
}
