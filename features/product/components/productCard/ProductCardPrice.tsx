/**
 * File Name : features/product/components/productCard/ProductCardPrice.tsx
 * Description : 제품 가격 및 판매 상태 뱃지 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 카드 가격/상태 파트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 컬러 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드에서 가격/상태 배지 밀도를 조정
 */

import { cn } from "@/lib/utils";
import { formatToWon } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardPriceProps {
  price: number;
  purchase_userId: number | null;
  reservation_userId: number | null;
  viewMode?: ViewMode;
}

/**
 * 가격과 판매 상태(작은 배지)를 표시
 * 썸네일 오버레이 외에도 텍스트 영역에 상태를 다시 한 번 명시
 */
export default function ProductCardPrice({
  price,
  purchase_userId,
  reservation_userId,
  viewMode = "list",
}: ProductCardPriceProps) {
  const isSold = !!purchase_userId;
  const isReserved = !!reservation_userId && !isSold;
  const isGrid = viewMode === "grid";

  return (
    <div className={cn("flex items-center mt-1", isGrid ? "gap-1.5" : "gap-2")}>
      <span
        className={cn(
          "font-bold text-brand dark:text-brand-light",
          isGrid ? "text-[15px] sm:text-lg" : "text-base sm:text-lg"
        )}
      >
        {formatToWon(price)}
        <span
          className={cn(
            "font-normal ml-0.5 text-primary",
            isGrid ? "text-[11px] sm:text-sm" : "text-xs sm:text-sm"
          )}
        >
          원
        </span>
      </span>

      {isSold && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 sm:text-[10px]">
          판매완료
        </span>
      )}
      {isReserved && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 sm:text-[10px]">
          예약중
        </span>
      )}
    </div>
  );
}
