/**
 * File Name : features/product/components/productCard/ProductCardBoardGameBadge.tsx
 * Description : 상품 카드 내 연결 보드게임 요약 배지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   상품 목록 카드에서 연결된 보드게임을 작게 식별할 수 있는 배지 추가
 * 2026.05.03  임도헌   Modified  다크모드 목록에서 보드게임 배지가 묻히지 않도록 대비 보강
 * 2026.05.04  임도헌   Modified  데스크톱 리스트 우측 상단 배치와 모바일/그리드 inline 배치 분리
 */

import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import { cn } from "@/lib/utils";

interface ProductCardBoardGameBadgeProps {
  items?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
  viewMode: "grid" | "list";
  placement?: "inline" | "corner";
  className?: string;
}

/**
 * 상품 카드 링크 내부에 들어가는 비상호작용 보드게임 배지
 * 카드 전체 상세 링크 구조를 유지하기 위한 중첩 링크 회피와 연결 여부 요약 표시
 *
 * @param props - 연결 보드게임 목록과 카드 뷰 모드
 * @returns 첫 번째 보드게임명과 추가 개수 배지
 */
export default function ProductCardBoardGameBadge({
  items = [],
  viewMode,
  placement = "inline",
  className,
}: ProductCardBoardGameBadgeProps) {
  if (!items.length) return null;

  const [firstItem, ...restItems] = items;
  const label =
    firstItem.boardGame.locale.title || firstItem.boardGame.primaryName;
  const isCorner = placement === "corner";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        isCorner
          ? "max-w-[42%]"
          : viewMode === "grid"
            ? "mt-0.5"
            : "mt-1",
        className
      )}
    >
      <span className="sr-only">
        연결된 보드게임: {label}
        {restItems.length ? ` 외 ${restItems.length}개` : ""}
      </span>
      <span className="inline-flex min-w-0 max-w-full items-center rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold leading-5 text-brand-dark shadow-sm dark:border-brand-light/45 dark:bg-brand-light/15 dark:text-white">
        <span className="truncate">{label}</span>
      </span>
      {restItems.length > 0 && !isCorner && (
        <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-secondary">
          +{restItems.length}
        </span>
      )}
    </div>
  );
}
