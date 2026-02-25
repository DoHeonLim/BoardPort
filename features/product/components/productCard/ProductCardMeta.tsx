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
 */

"use client";

import {
  EyeIcon,
  HeartIcon,
  ArrowUpIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import type { ISODate } from "@/features/product/types";

interface ProductCardMetaProps {
  views: number;
  likes: number;
  createdAt: ISODate;
  bumpCount?: number;
  region2?: string | null;
  region3?: string | null;
}

/**
 * 하단 메타 정보(좋아요 수, 조회수, 작성 시간, 위치)를 표시
 */
export default function ProductCardMeta({
  views,
  likes,
  createdAt,
  bumpCount = 0,
  region2,
  region3,
}: ProductCardMetaProps) {
  const dateValue = createdAt ? createdAt.toString() : "";

  // 동 단위까지만 표시 (예: "서초구 방배동")
  const locationText = [region2, region3].filter(Boolean).join(" ");
  return (
    <div className="flex items-center text-[10px] sm:text-xs text-muted gap-2">
      {/* 끌어올리기 표시 (있을 때만) */}
      {bumpCount > 0 && (
        <div className="flex items-center gap-0.5 text-brand dark:text-brand-light font-bold">
          <ArrowUpIcon className="size-3" />
          <span>{bumpCount}</span>
        </div>
      )}

      {/* 좋아요 */}
      <div className="flex items-center gap-0.5">
        <HeartIcon
          className={`size-3 ${likes > 0 ? "text-rose-500" : "text-muted/70"}`}
        />
        <span>{likes}</span>
      </div>

      {/* 조회수 */}
      <div className="flex items-center gap-0.5">
        <EyeIcon className="size-3 text-muted/70" />
        <span>{views}</span>
      </div>

      <span className="text-border dark:text-neutral-700">|</span>
      {/* 위치 정보 (공간 부족시 말줄임 고려) */}
      {locationText && (
        <>
          <div
            className="flex items-center gap-0.5 truncate max-w-[80px] sm:max-w-[100px]"
            title={locationText}
          >
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
          <span className="text-border dark:text-neutral-700 shrink-0">|</span>
        </>
      )}

      <TimeAgo date={dateValue} className="text-muted whitespace-nowrap" />
    </div>
  );
}
