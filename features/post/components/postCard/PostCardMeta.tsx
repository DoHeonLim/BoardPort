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
 * 2026.03.26  임도헌   Modified  리스트 카드 모바일에서는 위치 정보를 분리 노출해 시간 표시와의 충돌을 완화
 * 2026.04.10  임도헌   Modified  post 타이포 정책에 맞춰 카드 메타 숫자/위치/시간 라벨을 text-xs 기준으로 통일
 * 2026.05.18  임도헌   Modified  좋아요 하트 강조 색상을 총 좋아요 수가 아닌 현재 사용자 좋아요 여부 기준으로 보정
 * 2026.06.18  임도헌   Modified  명시 장소가 있는 게시글만 카드 위치 정보를 표시
 * 2026.06.21  임도헌   Modified  명시 장소가 없으면 feedRegion 기준 작성 동네를 카드 메타에 표시
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
import { formatNormalizedRegion } from "@/features/map/utils/normalizeRegion";

interface PostCardMetaProps {
  views: number;
  likes: number;
  isLiked?: boolean;
  comments: number;
  createdAt: string;
  locationName?: string | null;
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
  feedRegion1?: string | null;
  feedRegion2?: string | null;
  feedRegion3?: string | null;
  viewMode?: ViewMode;
}

/**
 * 게시글의 통계 정보(좋아요, 댓글, 조회수, 관련 장소/작성 동네)와 작성 시간을 표시
 *
 * [레이아웃 최적화]
 * 1. 좌측 통계와 우측 시간/장소를 양 끝으로 배치 (justify-between)
 * 2. 그리드 모드에서는 공간 확보를 위해 장소 정보 숨김
 * 3. 위치 텍스트가 길어질 경우 말줄임(...) 처리 (min-w-0 flex-1)
 * 4. 명시 장소가 없으면 feedRegion을 작성 동네 메타로 사용
 */
export default function PostCardMeta({
  views,
  likes,
  isLiked = false,
  comments,
  createdAt,
  locationName,
  region1,
  region2,
  region3,
  feedRegion1,
  feedRegion2,
  feedRegion3,
  viewMode = "list",
}: PostCardMetaProps) {
  const isGrid = viewMode === "grid";
  // 명시 장소는 관련 장소로, 없을 때의 feedRegion은 전국 피드에서 출처를 보여주는 작성 동네로 표시한다.
  const explicitLocationText = locationName
    ? formatNormalizedRegion({ region1, region2, region3 })
    : "";
  const feedRegionText = formatNormalizedRegion({
    region1: feedRegion1,
    region2: feedRegion2,
    region3: feedRegion3,
  });
  const locationText = explicitLocationText || feedRegionText;
  const locationTitle = explicitLocationText
    ? `관련 장소: ${explicitLocationText}`
    : feedRegionText
      ? `작성 동네: ${feedRegionText}`
      : undefined;
  const showLocationInGrid = isGrid && !!locationText;

  const stats = (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-muted">
      <div className="flex items-center gap-1">
        <HeartIcon
          className={cn(
            "size-3 sm:size-3.5",
            isLiked ? "text-rose-500" : "text-muted/70"
          )}
        />
        <span className="text-xs">{likes}</span>
      </div>
      <div className="flex items-center gap-1">
        <ChatBubbleLeftIcon className="size-3 text-muted/70" />
        <span className="text-xs">{comments}</span>
      </div>
      <div className="flex items-center gap-1">
        <EyeIcon className="size-3 text-muted/70" />
        <span className="text-xs">{views}</span>
      </div>
    </div>
  );

  if (isGrid) {
    return (
      <div className="mt-auto flex w-full min-w-0 flex-col gap-1 text-muted">
        {showLocationInGrid && (
          <div
            className="flex min-w-0 items-center gap-1 text-xs"
            title={locationTitle}
          >
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs">
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
    <div className="mt-auto flex w-full min-w-0 flex-col gap-1 sm:gap-1.5">
      {locationText && (
        <div
          className="flex min-w-0 items-center gap-1 text-xs text-muted sm:hidden"
          title={locationTitle}
        >
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">{locationText}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {stats}

        <div className="flex min-w-0 items-center justify-end gap-1.5 text-xs text-muted">
          {locationText && (
            <>
              <div
                className="hidden min-w-0 items-center gap-0.5 sm:flex"
                title={locationTitle}
              >
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate max-w-[120px] md:max-w-[180px]">
                  {locationText}
                </span>
              </div>
              <span
                className="hidden shrink-0 text-border text-xs sm:inline"
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
    </div>
  );
}
