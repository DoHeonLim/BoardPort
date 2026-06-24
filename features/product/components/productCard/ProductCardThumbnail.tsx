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
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드에서는 썸네일 높이를 살짝 낮춰 정보 영역 비율을 균형화
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 Next 최적화 예외 처리하도록 isAnimated 플래그 반영
 * 2026.04.02  임도헌   Modified  제품 이미지 public variant 처리 유틸 공용화
 * 2026.04.10  임도헌   Modified  products 타이포 정책에 맞춰 이미지 비어있음 안내 라벨을 text-xs 기준으로 정리
 * 2026.04.13  임도헌   Modified  목록 첫 카드만 대표 LCP 후보로 다루도록 priority 사용 범위를 조정
 * 2026.04.13  임도헌   Modified  모바일 카드 실폭 기준으로 sizes를 보정해 과한 이미지 전송을 완화
 */
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PhotoIcon } from "@heroicons/react/24/outline";
import type { ViewMode } from "@/features/product/types";
import { toProductImagePublicUrl } from "@/features/product/utils/image";

interface ProductCardThumbnailProps {
  imageUrl?: string;
  isAnimated?: boolean;
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
  isAnimated = false,
  viewMode,
  title,
  isPriority,
  reservation_userId,
  purchase_userId,
}: ProductCardThumbnailProps) {
  const isSold = !!purchase_userId;
  const isReserved = !!reservation_userId && !isSold;
  const thumbnailUrl = toProductImagePublicUrl(imageUrl);

  return (
    <div className="relative h-full w-full bg-surface-dim flex items-center justify-center overflow-hidden">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          priority={isPriority}
          sizes={
            viewMode === "grid"
              ? "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
              : "(max-width: 640px) 96px, (max-width: 1024px) 144px, 160px"
          }
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105",
            (isSold || isReserved) && "opacity-60 grayscale-[0.5]"
          )}
          unoptimized={isAnimated}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted/50 gap-1">
          <PhotoIcon className="w-8 h-8" />
          <span className="text-xs font-medium">No Image</span>
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
