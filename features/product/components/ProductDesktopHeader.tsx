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
 * 2026.04.13  임도헌   Modified  검색 모달을 동적 로딩으로 전환해 products 헤더 초기 JS 평가 부담을 완화
 * 2026.04.13  임도헌   Modified  모바일/데스크톱 헤더와 중복되던 검색/필터 상태 로직을 공통 훅으로 정리
 * 2026.04.17  임도헌   Modified  데스크톱 제품 헤더의 상품 검색 버튼 스타일을 정리
 * 2026.04.20  임도헌   Modified  다크 모드에서도 상품 검색 트리거 포커스 톤이 다른 헤더 액션과 일관되도록 공용 포커스 유틸을 적용
 * 2026.04.20  임도헌   Modified  앱 셸(sm) 기준과 데스크톱 헤더 노출 기준을 맞춰 640~767px 구간 레이아웃 mismatch 정리
 * 2026.06.14  임도헌   Modified  긴 필터 요약을 말줄임 대신 가로 스크롤로 확인할 수 있게 조정
 * 2026.06.15  임도헌   Modified  검색어만 적용된 상태도 요약 X 버튼으로 바로 해제할 수 있게 조정
 * 2026.08.13  임도헌   Modified  데스크톱 검색 기록 cache에 현재 사용자 ID 전달
 */
"use client";

import dynamic from "next/dynamic";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ProductCategoryDropdown from "@/features/search/components/ProductCategoryDropdown";
import ClientFilterWrapper from "@/features/search/components/ClientFilterWrapper";
import RegionFilterToggle from "@/features/search/components/RegionFilterToggle";
import NotificationBell from "@/components/global/NotificationBell";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import { useProductHeaderState } from "@/features/product/hooks/useProductHeaderState";
import type {
  PopularSearchItem,
  SearchHistoryItem,
} from "@/features/search/types";
import type { Category } from "@/generated/prisma/client";
import type { FilterState } from "@/features/product/types";
import type { RegionRange } from "@/generated/prisma/enums";

const SearchModal = dynamic(
  () => import("@/features/search/components/SearchModal"),
  { loading: () => null }
);

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
  const {
    isSearchOpen,
    setIsSearchOpen,
    handleSearch,
    filterSummary,
    hasActiveKeyword,
    hasActiveFilters,
    resetFilterParams,
    clearKeyword,
    localSearchHistory,
    removeHistory,
    clearHistory,
  } = useProductHeaderState({
    userId,
    categories,
    filters,
    keyword,
    searchHistory,
  });
  const showSummaryReset = hasActiveFilters || hasActiveKeyword;
  const handleSummaryReset = hasActiveFilters ? resetFilterParams : clearKeyword;
  const summaryResetLabel = hasActiveFilters
    ? "필터 초기화 (검색어 유지)"
    : "검색어 초기화";

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background sm:block">
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
              className="searchbar-compact-trigger focus-ring-soft min-w-0 flex-1 gap-3 px-4"
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

            <div className="min-w-0 flex-1">
              <div className="flex items-center rounded-2xl border border-border-subtle bg-surface px-4 py-2.5">
                <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                  <p className="w-max whitespace-nowrap text-sm font-medium text-muted/90">
                    {filterSummary}
                  </p>
                </div>
                {showSummaryReset && (
                  <button
                    type="button"
                    onClick={handleSummaryReset}
                    aria-label={summaryResetLabel}
                    className="focus-ring-soft ml-2 shrink-0 rounded-full p-0.5 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
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
