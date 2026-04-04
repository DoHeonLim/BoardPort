/**
 * File Name : features/product/components/ProductList.tsx
 * Description : 제품 목록 컴포넌트 (무한 스크롤 및 TanStack Query 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 컴포넌트 추가
 * 2024.10.17  임도헌   Modified  무한 스크롤 기능 추가
 * 2024.12.12  임도헌   Modified  스타일 수정
 * 2024.12.17  임도헌   Modified  스타일 수정
 * 2024.12.24  임도헌   Modified  스타일 재 수정
 * 2025.04.29  임도헌   Modified  검색 결과가 변경될 때마다 제품 목록 업데이트 되도록 수정
 * 2025.04.30  임도헌   Modified  성능 최적화 및 사용자 경험 개선
 * 2025.05.06  임도헌   Modified  그리드/리스트 뷰 모드 추가
 * 2025.06.07  임도헌   Modified  nextCursor 기반 페이지네이션 적용 및 props 구조 변경
 * 2025.06.07  임도헌   Modified  무한 스크롤 훅 useInfiniteScroll 분리 적용
 * 2025.06.07  임도헌   Modified  ProductCard 기반으로 구조 정리
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.01  임도헌   Modified  useProductPagination 반환 타입 변경 대응 및 로딩 상태 세분화
 * 2026.03.03  임도헌   Modified  명령형 로딩(isLoading) 및 initialProducts Props 제거, 선언적 렌더링 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  뷰 토글 active 상태 및 다크모드 대비 보강
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드 간격을 조정해 카드 밀도를 더 촘촘하게 정리
 * 2026.03.06  임도헌   Modified  하단 무한스크롤 로딩 배지를 공통 유틸 클래스로 통일
 * 2026.03.11  임도헌   Modified  무한스크롤 중에도 서버 totalCount를 우선 표시해 "총 N개의 상품" 문구 정합성 보강
 * 2026.03.11  임도헌   Modified  키워드 알림 버튼을 리스트 헤더 row에 주입할 수 있도록 슬롯 추가
 * 2026.03.12  임도헌   Modified  총 상품 수, 키워드 알림 버튼, 뷰 토글을 같은 헤더 row로 통합
 * 2026.03.15  임도헌   Modified  빈 상태 시스템 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.25  임도헌   Modified  뷰 토글 박스의 외곽선/활성 상태를 차분하게 조정해 출시 직전 polish 반영
 */

"use client";

import { ReactNode, useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import ProductCard from "@/features/product/components/productCard";
import {
  ArchiveBoxIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import type {
  ProductSearchParams,
  ProductType,
  ViewMode,
} from "@/features/product/types";
import { cn } from "@/lib/utils";

type ProductListProps = {
  searchParams?: ProductSearchParams;
  queryKeyExtra?: unknown;
  headerAction?: ReactNode;
};

/**
 * 제품 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `useProductPagination` 커스텀 훅을 통해 검색 필터(`searchParams`) 기반 무한 스크롤 상태 전역 관리
 * - 검색 조건 변경 시 동적 Query Key를 통한 캐시 자동 분리 및 신규 데이터 패칭 유도
 * - `useInfiniteScroll` 및 `usePageVisibility` 훅을 연동한 뷰포트 기반 지연 로딩 최적화 적용
 * - 총 상품 수, 키워드 알림 버튼, 뷰 토글을 리스트 상단 헤더 row에서 함께 렌더링
 * - 뷰 모드(List ↔ Grid) 전환 상태 제어 및 `isFetchingNextPage` 플래그 활용 로딩 스피너 분리 표시
 */
export default function ProductList({
  searchParams,
  queryKeyExtra,
  headerAction,
}: ProductListProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 현재 탭이 사용자의 뷰포트에 표시 중인지 여부 (백그라운드 시 데이터 페칭 일시 중지용)
  const isVisible = usePageVisibility();

  // 커서 기반 페이지네이션 훅 (TanStack Query 연동)
  // initialProducts 없이 훅 호출. 데이터 로딩은 상위 Suspense가 보장
  const { products, totalCount, isFetchingNextPage, hasMore, loadMore } =
    useProductPagination<ProductType>({
      mode: "product",
      searchParams: searchParams || {},
      queryKeyExtra,
    });

  // 무한 스크롤 옵저버 연결
  useInfiniteScroll({
    triggerRef,
    hasMore,
    // 스크롤 시 중복 호출 방지를 위해 다음 페이지 로딩 중 여부를 전달함
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "1400px 0px 0px 0px", // 조기 프리패치 여유 마진
    threshold: 0.01,
  });

  const displayCount = totalCount ?? products.length;

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted">
            총 <span className="text-primary font-bold">{displayCount}</span>
            개의 상품
          </span>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
        <div className="flex rounded-xl border border-border-subtle bg-surface p-1">
          <button
            onClick={() => setViewMode("list")}
            aria-label="리스트 보기"
            className={cn(
              "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all",
              viewMode === "list"
                ? "bg-surface-dim text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                : "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            aria-label="그리드 보기"
            className={cn(
              "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all",
              viewMode === "grid"
                ? "bg-surface-dim text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                : "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <ArchiveBoxIcon className="mb-4 size-14 text-muted" />
          <p className="text-lg font-medium text-primary">
            등록된 상품이 없습니다
          </p>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3 sm:gap-4"
              : "grid grid-cols-1 gap-4"
          )}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              isPriority={index < 4}
            />
          ))}
        </div>
      )}

      <div className="py-8 min-h-[40px]">
        {hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {isFetchingNextPage && (
          <div className="list-loading-pill">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span className="whitespace-nowrap">더 불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}
