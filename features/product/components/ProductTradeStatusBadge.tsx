/**
 * File Name : features/product/components/ProductTradeStatusBadge.tsx
 * Description : 제품 거래 상태 공용 배지 (예약/판매완료)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.18  임도헌   Created   예약/판매완료 상태 표시 색상과 라벨을 공용화
 */

import { PRODUCT_STATUS_LABEL } from "@/features/product/constants";
import type { ProductStatus } from "@/features/product/types";
import { cn } from "@/lib/utils";

type TradeStatus = Exclude<ProductStatus, "selling">;

interface ProductTradeStatusBadgeProps {
  status: TradeStatus;
  variant?: "soft" | "solid";
  className?: string;
}

const softStyles: Record<TradeStatus, string> = {
  reserved:
    "border border-green-500/20 bg-green-500/15 text-green-700 dark:border-green-400/25 dark:bg-green-400/15 dark:text-green-100",
  sold: "border border-border bg-surface-dim text-muted",
};

const solidStyles: Record<TradeStatus, string> = {
  reserved: "bg-green-600/90 text-white",
  sold: "bg-neutral-600/90 text-white",
};

/**
 * 예약/판매완료처럼 기본 판매 중 상태와 구분이 필요한 거래 상태만 표시한다.
 * - soft: 카드 본문, 상세 헤더, 판매 내역용
 * - solid: 이미지 오버레이용
 */
export default function ProductTradeStatusBadge({
  status,
  variant = "soft",
  className,
}: ProductTradeStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold shadow-sm",
        variant === "solid" ? solidStyles[status] : softStyles[status],
        className
      )}
    >
      {PRODUCT_STATUS_LABEL[status]}
    </span>
  );
}
