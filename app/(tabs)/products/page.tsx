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
 */

import getSession from "@/lib/session";
import { fetchProductCategories } from "@/features/product/service/category";
import { getCategoryName } from "@/lib/getCategoryName";
import { SearchProvider } from "@/components/global/providers/SearchProvider";
import AddProductButton from "@/features/product/components/AddProductButton";
import ProductEmptyState from "@/features/product/components/ProductEmptyState";
import ProductList from "@/features/product/components/ProductList";
import SearchResultSummary from "@/features/product/components/SearchResultSummary";
import ClientFilterWrapper from "@/features/search/components/ClientFilterWrapper";
import SearchSection from "@/features/search/components/SearchSection";
import { formatSearchSummary } from "@/features/product/utils/format";
import {
  getUserSearchHistory,
  getPopularSearches,
} from "@/features/product/service/history";
import {
  getCachedProducts,
  getProducts,
} from "@/features/product/service/list";

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

function parseNumberParam(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * 제품 목록 페이지
 *
 * [기능]
 * 1. 검색 조건(쿼리 파라미터)에 따라 제품 목록을 조회합니다.
 *    - 초기 로딩(필터 없음): 캐시된 데이터 사용 (`getCachedProducts`)
 *    - 검색/필터 적용: 실시간 데이터 조회 (`getProducts`)
 * 2. 카테고리, 검색 기록, 인기 검색어 데이터를 병렬로 로드합니다.
 * 3. 검색바(SearchSection)와 필터(ClientFilterWrapper)를 제공합니다.
 * 4. 결과 목록(ProductList) 또는 빈 상태(ProductEmptyState)를 렌더링합니다.
 */
export default async function Products({ searchParams }: ProductsPageProps) {
  const session = await getSession();
  const userId = session?.id ?? null;

  const hasSearchParams = Object.keys(searchParams).length > 0;

  // 안전한 숫자 파싱 (가격 필터)
  const minPrice = parseNumberParam(searchParams.minPrice);
  const maxPrice = parseNumberParam(searchParams.maxPrice);

  // 1. 데이터 병렬 로딩 (Service 직접 호출)
  const [initialProducts, categories, searchHistory, popularSearches] =
    await Promise.all([
      hasSearchParams
        ? getProducts({
            keyword: searchParams.keyword,
            category: searchParams.category,
            minPrice,
            maxPrice,
            game_type: searchParams.game_type,
            condition: searchParams.condition,
          })
        : getCachedProducts({}), // 초기 로딩 최적화 (Cache)
      fetchProductCategories(),
      userId ? getUserSearchHistory(userId) : Promise.resolve([]),
      getPopularSearches(),
    ]);

  // 검색 요약 텍스트 생성
  const categoryName = searchParams.category
    ? getCategoryName(searchParams.category, categories)
    : "";

  const resultSearchParams = formatSearchSummary(
    categoryName,
    searchParams.game_type,
    searchParams.keyword
  );

  return (
    // pb-24: 하단 탭바 + FAB 공간 확보
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <SearchProvider searchParams={searchParams}>
        {/* Sticky Header: 검색창 및 필터 */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
          <SearchSection
            categories={categories}
            keyword={searchParams.keyword}
            searchHistory={searchHistory}
            popularSearches={popularSearches}
            basePath="/products"
          />
        </header>

        {/* Content Area */}
        <div className="flex-1 px-page-x py-6">
          <div
            className={`flex items-center mb-4 ${
              hasSearchParams ? "justify-between" : "justify-end"
            }`}
          >
            {/* 검색 결과 요약 (조건이 있을 때만 표시) */}
            {hasSearchParams && (
              <SearchResultSummary
                count={initialProducts.products.length}
                summaryText={resultSearchParams}
              />
            )}

            {/* 필터 버튼 (Client Component) */}
            <ClientFilterWrapper
              categories={categories}
              filters={searchParams}
            />
          </div>

          {/* 제품 목록 렌더링 */}
          {initialProducts.products.length > 0 ? (
            <ProductList
              // 검색 조건 변경 시 스크롤/상태 초기화를 위해 key 부여
              key={JSON.stringify(searchParams)}
              initialProducts={initialProducts}
            />
          ) : (
            <ProductEmptyState hasSearchParams={hasSearchParams} />
          )}
        </div>
      </SearchProvider>

      {/* 제품 추가 플로팅 버튼 (FAB) */}
      <AddProductButton />
    </div>
  );
}
