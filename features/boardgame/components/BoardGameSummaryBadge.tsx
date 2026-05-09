/**
 * File Name : features/boardgame/components/BoardGameSummaryBadge.tsx
 * Description : 목록 카드에서 연결 보드게임을 요약 표시하는 비상호작용 배지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   게시글/방송 카드에서 연결 보드게임을 작게 식별할 수 있는 공용 배지 추가
 * 2026.05.04  임도헌   Modified  목록 카드에서 연결 보드게임임을 더 명확히 보이도록 아이콘형 prefix 추가
 */

import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import { cn } from "@/lib/utils";

interface BoardGameSummaryBadgeProps {
  items?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
  className?: string;
}

/**
 * 카드 전체가 이미 링크인 목록 UI에서 중첩 링크 없이 연결 보드게임만 요약 표시
 *
 * @param props - 연결 보드게임 목록과 추가 className
 * @returns 첫 번째 보드게임명과 추가 연결 개수 배지
 */
export default function BoardGameSummaryBadge({
  items = [],
  className,
}: BoardGameSummaryBadgeProps) {
  if (!items.length) return null;

  const [firstItem, ...restItems] = items;
  const label =
    firstItem.boardGame.locale.title || firstItem.boardGame.primaryName;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span className="sr-only">
        연결된 보드게임: {label}
        {restItems.length ? ` 외 ${restItems.length}개` : ""}
      </span>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold leading-5 text-brand-dark shadow-sm dark:border-brand-light/35 dark:bg-brand-light/15 dark:text-white">
        <span aria-hidden="true">🎲</span>
        <span className="truncate">{label}</span>
      </span>
      {restItems.length > 0 && (
        <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-secondary">
          +{restItems.length}
        </span>
      )}
    </div>
  );
}
