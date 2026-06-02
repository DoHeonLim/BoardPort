/**
 * File Name : features/product/components/ProductMobileHeader.tsx
 * Description : 제품 탭 모바일 전용 2단 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.10  임도헌   Created   모바일 제품 헤더를 지역/검색/알림 + 분류/요약/필터 2단 구조로 분리
 * 2026.03.10  임도헌   Modified  스크롤 방향에 따라 숨김/재노출되는 모바일 헤더 동작 추가
 * 2026.03.11  임도헌   Modified  공용 useHideableHeader 훅으로 스크롤 숨김 로직을 통합해 중복 레거시 코드 제거
 * 2026.03.11  임도헌   Modified  디자인 토큰 기준의 평면형 헤더 톤과 검색/요약 박스 스타일 정리
 * 2026.03.12  임도헌   Modified  지역/검색/알림 + 분류/요약/필터 조합의 2행 모바일 헤더 구조 명확화
 * 2026.03.14  임도헌   Modified  필터만 즉시 초기화할 수 있는 헤더 액션을 추가하고 검색어는 유지하도록 보강
 * 2026.03.14  임도헌   Modified  필터 요약 박스 내 X 버튼으로 초기화 통합, 별도 refresh 버튼 제거
 * 2026.03.19  임도헌   Modified  2행 필터 요약 박스의 배경/텍스트 대비를 한 단계 낮춰 작은 화면에서 존재감을 완화
 * 2026.03.25  임도헌   Modified  모바일 헤더 2행의 요약 박스와 초기화 액션 톤 정리
 * 2026.04.02  임도헌   Modified  검색 기록/인기 검색 타입 import를 search 도메인 공용 타입 기준으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 모바일 제품 헤더 요약 타이포를 정리
 * 2026.04.13  임도헌   Modified  검색 모달을 동적 로딩으로 전환해 초기 products 헤더 번들을 경량화
 * 2026.04.13  임도헌   Modified  헤더 spacer의 grid-template-rows 전환 애니메이션을 제거해 모바일 레이아웃 비용을 완화
 * 2026.04.13  임도헌   Modified  모바일/데스크톱 헤더와 중복되던 검색/필터 상태 로직을 공통 훅으로 정리
 * 2026.04.17  임도헌   Modified  모바일 제품 헤더의 상품 검색 버튼 스타일을 정리
 * 2026.05.30  임도헌   Modified  모바일 제품 필터 헤더의 상하 여백을 압축해 목록 가시 영역 확보
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
import { useHideableHeader } from "@/hooks/useHideableHeader";
import type { Category } from "@/generated/prisma/client";
import type { FilterState } from "@/features/product/types";
import type { RegionRange } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const DEFAULT_MOBILE_HEADER_HEIGHT = 96;

const SearchModal = dynamic(
  () => import("@/features/search/components/SearchModal"),
  { loading: () => null }
);

interface ProductMobileHeaderProps {
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
 * 모바일 제품 헤더
 *
 * [기능]
 * - 지역, 검색, 알림을 1행에서 제공
 * - 분류, 필터 요약(+ 활성 시 X 초기화), 필터 버튼을 2행에서 제공
 * - 스크롤 방향에 따라 헤더 hide/reveal 적용
 * - 검색 모달 열기 및 최근 검색어 갱신 처리
 */
export default function ProductMobileHeader({
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
}: ProductMobileHeaderProps) {
  const { headerRef, headerHeight, isVisible } =
    useHideableHeader<HTMLElement>();
  const {
    isSearchOpen,
    setIsSearchOpen,
    handleSearch,
    filterSummary,
    hasActiveFilters,
    resetFilterParams,
    localSearchHistory,
    removeHistory,
    clearHistory,
  } = useProductHeaderState({
    categories,
    filters,
    keyword,
    searchHistory,
  });

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b border-border-subtle bg-background px-3 pt-1.5 pb-1.5 transition-transform duration-300 ease-out"
        )}
        style={{
          transform: isVisible
            ? "translateY(0)"
            : "translateY(calc(-100% - 8px))",
        }}
      >
        <div className="flex items-center gap-2">
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
              <MyLocationButton variant="header" fullLocation={fullLocation} />
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="searchbar-compact-trigger focus-ring-soft min-w-0 flex-1 gap-2 px-3"
          >
            <MagnifyingGlassIcon className="size-[18px] shrink-0 text-muted" />
            <span className="truncate text-left">{keyword || "상품 검색"}</span>
          </button>

          <div className="shrink-0">
            <NotificationBell userId={userId} initialCount={unreadCount} />
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <div className="shrink-0">
            <ProductCategoryDropdown
              categories={categories}
              compact
              tone="neutral"
            />
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="flex items-center rounded-xl border border-border-subtle bg-background px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted/90">
                {filterSummary}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilterParams}
                  aria-label="필터 초기화 (검색어 유지)"
                  className="focus-ring-soft ml-1.5 shrink-0 rounded-full p-0.5 text-muted transition-colors hover:bg-surface hover:text-primary"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <ClientFilterWrapper
              categories={categories}
              filters={filters}
              compact
              tone="neutral"
            />
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: isVisible
            ? `${Math.max(headerHeight, DEFAULT_MOBILE_HEADER_HEIGHT)}px`
            : "0px",
        }}
      >
        <div />
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        isMobile
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
