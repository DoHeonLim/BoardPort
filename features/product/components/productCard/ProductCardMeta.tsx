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
 */
export default function ProductCardMeta({
  views,
  likes,
  createdAt,
  bumpCount = 0,
  region2,
  region3,
  viewMode = "list",
}: ProductCardMetaProps) {
  const dateValue = createdAt ? createdAt.toString() : "";
  const isGrid = viewMode === "grid";
  // 동 단위까지만 표시 (예: "동작구 사당동")
  const locationText = [region2, region3].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted w-full min-w-0 overflow-hidden">
      {/* 1. 끌어올리기 (있을 때만 표시) */}
      {bumpCount > 0 && (
        <div className="flex items-center gap-0.5 text-brand dark:text-brand-light font-bold shrink-0">
          <ArrowUpIcon className="size-3" />
          <span>{bumpCount}</span>
        </div>
      )}

      {/* 2. 통계 그룹 (좋아요 & 조회수) - 묶어서 고정 크기 유지 */}
      <div className="flex items-center gap-2 shrink-0">
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
              <span className="text-border dark:text-neutral-700 shrink-0">
                |
              </span>
              <div
                className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden"
                title={locationText}
              >
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            </>
          )}
          <span className="text-border dark:text-neutral-700 shrink-0">|</span>
          {/* 4. 작성 시간 */}
          <TimeAgo
            date={dateValue}
            className="text-muted whitespace-nowrap shrink-0"
          />
        </>
      )}
    </div>
  );
}
