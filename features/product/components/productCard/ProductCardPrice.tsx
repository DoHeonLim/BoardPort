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
 */

import { formatToWon } from "@/lib/utils";

interface ProductCardPriceProps {
  price: number;
  purchase_userId: number | null;
  reservation_userId: number | null;
}

export default function ProductCardPrice({
  price,
  purchase_userId,
  reservation_userId,
}: ProductCardPriceProps) {
  // 상태 뱃지 로직
  const isSold = !!purchase_userId;
  const isReserved = !!reservation_userId && !isSold;
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-base sm:text-lg font-bold text-brand dark:text-brand-light">
        {formatToWon(price)}
        <span className="text-xs sm:text-sm font-normal ml-0.5 text-primary">
          원
        </span>
      </span>

      {/* 상태 뱃지 */}
      {isSold && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          판매완료
        </span>
      )}
      {isReserved && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          예약중
        </span>
      )}
    </div>
  );
}
