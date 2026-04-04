/**
 * File Name : features/product/components/ProductDesktopHeader.tsx
 * Description : 제품 탭 데스크톱 전용 2단 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.10  임도헌   Created   데스크톱 제품 헤더를 지역/검색/알림 + 분류/요약/필터 2단 구조로 재구성
 * 2026.03.11  임도헌   Modified  모바일 헤더와 동일한 요약 규칙을 공용 유틸로 통일
 * 2026.03.11  임도헌   Modified  글래스모피즘을 제거하고 디자인 토큰 기반의 평면형 헤더 톤으로 정리
 * 2026.03.12  임도헌   Modified  데스크톱 제품 헤더의 검색/요약/필터 2행 분기 구조 명확화
 * 2026.03.14  임도헌   Modified  필터만 즉시 초기화할 수 있는 헤더 액션을 추가하고 검색어는 유지하도록 보강
 * 2026.03.14  임도헌   Modified  필터 요약 박스 내 X 버튼으로 초기화 통합, 별도 refresh 버튼 제거
 * 2026.03.25  임도헌   Modified  데스크톱 헤더 요약 박스와 초기화 액션 존재감을 낮춰 목록보다 크롬이 먼저 튀지 않도록 polish
 * 2026.04.02  임도헌   Modified  데스크톱 헤더 JSDoc 보강
 * 2026.04.02  임도헌   Modified  검색 기록/인기 검색 타입 import를 search 도메인 공용 타입 기준으로 정리
 */
"use client";

import { useState } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ProductCategoryDropdown from "@/features/search/components/ProductCategoryDropdown";
import ClientFilterWrapper from "@/features/search/components/ClientFilterWrapper";
import RegionFilterToggle from "@/features/search/components/RegionFilterToggle";
import NotificationBell from "@/components/global/NotificationBell";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import SearchModal from "@/features/search/components/SearchModal";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";
import { useSearchParamsUtils } from "@/features/search/hooks/useSearchParamsUtils";
import type {
  PopularSearchItem,
  SearchHistoryItem,
} from "@/features/search/types";
import { getProductHeaderSummary } from "@/features/product/utils/getProductHeaderSummary";
import type { Category } from "@/generated/prisma/client";
import type { FilterState } from "@/features/product/types";
import type { RegionRange } from "@/generated/prisma/enums";

interface ProductDesktopHeaderProps {
  categories: Category[];
  keyword: string | undefined;
  searchHistory: SearchHistoryItem[];
  popularSearches: PopularSearchItem[];
  filters: FilterState;
  userId: number;
  unreadCount: number;
  userRegion1?: string | null;
  userRegion2?: string | null;
  userRegion3?: string | null;
  currentRange: RegionRange | "ALL";
  fullLocation: string | null;
}

/**
 * 데스크톱 제품 헤더
 *
 * [기능]
 * - 지역, 검색, 알림을 1행에서 제공
 * - 분류, 필터 요약(+ 활성 시 X 초기화), 필터 버튼을 2행에서 제공
 * - 검색 모달 열기 및 최근 검색어 갱신 처리
 *
 * @param {ProductDesktopHeaderProps} props - 데스크톱 목록 헤더 렌더링에 필요한 검색/필터/알림 상태
 */
export default function ProductDesktopHeader({
  categories,
  keyword,
  searchHistory,
  popularSearches,
  filters,
  userId,
  unreadCount,
  userRegion1,
  userRegion2,
  userRegion3,
  currentRange,
  fullLocation,
}: ProductDesktopHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { resetFilterParams, updateKeyword } = useSearchParamsUtils();
  const {
    history: localSearchHistory,
    addHistory,
    removeHistory,
    clearHistory,
  } = useSearchHistory(searchHistory);

  const { summary: filterSummary } = getProductHeaderSummary({
    categories,
    filters,
    keyword,
  });
  const hasActiveFilters = Boolean(
    filters.category ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.game_type ||
    filters.condition
  );

  const handleSearch = (nextKeyword: string) => {
    addHistory(nextKeyword);
    updateKeyword(nextKeyword);
    setIsSearchOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background md:block">
        <div className="mx-auto max-w-5xl px-5 pt-3 pb-3 lg:px-6">
          <div className="flex items-center gap-3 py-1">
            <div className="shrink-0">
              {userRegion1 ? (
                <RegionFilterToggle
                  userRegion1={userRegion1}
                  userRegion2={userRegion2}
                  userRegion3={userRegion3}
                  currentRange={currentRange}
                  tone="neutral"
                />
              ) : (
                <MyLocationButton
                  variant="header"
                  fullLocation={fullLocation}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="검색창 열기"
              className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-surface-dim px-4 text-sm text-muted transition-colors hover:bg-surface"
            >
              <MagnifyingGlassIcon className="size-5 shrink-0 text-muted" />
              <span className="truncate text-left">
                {keyword || "상품 검색"}
              </span>
            </button>

            <div className="shrink-0">
              <NotificationBell userId={userId} initialCount={unreadCount} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="shrink-0">
              <ProductCategoryDropdown categories={categories} tone="neutral" />
            </div>

            {/* 필터 요약 박스 — 활성 필터 있을 때 X 버튼 내장 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center rounded-2xl border border-border-subtle bg-surface px-4 py-2.5">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted/90">
                  {filterSummary}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilterParams}
                    aria-label="필터 초기화 (검색어 유지)"
                    className="ml-2 shrink-0 rounded-full p-0.5 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
                  >
                    <XMarkIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <ClientFilterWrapper
                categories={categories}
                filters={filters}
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </header>

      <SearchModal
        isOpen={isSearchOpen}
        isMobile={false}
        keyword={keyword}
        basePath="/products"
        searchHistory={localSearchHistory ?? []}
        popularSearches={popularSearches}
        onSearch={handleSearch}
        onClose={() => setIsSearchOpen(false)}
        onRemoveHistory={removeHistory}
        onClearHistory={clearHistory}
      />
    </>
  );
}
