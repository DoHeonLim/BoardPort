/**
 * File Name : features/post/components/postCard/PostCardMeta.tsx
 * Description : 게시글 메타데이터 (조회수, 좋아요, 댓글, 장소, 시간)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.15  임도헌   Modified  위치 정보(region) 표시 추가
 * 2026.02.26  임도헌   Modified  좁은 화면에서 UI 깨짐 수정
 * 2026.02.28  임도헌   Modified  viewMode 기반 레이아웃 최적화
 * 2026.03.06  임도헌   Modified  모바일 그리드에서는 위치 정보 1줄을 노출하고 메타 배치를 압축형으로 조정
 * 2026.03.06  임도헌   Modified  모바일 그리드 메타를 하단 정렬로 재배치하고 통계/시간을 한 줄로 정리
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
import type { ViewMode } from "@/features/product/types";

interface PostCardMetaProps {
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  region2?: string | null;
  region3?: string | null;
  viewMode?: ViewMode;
}

/**
 * 게시글의 통계 정보(좋아요, 댓글, 조회수, 장소)와 작성 시간을 표시
 *
 * [레이아웃 최적화]
 * 1. 좌측 통계와 우측 시간/장소를 양 끝으로 배치 (justify-between)
 * 2. 그리드 모드에서는 공간 확보를 위해 장소 정보 숨김
 * 3. 위치 텍스트가 길어질 경우 말줄임(...) 처리 (min-w-0 flex-1)
 */
export default function PostCardMeta({
  views,
  likes,
  comments,
  createdAt,
  region2,
  region3,
  viewMode = "list",
}: PostCardMetaProps) {
  const isGrid = viewMode === "grid";
  // 동 단위까지만 표시 (예: "서초구 방배동")
  const locationText = [region2, region3].filter(Boolean).join(" ");
  const showLocationInGrid = isGrid && !!locationText;

  const stats = (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-muted">
      <div className="flex items-center gap-1">
        <HeartIcon
          className={cn(
            "size-3 sm:size-3.5",
            likes > 0 ? "text-rose-500" : "text-muted/70"
          )}
        />
        <span className="text-[10px] sm:text-xs">{likes}</span>
      </div>
      <div className="flex items-center gap-1">
        <ChatBubbleLeftIcon className="size-3 text-muted/70" />
        <span className="text-[10px] sm:text-xs">{comments}</span>
      </div>
      <div className="flex items-center gap-1">
        <EyeIcon className="size-3 text-muted/70" />
        <span className="text-[10px] sm:text-xs">{views}</span>
      </div>
    </div>
  );

  if (isGrid) {
    return (
      <div className="mt-auto flex w-full min-w-0 flex-col gap-1 text-muted">
        {showLocationInGrid && (
          <div
            className="flex items-center gap-1 min-w-0 text-[10px]"
            title={locationText}
          >
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
          {stats}
          <TimeAgo
            date={createdAt}
            className="text-muted whitespace-nowrap shrink-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto flex w-full min-w-0 items-center justify-between gap-2">
      {stats}

      <div className="flex items-center justify-end gap-1.5 min-w-0 text-[10px] sm:text-xs text-muted">
        {locationText && (
          <>
            <div
              className="flex items-center gap-0.5 min-w-0"
              title={locationText}
            >
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate max-w-[60px] sm:max-w-[100px]">
                {locationText}
              </span>
            </div>
            <span
              className="text-border text-[8px] shrink-0"
              aria-hidden="true"
            >
              |
            </span>
          </>
        )}
        <TimeAgo
          date={createdAt}
          className="text-muted whitespace-nowrap shrink-0"
        />
      </div>
    </div>
  );
}
