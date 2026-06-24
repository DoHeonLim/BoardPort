/**
 * File Name : features/search/components/ClientFilterWrapper.tsx
 * Description : 필터 트리거 버튼 및 모달 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.18  임도헌   Created
 * 2025.06.18  임도헌   Modified  서버컴포넌트에서 필터 상태를 클라이언트에서 다루기 위한 컴포넌트
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 및 버튼 스타일 통일
 * 2026.01.12  임도헌   Modified  height, padding 조정
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  모달 Dynamic Import 적용
 * 2026.03.06  임도헌   Modified  필터 트리거 버튼 터치 타겟 및 aria-label 보강
 * 2026.03.11  임도헌   Modified  neutral 톤과 compact 조합을 추가해 헤더 버튼 스타일 통일
 * 2026.03.12  임도헌   Modified  헤더 필터 버튼과 모달 래퍼의 compact/tone 분기 역할 명확화
 * 2026.04.02  임도헌   Modified  검색 필터 타입 import를 search 도메인 공용 타입 기준으로 정리
 * 2026.04.20  임도헌   Modified  제품 헤더 필터 트리거에 공용 포커스 링을 적용해 neutral 버튼 문법을 맞춤
 */
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import type { Category } from "@/generated/prisma/client";
import type { SearchFilterValues } from "@/features/search/types";

const SearchFilters = dynamic(
  () => import("@/features/search/components/SearchFilters"),
  {
    ssr: false,
    loading: () => null,
  }
);

interface Props {
  categories: Category[];
  filters: SearchFilterValues;
  compact?: boolean;
  tone?: "default" | "neutral";
}

/**
 * 상세 필터 버튼과 필터 모달을 관리하는 클라이언트 래퍼
 * - 필터 모달의 유일한 진입점
 * - compact/tone 조합에 따라 헤더 전용 버튼 스타일 분기
 */
export default function ClientFilterWrapper({
  categories,
  filters,
  compact = false,
  tone = "default",
}: Props) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setIsFilterOpen(true)}
        aria-label="상세 필터 열기"
        className={
          compact
            ? tone === "neutral"
              ? "focus-ring-soft inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border border-border bg-surface-dim px-2.5 text-primary shadow-sm transition-colors hover:bg-surface sm:h-11 sm:min-w-[44px] sm:px-3"
              : "focus-ring-soft inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border border-border/70 bg-surface/90 px-2.5 text-primary shadow-sm transition-colors hover:bg-surface-dim sm:h-11 sm:min-w-[44px] sm:px-3"
            : tone === "neutral"
              ? "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl border border-border bg-surface-dim px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-surface sm:h-11 sm:text-sm"
              : "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-surface-dim sm:h-11 sm:text-sm"
        }
      >
        <AdjustmentsHorizontalIcon className="size-4" />
        <span className={compact ? "sr-only" : ""}>필터</span>
      </button>

      {isFilterOpen && (
        <SearchFilters
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          categories={categories}
          filters={filters}
        />
      )}
    </div>
  );
}
