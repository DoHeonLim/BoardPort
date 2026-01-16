/**
 * File Name : components/search/SearchChips
 * Description : 검색 필터에 따라 렌더링되는 칩 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   filterTags useMemo를 분리한 칩 컴포넌트 생성
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 뱃지 전용 시맨틱 컬러(bg-badge) 적용
 */
"use client";

import {
  GAME_TYPE_DISPLAY,
  CONDITION_DISPLAY,
  FilterState,
} from "@/lib/constants";
import { getCategoryName } from "@/lib/category/getCategoryName";
import type { Category } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SearchChipsProps {
  filters: FilterState;
  categories: Category[];
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  removeParam: (key: string) => void;
  removeParams: (...keys: string[]) => void;
  closeSearch: () => void;
  className?: string;
}

export default function SearchChips({
  filters,
  categories,
  setFilters,
  removeParam,
  removeParams,
  closeSearch,
  className,
}: SearchChipsProps) {
  const chips: JSX.Element[] = [];

  const renderChip = (key: string, label: string, onRemove: () => void) => (
    <div
      key={key}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
        "bg-badge text-badge-text border border-transparent dark:border-white/10"
      )}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:text-primary transition-colors focus:outline-none"
        aria-label={`${label} 필터 제거`}
      >
        <XMarkIcon className="size-3.5" />
      </button>
    </div>
  );

  // 가격 Filter
  if (filters.minPrice || filters.maxPrice) {
    const label = `가격: ${filters.minPrice || "0"} ~ ${filters.maxPrice || "∞"}`;
    chips.push(
      renderChip("price", label, () => {
        setFilters((prev) => ({ ...prev, minPrice: "", maxPrice: "" }));
        removeParams("minPrice", "maxPrice");
        closeSearch();
      })
    );
  }

  // 그외 Filters
  Object.entries(filters).forEach(([key, value]) => {
    if (!value || key === "minPrice" || key === "maxPrice") return;

    let displayValue = value;
    if (key === "game_type")
      displayValue = GAME_TYPE_DISPLAY[value as keyof typeof GAME_TYPE_DISPLAY];
    else if (key === "condition")
      displayValue = CONDITION_DISPLAY[value as keyof typeof CONDITION_DISPLAY];
    else if (key === "category")
      displayValue = getCategoryName(value, categories);

    const labelMap: Record<string, string> = {
      game_type: "게임",
      condition: "상태",
      category: "분류",
    };

    const label = `${labelMap[key] ?? key}: ${displayValue}`;

    chips.push(
      renderChip(key, label, () => {
        setFilters((prev) => ({ ...prev, [key]: "" }));
        removeParam(key);
        closeSearch();
      })
    );
  });

  if (chips.length === 0) return null;

  return <div className={cn("flex flex-wrap gap-2", className)}>{chips}</div>;
}
