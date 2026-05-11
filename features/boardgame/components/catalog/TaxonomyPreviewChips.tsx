/**
 * File Name : features/boardgame/components/catalog/TaxonomyPreviewChips.tsx
 * Description : 보드게임 목록 카드 taxonomy 미리보기 칩
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 카드의 카테고리/메커니즘 칩 표시 UI 분리
 */

import { getTaxonomyLabel } from "@/features/boardgame/utils/format";

interface TaxonomyPreviewChipsProps {
  categories: Array<{ id: number; bggName: string; koName: string | null }>;
  mechanics: Array<{ id: number; bggName: string; koName: string | null }>;
}

/**
 * 목록 카드 안에서 카테고리와 메커니즘을 최대 2개씩 표시
 *
 * @param props - category/mechanic taxonomy 목록
 * @returns taxonomy preview 칩 묶음
 */
export default function TaxonomyPreviewChips({
  categories,
  mechanics,
}: TaxonomyPreviewChipsProps) {
  const chips = [
    ...categories.slice(0, 2).map((item) => ({
      ...item,
      kind: "카테고리",
      className:
        "border-brand/25 bg-brand/10 text-brand dark:border-brand-light/40 dark:bg-brand-light/15 dark:text-brand-light",
    })),
    ...mechanics.slice(0, 2).map((item) => ({
      ...item,
      kind: "메커니즘",
      className:
        "border-border-subtle bg-surface-dim text-muted dark:border-border dark:text-primary",
    })),
  ];

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((item) => (
        <span
          key={`${item.kind}-${item.id}`}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.className}`}
        >
          {getTaxonomyLabel(item)}
        </span>
      ))}
    </div>
  );
}
