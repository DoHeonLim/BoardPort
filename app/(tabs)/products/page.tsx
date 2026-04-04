/**
 * File Name : app/(tabs)/products/page.tsx
 * Description : 제품 목록 및 검색 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 페이지 추가
 * 2024.10.17  임도헌   Modified  무한 스크롤 기능 추가
 * 2024.10.26  임도헌   Modified  데이터베이스 캐싱 기능 추가
 * 2024.11.06  임도헌   Modified  캐싱기능 주석 처리
 * 2024.12.05  임도헌   Modified  제품 초기화 기능 actions로 옮김
 * 2024.12.12  임도헌   Modified  제품 추가 링크 변경
 * 2024.12.16  임도헌   Modified  카테고리 얻기 기능 추가
 * 2024.12.16  임도헌   Modified  최근 검색 기록 얻기 기능 추가
 * 2024.12.16  임도헌   Modified  인기 검색 기록 얻기 기능 추가
 * 2024.12.27  임도헌   Modified  제품 페이지 다크모드 추가
 * 2025.04.29  임도헌   Modified  검색 기능 search/products에서 products로 통합
 * 2025.05.30  임도헌   Modified  add-product 페이지 products/add로 이동
 * 2025.06.07  임도헌   Modified  검색 결과 요약, 제품 목록, 제품 추가 버튼을 컴포넌트로 분리, 구조 개선
 * 2025.06.18  임도헌   Modified  ProductList에 쿼리 문자열을 기준으로 key를 부여해서 제품 재렌더링
 * 2025.07.30  임도헌   Modified  fetchProductCategories로 이름 변경
 * 2026.01.08  임도헌   Modified  URL 쿼리 파싱 시 NaN 방어 로직 추가 (minPrice, maxPrice)
 * 2026.01.10  임도헌   Modified  헤더를 sticky로 고정하여 스크롤 시에도 접근성 확보, 레이아웃 재정리
 * 2026.01.20  임도헌   Modified  formatSearchSummary 개선 적용 및 import 경로 수정
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 * 2026.02.04  임도헌   Modified  getCachedProducts만 사용하도록 수정(내부에서 알아서 필터함)
 * 2026.02.08  임도헌   Modified  헤더 우측에 알림 벨(NotificationBell) 추가
 * 2026.02.12  임도헌   Modified  검색 결과 있을 경우 KeywordAlertButton 추가
 * 2026.02.13  임도헌   Modified  generateMetadata 추가
 * 2026.02.15  임도헌   Modified  헤더에 RegionFilterToggle 및 MyLocationButton(HeaderVariant) 추가
 * 2026.02.15  임도헌   Modified  fullLocation 생성 및 UI 전달
 * 2026.02.21  임도헌   Modified  currentRange를 EmptyState 및 SearchSummary에 주입
 * 2026.02.21  임도헌   Modified  searchParams.region 레거시 제거 및 currentRange SSOT(DB) 고정
 * 2026.02.26  임도헌   Modified  검색 결과 및 알림 버튼 줄바꿈 (모바일 겹침 현상)
 * 2026.03.03  임도헌   Modified  서버 컴포넌트 하이드레이션(HydrationBoundary) 적용 및 Suspense 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.05  임도헌   Modified  ProductModalReopenRelay 주입(모달 편집후 복귀)
 * 2026.03.06  임도헌   Modified  Suspense fallback을 실제 제품 카드 스켈레톤 구조로 통일
 * 2026.03.09  임도헌   Modified  모바일 상단 검색/필터 영역 높이를 줄여 리스트 가시 영역 확보
 * 2026.03.09  임도헌   Modified  제품 목록 헤더를 단일 패널 구조로 재배치하고 다크모드 보더 노출을 완화
 * 2026.03.09  임도헌   Modified  모바일 전용 2줄 헤더와 스크롤 hide/reveal 동작 추가
 * 2026.03.10  임도헌   Modified  데스크톱 제품 헤더도 모바일과 동일한 정보 구조(지역/검색/알림, 분류/요약/필터)로 재구성
 * 2026.03.11  임도헌   Modified  무한스크롤 중에도 전체 검색 결과 수를 고정 표시할 수 있도록 서버 totalCount를 연결
 * 2026.03.11  임도헌   Modified  헤더 내 요약/필터와 중복되던 본문 상단 검색결과 요약 및 데스크톱 추가 필터 버튼 제거
 * 2026.03.11  임도헌   Modified  키워드 알림 버튼을 제품 목록 헤더 row(총 상품 수 옆)로 이동해 뷰 토글과 같은 행에 재배치
 * 2026.03.11  임도헌   Modified  더 이상 소비되지 않는 SearchProvider 래핑을 제거해 헤더 개편 이후 남은 제품 검색 레거시 정리
 * 2026.03.12  임도헌   Modified  카테고리/검색기록/인기검색어/알림/키워드 알림/지역 정보를 헤더 초기 상태용으로 병렬 preload
 * 2026.03.16  임도헌   Modified  모바일 목록 영역 pull-to-refresh 지원 추가
 */

