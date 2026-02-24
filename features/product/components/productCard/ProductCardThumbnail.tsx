/**
 * File Name : features/product/components/productCard/ProductCardThumbnail.tsx
 * Description : 제품 카드 썸네일 컴포넌트 (리스트/그리드 공통 사용)
 * Author : 임도헌
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 썸네일 전용 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  레이아웃 및 오버레이 가시성 향상
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 */
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PhotoIcon } from "@heroicons/react/24/outline";
import type { ViewMode } from "@/features/product/types";

interface ProductCardThumbnailProps {
  imageUrl?: string;
  viewMode: ViewMode;
  title: string;
  isPriority?: boolean;
  reservation_userId: number | null;
  purchase_userId: number | null;
}

/**
 * 제품 썸네일을 렌더링
 * - 이미지가 없을 경우 Placeholder 아이콘을 표시
 * - 판매 완료/예약 중 상태일 경우 오버레이 배지를 표시
 * - Grid/List 뷰에 따라 최적화된 이미지 사이즈(sizes prop)를 적용
 */
export default function ProductCardThumbnail({
  imageUrl,
  viewMode,
  title,
  isPriority,
  reservation_userId,
  purchase_userId,
}: ProductCardThumbnailProps) {
  const isSold = !!purchase_userId;
  const isReserved = !!reservation_userId && !isSold;

  return (
    <div className="relative h-full w-full bg-surface-dim flex items-center justify-center overflow-hidden">
      {imageUrl ? (
        <Image
          src={`${imageUrl}/public`}
          alt={title}
          fill
          priority={isPriority}
          sizes={
            viewMode === "grid"
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              : "160px"
          }
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105",
            (isSold || isReserved) && "opacity-60 grayscale-[0.5]"
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted/50 gap-1">
          <PhotoIcon className="w-8 h-8" />
          <span className="text-[10px] font-medium">No Image</span>
        </div>
      )}

      {/* 상태 오버레이 (판매완료/예약중) */}
      {(isSold || isReserved) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-2 text-center transition-opacity">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
              isSold ? "bg-neutral-600/90" : "bg-green-600/90"
            )}
          >
            {isSold ? "판매완료" : "예약중"}
          </span>
        </div>
      )}
    </div>
  );
}
