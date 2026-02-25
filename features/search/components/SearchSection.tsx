/**
 * File Name : features/search/components/SearchSection.tsx
 * Description : 검색 섹션 메인 컴포넌트 (검색바 + 필터 칩 + 모달 제어)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.17  임도헌   Created
 * 2024.12.17  임도헌   Modified  검색 섹션 컴포넌트 생성
 * 2024.12.29  임도헌   Modified  검색후 섹션 컴포넌트 닫히게 변경
 * 2025.04.29  임도헌   Modified  검색 링크 수정(기존 products에서는 search/product로 이동했음)
 * 2025.04.29  임도헌   Modified  검색시 기존 검색 파라미터를 유지하지 않게 변경
 * 2025.04.29  임도헌   Modified  최근 검색 기록 실시간으로 업데이트 되도록 변경
 * 2025.04.30  임도헌   Modified  성능 최적화 및 사용자 경험 개선
 * 2025.06.12  임도헌   Modified  카테고리 평탄화
 * 2025.06.15  임도헌   Modieifd  handleFilterRemove코드 수정(칩 삭제 시 페이지 이동)
 * 2025.06.17  임도헌   Modified  useSearchHistory 및 모듈 분리 적용
 * 2025.06.18  임도헌   Modified  filterTags 가격 칩 2개 나오는 오류 수정
 * 2025.06.21  임도헌   Modified  SearchModal 컴포넌트로 모달 구조 분리
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 스타일 및 다크모드 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.20  임도헌   Modified  타입 경로 수정 및 Import 정렬
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  모달 Dynamic Import 적용
 * 2026.02.08  임도헌   Modified  헤더 우측 슬롯(rightAction) 추가 (알림 벨 배치용)
 */
"use client";

import dynamic from "next/dynamic";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";
import { useSearchParamsUtils } from "@/features/search/hooks/useSearchParamsUtils";
import { useSearchContext } from "@/components/global/providers/SearchProvider";
import ProductCategoryDropdown from "@/features/search/components/ProductCategoryDropdown";
import SearchChips from "@/features/search/components/SearchChips";
import { cn } from "@/lib/utils";
import type { Category } from "@/generated/prisma/client";
import type {
  SearchHistoryItem,
  PopularSearchItem,
} from "@/features/product/types";

const SearchModal = dynamic(
  () => import("@/features/search/components/SearchModal"),
  { ssr: false } // 검색 모달은 클라이언트 인터랙션 전용
);

interface SearchSectionProps {
  categories: Category[];
  keyword: string | undefined;
  searchHistory: SearchHistoryItem[];
  popularSearches: PopularSearchItem[];
  basePath: string;
  rightAction?: React.ReactNode;
}

/**
 * 검색 섹션 컨테이너
 *
 * [구조]
 * 1. 상단 바: 카테고리 드롭다운 + 검색 트리거 버튼
 * 2. 필터 칩 영역: 현재 적용된 필터를 보여주고 삭제 기능 제공
 * 3. 검색 모달: 검색어 입력, 최근 검색어, 인기 검색어 표시
 * 4. 알림 벨
 *
 * [동작]
 * - 검색 트리거 버튼 클릭 시 `SearchModal`이 열림
 * - 모달에서 검색어를 입력하거나 기록을 클릭하면 `handleSearch`가 호출되어 URL을 업데이트
 */
export default function SearchSection({
  categories,
  keyword,
  searchHistory,
  popularSearches,
  basePath,
  rightAction,
}: SearchSectionProps) {
  const isMobile = useIsMobile();
  const { filters, setFilters, isSearchOpen, setIsSearchOpen } =
    useSearchContext();
  const { updateKeyword, removeParam, removeParams } = useSearchParamsUtils();

  const {
    history: localSearchHistory,
    addHistory,
    removeHistory,
    clearHistory,
  } = useSearchHistory(searchHistory);

  const handleSearch = (keyword: string) => {
    addHistory(keyword);
    updateKeyword(keyword);
    setIsSearchOpen(false);
  };

  return (
    <div className="bg-background transition-colors">
      {/* 1. 상단 바 (검색 트리거) */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <ProductCategoryDropdown
          categories={categories}
          onCategorySelect={() => setIsSearchOpen(false)}
        />

        <div className="relative flex-1">
          <button
            type="button"
            className={cn(
              "w-full h-10 px-4 flex items-center gap-2 rounded-xl text-sm transition-colors",
              "bg-surface-dim text-muted hover:bg-black/5 dark:hover:bg-white/10",
              "border border-transparent focus:outline-none focus:ring-2 focus:ring-brand/50"
            )}
            onClick={() => setIsSearchOpen(true)}
            aria-label="검색창 열기"
          >
            <MagnifyingGlassIcon className="size-5 text-muted" />
            <span
              className={cn(
                keyword ? "text-primary font-medium" : "text-muted"
              )}
            >
              {keyword || "검색어를 입력하세요"}
            </span>
          </button>
        </div>
        {/* 우측 액션 슬롯 (알림 벨 등) */}
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>

      {/* 2. 필터 칩 (검색창이 닫혀있을 때만 노출) */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isSearchOpen ? "max-h-0 opacity-0" : "max-h-20 opacity-100"
        )}
      >
        <SearchChips
          filters={filters}
          categories={categories}
          setFilters={setFilters}
          removeParam={removeParam}
          removeParams={removeParams}
          closeSearch={() => setIsSearchOpen(false)}
          className="p-4"
        />
      </div>

      {/* 3. 검색 모달 (Overlay) */}
      <SearchModal
        isOpen={isSearchOpen}
        isMobile={isMobile}
        keyword={keyword}
        basePath={basePath}
        searchHistory={localSearchHistory}
        popularSearches={popularSearches}
        onSearch={handleSearch}
        onClose={() => setIsSearchOpen(false)}
        onRemoveHistory={removeHistory}
        onClearHistory={clearHistory}
      />
    </div>
  );
}
