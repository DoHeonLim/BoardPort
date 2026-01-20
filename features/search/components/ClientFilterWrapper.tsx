/**
 * File Name : features/search/components/ClientFilterWrapper.tsx
 * Description : 클라이언트 사이드에서 필터 적용용 Wrapper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created
 * 2025.06.18  임도헌   Modified  서버컴포넌트에서 필터 상태를 클라이언트에서 다루기 위한 컴포넌트
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 및 버튼 스타일 통일
 * 2026.01.12  임도헌   Modified  height, padding 조정
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 */
"use client";

import { useState } from "react";
import { FilterState } from "@/lib/constants";
import type { Category } from "@/generated/prisma/client";
import SearchFilters from "@/features/search/components/SearchFilters";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

interface Props {
  categories: Category[];
  filters: FilterState;
}

export default function ClientFilterWrapper({ categories, filters }: Props) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setIsFilterOpen(true)}
        className="flex items-center gap-1.5 px-3 h-8 sm:h-9 text-xs sm:text-sm font-medium text-primary border border-border rounded-lg bg-surface hover:bg-surface-dim transition-colors shadow-sm"
      >
        <span>필터</span>
        <AdjustmentsHorizontalIcon className="size-4" />
      </button>

      <SearchFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        categories={categories}
        filters={filters}
      />
    </div>
  );
}
