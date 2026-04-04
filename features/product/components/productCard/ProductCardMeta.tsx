/**
 * File Name : features/product/components/productCard/ProductCardMeta.tsx
 * Description : 조회수, 좋아요, 생성일 등 제품 메타 정보 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 메타 정보 분리
 * 2026.01.10  임도헌   Modified  아이콘과 텍스트를 text-muted로 통일
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.03  임도헌   Modified  끌어올리기(bumpCount) 표시 추가
 * 2026.02.15  임도헌   Modified  위치 정보(region) 표시 추가
 * 2026.02.26  임도헌   Modified  제품 리스트 카드 찌그러짐 수정 및 모달/모바일 레이아웃 최적화
 * 2026.03.06  임도헌   Modified  모바일 그리드에서는 위치 정보 1줄을 노출하고 메타 배치를 압축형으로 조정
 * 2026.03.14  임도헌   Modified  그리드 카드에 작성 시간 노출 추가 (위치 있으면 같은 행 우측, 없으면 단독 행)
 * 2026.03.16  임도헌   Modified  리스트 카드에서 위치 유무와 관계없이 작성 시간을 우측 끝에 정렬
 * 2026.03.25  임도헌   Modified  리스트 카드 메타 줄의 간격과 구분선 강도를 미세 조정해 날짜 우측 정렬 구조를 유지한 채 polish
 * 2026.03.26  임도헌   Modified  활동 시점(activityAt)과 라벨(activityLabel) 지원으로 프로필 찜 메타 의미를 명확화
 * 2026.03.26  임도헌   Modified  찜 목록에서는 활동 시점을 메타 그룹에 합쳐 액션 버튼과 정렬 충돌을 줄임
 */

"use client";

import {
  EyeIcon,
  HeartIcon,
  ArrowUpIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";
import type { ISODate, ViewMode } from "@/features/product/types";

interface ProductCardMetaProps {
  views: number;
  likes: number;
  createdAt: ISODate;
  activityAt?: ISODate;
  activityLabel?: string;
  bumpCount?: number;
  region2?: string | null;
  region3?: string | null;
  viewMode?: ViewMode;
}

/**
 * 하단 메타 정보(좋아요 수, 조회수, 작성 시간, 위치)를 표시하는 컴포넌트
 *
 * [레이아웃 최적화]
 * 1. 통계(좋아요/조회수)와 시간 정보는 형태를 유지하도록 고정(shrink-0)
 * 2. 위치 정보는 공간이 부족할 경우 말줄임(...) 처리하여 줄바꿈 방지(flex-1 min-w-0)
 * 3. 다크모드 가시성을 위해 구분선 및 아이콘 색상 보정
 * 4. 리스트 카드에서는 위치 유무와 관계없이 작성 시간을 우측 끝에 정렬
 */
export default function ProductCardMeta({
  views,
  likes,
  createdAt,
  activityAt,
  activityLabel,
  bumpCount = 0,
  region2,
  region3,
  viewMode = "list",
}: ProductCardMetaProps) {
  const effectiveDate = activityAt ?? createdAt;
  const dateValue = effectiveDate ? effectiveDate.toString() : "";
  // 동 단위까지만 표시 (예: "동작구 사당동")
  const locationText = [region2, region3].filter(Boolean).join(" ");
  const isGrid = viewMode === "grid";
  const showLocationInGrid = isGrid && !!locationText;
  const isActivityInline = !isGrid && !!activityLabel;
  const timeMeta = dateValue ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {activityLabel && (
        <span className="text-[10px] font-medium text-muted/80 sm:text-xs">
          {activityLabel}
        </span>
      )}
      <TimeAgo
        date={dateValue}
        className="whitespace-nowrap shrink-0 text-muted"
        live={false}
      />
    </span>
  ) : null;

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden text-[10px] sm:text-xs text-muted",
        isGrid ? "flex flex-col gap-1" : "flex items-center gap-1.5"
      )}
    >
      {/* 1. 끌어올리기 (있을 때만 표시) */}
      {/* 그리드: 위치 정보 행 */}
      {showLocationInGrid && (
        <div
          className="flex items-center justify-between gap-1 min-w-0 text-muted"
          title={locationText}
        >
          {/* 좌측: 위치 */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
          {/* 우측: 시간 (위치와 같은 행) */}
          {timeMeta}
        </div>
      )}

      {/* 그리드: 위치 없을 때 시간만 단독 노출 */}
      {isGrid && !locationText && timeMeta}

      <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden">
        {bumpCount > 0 && (
          <div className="flex items-center gap-0.5 text-brand dark:text-brand-light font-bold shrink-0">
            <ArrowUpIcon className="size-3" />
            <span>{bumpCount}</span>
          </div>
        )}

        {/* 2. 통계 그룹 (좋아요 & 조회수) - 묶어서 고정 크기 유지 */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <HeartIcon
              className={cn(
                "size-3",
                likes > 0 ? "text-rose-500" : "text-muted/70"
              )}
            />
            <span>{likes}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <EyeIcon className="size-3 text-muted/70" />
            <span>{views}</span>
          </div>
        </div>

        {/* 3. 위치 정보 - 가변 영역 (공간 부족 시 말줄임) */}
        {!isGrid && (
          <>
            {locationText && (
              <>
                <span className="shrink-0 text-border-subtle dark:text-neutral-700/80">
                  |
                </span>
                <div
                  className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden"
                  title={locationText}
                >
                  <MapPinIcon className="size-3 shrink-0" />
                  <span className="truncate">{locationText}</span>
                </div>
              </>
            )}
            {timeMeta && (
              <>
                <span
                  className={cn(
                    "shrink-0 text-border-subtle dark:text-neutral-700/80",
                    !isActivityInline && "ml-auto"
                  )}
                >
                  |
                </span>
                {/* 4. 작성 시간 */}
                {timeMeta}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
