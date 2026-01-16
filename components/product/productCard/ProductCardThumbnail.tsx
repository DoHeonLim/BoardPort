/**
 * File Name : components/product/ProductCardThumbnail
 * Description : 제품 카드 썸네일 컴포넌트 (리스트/그리드 공통 사용)
 * Author : 임도헌
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 썸네일 전용 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  레이아웃 및 오버레이 가시성 향상
 */
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PhotoIcon } from "@heroicons/react/24/outline";

interface ProductCardThumbnailProps {
  imageUrl?: string;
  viewMode: "grid" | "list";
  title: string;
  isPriority?: boolean;
  reservation_userId: number | null;
  purchase_userId: number | null;
}

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
    // bg-surface-dim (부드러운 회색)을 깔아서 이미지가 로딩되거나 투명할 때도 형태 유지
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
          // object-cover로 강제 채움 (작은 이미지도 확대됨)
          // 만약 원본 비율이 중요하면 object-contain으로 바꾸고 p-2 추가
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105",
            (isSold || isReserved) && "opacity-60 grayscale-[0.5]" // 상태 있을 때 흐림 처리 강화
          )}
        />
      ) : (
        // 이미지가 없을 때 Placeholder
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