import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import PullToRefresh from "@/components/global/PullToRefresh";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import AddProductButton from "@/features/product/components/AddProductButton";
import ProductDesktopHeader from "@/features/product/components/ProductDesktopHeader";
import ProductEmptyState from "@/features/product/components/ProductEmptyState";
import ProductMobileHeader from "@/features/product/components/ProductMobileHeader";
import ProductList from "@/features/product/components/ProductList";
import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";
import KeywordAlertButton from "@/features/notification/components/KeywordAlertButton";
import ProductModalReopenRelay from "@/features/product/components/ProductModalReopenRelay";
import { fetchProductCategories } from "@/features/product/service/category";
import {
  getUserSearchHistory,
  getPopularSearches,
} from "@/features/product/service/history";
import { getProductsAction } from "@/features/product/actions/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import { getMyKeywordAlerts } from "@/features/notification/service/keyword";
import { getUserLocation } from "@/features/user/service/profile";
import type { RegionRange } from "@/generated/prisma/enums";

interface ProductsPageProps {
  searchParams: {
    category?: string;
    keyword?: string;
    minPrice?: string;
    maxPrice?: string;
    game_type?: string;
    condition?: string;
  };
}

export const metadata: Metadata = {
  title: "항구 (제품 목록)",
  description: "다양한 보드게임과 TRPG 물품을 거래하세요.",
  openGraph: {
    title: "보드포트 항구",
    description: "보드게임 중고 거래의 중심, 보드포트 항구입니다.",
  },
};

