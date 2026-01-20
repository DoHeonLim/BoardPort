/**
 * File Name : app/(tabs)/products/page
 * Description : 제품 페이지
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
 */
import ProductList from "@/features/product/components/ProductList";
import SearchResultSummary from "@/features/product/components/SearchResultSummary";
import ProductEmptyState from "@/features/product/components/ProductEmptyState";
import AddProductButton from "@/features/product/components/AddProductButton";
import SearchSection from "@/features/search/components/SearchSection";
import ClientFilterWrapper from "@/features/search/components/ClientFilterWrapper";
import { SearchProvider } from "@/components/global/providers/SearchProvider";

import { formatSearchSummary } from "@/features/product/lib/formatSearchParams";
import { fetchProductCategories } from "@/lib/categories";
import { getCategoryName } from "@/lib/getCategoryName";
import { searchProducts } from "./actions/search";
import { getInitialProducts } from "./actions/init";
import { getPopularSearches, getUserSearchHistory } from "./actions/history";
import { GAME_TYPE_DISPLAY } from "@/lib/constants";

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

export default async function Products({ searchParams }: ProductsPageProps) {
  const hasSearchParams = Object.keys(searchParams).length > 0;

  // 안전한 숫자 파싱
  const minPrice = parseNumberParam(searchParams.minPrice);
  const maxPrice = parseNumberParam(searchParams.maxPrice);

  const [initialProducts, categories, searchHistory, popularSearches] =
    await Promise.all([
      hasSearchParams
        ? searchProducts({
            keyword: searchParams.keyword,
            category: searchParams.category,
            minPrice,
            maxPrice,
            game_type: searchParams.game_type,
            condition: searchParams.condition,
          })
        : getInitialProducts(),
      fetchProductCategories(),
      getUserSearchHistory(),
      getPopularSearches(),
    ]);

  const categoryName = searchParams.category
    ? getCategoryName(searchParams.category, categories)
    : "";

  const gameType = searchParams.game_type
    ? GAME_TYPE_DISPLAY[
        searchParams.game_type as keyof typeof GAME_TYPE_DISPLAY
      ]
    : undefined;

  const resultSearchParams = formatSearchSummary(
    categoryName,
    gameType,
    searchParams.keyword
  );

  return (
    // pb-24는 하단 탭바 + 플로팅 버튼 공간 확보용
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <SearchProvider searchParams={searchParams}>
        {/* [Sticky Header] 검색창과 필터가 스크롤 시에도 상단에 고정됨 */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
          <SearchSection
            categories={categories}
            keyword={searchParams.keyword}
            searchHistory={searchHistory}
            popularSearches={popularSearches}
            basePath="/products"
          />
        </header>

        {/* [Content Area] */}
        <div className="flex-1 px-page-x py-6">
          <div
            className={`flex items-center mb-4 ${
              hasSearchParams ? "justify-between" : "justify-end"
            }`}
          >
            {/* 검색 결과 요약 */}
            {hasSearchParams ? (
              <SearchResultSummary
                count={initialProducts.products.length}
                summaryText={resultSearchParams}
              />
            ) : (
              <></>
            )}

            {/* 필터 버튼 (Client Component) */}
            <ClientFilterWrapper
              categories={categories}
              filters={searchParams}
            />
          </div>

          {/* 제품 목록 */}
          {initialProducts.products.length > 0 ? (
            <ProductList
              // 검색 조건이 바뀌면 리스트를 완전히 새로 그림 (Scroll reset 등)
              key={JSON.stringify(searchParams)}
              initialProducts={initialProducts}
            />
          ) : (
            <ProductEmptyState hasSearchParams={hasSearchParams} />
          )}
        </div>
      </SearchProvider>

      {/* 제품 추가 플로팅 버튼 */}
      <AddProductButton />
    </div>
  );
}
