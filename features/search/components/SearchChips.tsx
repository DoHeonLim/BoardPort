/**
 * File Name : features/search/components/SearchChips.tsx
 * Description : 적용된 검색 필터 칩 목록
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   filterTags useMemo를 분리한 칩 컴포넌트 생성
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 뱃지 전용 시맨틱 컬러(bg-badge) 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import type { Category } from "@/generated/prisma/client";
import { getCategoryName } from "@/lib/getCategoryName";
import {
  GAME_TYPE_DISPLAY,
  CONDITION_DISPLAY,
} from "@/features/product/constants";
import { FilterState } from "@/features/product/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface SearchChipsProps {
  filters: FilterState;
  categories: Category[];
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  removeParam: (key: string) => void;
  removeParams: (...keys: string[]) => void;
  closeSearch: () => void;
  className?: string;
}

/**
 * 현재 적용된 필터를 뱃지 형태로 표시하고 삭제할 수 있는 컴포넌트
 */
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