function parseNumberParam(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * 제품 목록 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 카테고리, 검색 기록, 인기 검색어, 안 읽은 알림 수, 키워드 알림, 지역 정보를 병렬 로드하여 헤더 초기 상태 구성
 * - URL 검색 파라미터 기반 제품 목록 쿼리 및 유저 지역 설정(DB `User.regionRange`) 기반의 서버 프리패치(Prefetch) 적용
 * - 모바일/데스크톱 헤더를 분리 렌더링하여 동일한 검색 UX를 기기별 레이아웃에 맞게 제공
 * - HydrationBoundary를 이용한 초기 렌더링 시 클라이언트 캐시 하이드레이션 처리
 * - 데이터 존재 여부에 따른 `ProductList` 또는 `ProductEmptyState` 조건부 렌더링 및 키워드 알림 버튼 주입
 */
export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const session = await getSession();
  const userId = session?.id ?? null;

  if (!userId) {
    redirect("/login?callbackUrl=/products");
  }

  const queryClient = getQueryClient();
  const hasSearchParams = Object.keys(searchParams).length > 0;
  // 안전한 숫자 파싱 (가격 필터)
  const minPrice = parseNumberParam(searchParams.minPrice);
  const maxPrice = parseNumberParam(searchParams.maxPrice);

  const queryParams = {
    keyword: searchParams.keyword,
    category: searchParams.category,
    minPrice,
    maxPrice,
    game_type: searchParams.game_type,
    condition: searchParams.condition,
  };

  // 1. 데이터 병렬 로딩 (Service 직접 호출)
  const [
    categories,
    searchHistory,
    popularSearches,
    unreadCount,
    keywordAlerts,
    userLocation,
  ] = await Promise.all([
    fetchProductCategories(),
    getUserSearchHistory(userId),
    getPopularSearches(),
    getUnreadNotificationCount(),
    getMyKeywordAlerts(userId),
    getUserLocation(userId),
  ]);

  const userRegion1 = userLocation?.region1;
  const userRegion2 = userLocation?.region2;
  const userRegion3 = userLocation?.region3;

  // 유저가 위치 설정을 안 했다면(userRegion1이 null), 무조건 ALL(전국)로 간주합니다.
  const currentRange = userRegion1
    ? ((userLocation?.regionRange as RegionRange) ?? "GU")
    : "ALL";
  const productListQueryKey = {
    ...queryParams,
    __scope: currentRange,
  };

  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.list(productListQueryKey),
    queryFn: () => getProductsAction(null, queryParams),
    initialPageParam: null as number | null,
  });

  const fullLocation = userLocation
    ? [userLocation.region1, userLocation.region2, userLocation.region3]
        .filter(Boolean)
        .join(" ")
    : null;

  const currentSearchKeyword = searchParams.keyword?.trim().toLowerCase();
  // 키워드, 지역 범위(currentRange)까지 일치하는가?
  const matchedAlert = keywordAlerts.find(
    (a) =>
      a.keyword.toLowerCase() === currentSearchKeyword &&
      a.regionRange === currentRange
  );

  // prefetch한 데이터를 꺼내서 결과가 비어있는지 확인 (Empty State 분기용)
  const prefetchData = queryClient.getQueryData<any>(
    queryKeys.products.list(productListQueryKey)
  );
  const isDataEmpty = prefetchData?.pages[0]?.products.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <ProductModalReopenRelay />
      <div className="md:hidden">
        <ProductMobileHeader
          categories={categories}
          keyword={searchParams.keyword}
          searchHistory={searchHistory}
          popularSearches={popularSearches}
          filters={searchParams}
          userId={userId}
          unreadCount={unreadCount}
          userRegion1={userRegion1}
          userRegion2={userRegion2}
          userRegion3={userRegion3}
          currentRange={currentRange}
          fullLocation={fullLocation}
        />
      </div>

      <ProductDesktopHeader
        categories={categories}
        keyword={searchParams.keyword}
        searchHistory={searchHistory}
        popularSearches={popularSearches}
        filters={searchParams}
        userId={userId}
        unreadCount={unreadCount}
        userRegion1={userRegion1}
        userRegion2={userRegion2}
        userRegion3={userRegion3}
        currentRange={currentRange}
        fullLocation={fullLocation}
      />

      {/* Content Area */}
      <PullToRefresh className="flex-1">
        <div className="flex-1 px-page-x pt-1 pb-4 md:pt-2 md:pb-6">
          {/* 1. 제품 목록 섹션 */}
          {isDataEmpty ? (
            <ProductEmptyState
              hasSearchParams={hasSearchParams}
              keyword={searchParams.keyword}
              alertId={matchedAlert?.id}
              currentRange={currentRange}
            />
          ) : (
            <HydrationBoundary state={dehydrate(queryClient)}>
              <Suspense fallback={<ProductListSkeleton viewMode="list" />}>
                <ProductList
                  key={`${JSON.stringify(searchParams)}-${currentRange}`}
                  searchParams={queryParams}
                  queryKeyExtra={currentRange}
                  headerAction={
                    searchParams.keyword ? (
                      <KeywordAlertButton
                        keyword={searchParams.keyword}
                        alertId={matchedAlert?.id}
                        currentRange={currentRange}
                      />
                    ) : undefined
                  }
                />
              </Suspense>
            </HydrationBoundary>
          )}
        </div>
      </PullToRefresh>

      {/* 제품 추가 플로팅 버튼 (FAB) */}
      <AddProductButton />
    </div>
  );
}
