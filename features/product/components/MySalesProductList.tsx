/**
 * File Name : features/product/components/MySalesProductList.tsx
 * Description : 나의 판매 제품 리스트 컴포넌트 (탭별 지연 로드 + 공통 페이지네이션 훅)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.30  임도헌   Created
 * 2024.11.30  임도헌   Modified  나의 판매 제품 리스트 컴포넌트
 * 2024.12.03  임도헌   Modified  purchase_at을 purchased_at으로 변경
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.24  임도헌   Modified  다크모드 적용
 * 2025.10.17  임도헌   Modified  탭별 지연 로드 + useProductPagination(profile) 도입
 * 2025.10.19  임도헌   Modified  하이브리드 낙관적 이동 + 실패시 롤백/리프레시
 * 2025.11.04  임도헌   Modified  getInitialUserProducts(서버) 직접 호출 제거 → fetchInitialUserProductsClient(API 경유)로 교체
 * 2026.01.08  임도헌   Modified  탭 전환 시 fetch 에러(세션만료 등) 크래시 방지(try/catch) 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.16  임도헌   Modified  Empty State 개선
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.01  임도헌   Modified  상태 변경(Optimistic Move) 로직을 QueryClient.setQueryData로 리팩토링 및 로딩 상태 세분화
 * 2026.03.03  임도헌   Modified  initialProps 제거 및 탭 내부 컴포넌트(SalesTabContent) 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  탭/뷰 토글 active 상태와 다크모드 대비 정리
 * 2026.03.26  임도헌   Modified  초소형 모바일 폭에서 그리드 1열 적응을 추가해 제목 잘림을 완화
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 프로필 판매 목록 헤더와 빈 상태 타이포를 정리
 * 2026.04.17  임도헌   Modified  판매 탭 컨테이너의 Suspense 분리/낙관 이동/리뷰 반영 책임 설명 보강
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 탭 카운트 대비 보정 및 첫 카드 LCP 이미지 우선 로드
 * 2026.04.19  임도헌   Modified  판매 탭 active 대비와 라이트/다크 선택 상태를 현재 UI 기준으로 재정리
 * 2026.05.16  임도헌   Modified  판매 탭 캐시 이동 payload와 무한스크롤 캐시 shape 타입 정리
 * 2026.05.30  임도헌   Modified  판매 내역 뷰 토글을 제품 목록 토글 톤과 통일
 */

"use client";

import {
  useCallback,
  useRef,
  useState,
  Suspense,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { queryKeys } from "@/lib/queryKeys";
import MySalesProductItem from "@/features/product/components/MySalesProductItem";
import Skeleton from "@/components/ui/Skeleton";
import {
  ListBulletIcon,
  Squares2X2Icon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TYPES,
} from "@/features/product/constants";
import type {
  MySalesListItem,
  TabCounts,
  ProductStatus,
  ViewMode,
  UserProductsScope,
} from "@/features/product/types";
import { cn } from "@/lib/utils";
import type { ProductInfiniteCache } from "@/features/product/utils/productQueryCache";

interface MySalesProductListProps {
  userId: number;
  initialCounts: TabCounts;
}

type SalesScopeType = Extract<
  UserProductsScope["type"],
  "SELLING" | "RESERVED" | "SOLD"
>;

const PRODUCT_STATUS_SCOPE_TYPE: Record<ProductStatus, SalesScopeType> = {
  selling: "SELLING",
  reserved: "RESERVED",
  sold: "SOLD",
};

type SalesMovePayload = {
  from: ProductStatus;
  to: ProductStatus;
  product: MySalesListItem;
  modifiedProduct?: MySalesListItem;
};

type SalesMoveFailedPayload = Pick<SalesMovePayload, "from" | "to">;

type SalesTabContentProps = {
  type: ProductStatus;
  userId: number;
  viewMode: ViewMode;
  onOptimisticMove: (payload: SalesMovePayload) => () => void;
  onMoveFailed: (payload: SalesMoveFailedPayload) => Promise<void>;
};

/**
 * 나의 판매 제품 목록 탭 컨테이너 컴포넌트
 *
 * [기능]
 * - 판매 중/예약 중/판매 완료 탭과 리스트/그리드 뷰 상태를 상위에서 관리
 * - 하위 `SalesTabContent`를 탭별로 재마운트해 현재 선택된 범위만 `useProductPagination`을 활성화
 * - 상태 변경(예: 예약 -> 판매완료) 액션은 `onOptimisticMove`로 캐시 간 이동을 먼저 반영하고, 실패 시 무효화로 복원
 * - 탭 개수(counts)는 제품 목록과 분리해 즉시 갱신하고, 하단 Suspense로 선택된 탭만 로딩 UI를 노출
 */
export default function MySalesProductList({
  userId,
  initialCounts,
}: MySalesProductListProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProductStatus>("selling");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [counts, setCounts] = useState<TabCounts>(initialCounts);
  /**
   * 낙관적 상태 이동 (Optimistic Move) 핸들러
   * - 탭 간 아이템 이동 시, Query Cache를 직접 조작
   */
  const onOptimisticMove = useCallback(
    ({ from, to, product, modifiedProduct }: SalesMovePayload): (() => void) => {
      const fromKey = queryKeys.products.userScope(
        PRODUCT_STATUS_SCOPE_TYPE[from],
        userId
      );
      const toKey = queryKeys.products.userScope(
        PRODUCT_STATUS_SCOPE_TYPE[to],
        userId
      );

      const prevFromData =
        queryClient.getQueryData<ProductInfiniteCache<MySalesListItem>>(
          fromKey
        );
      const prevToData =
        queryClient.getQueryData<ProductInfiniteCache<MySalesListItem>>(toKey);
      const prevCounts = { ...counts };

      let nextProduct = modifiedProduct ?? product;
      if (!modifiedProduct && from === "reserved" && to === "sold") {
        nextProduct = {
          ...product,
          purchase_userId: product.reservation_userId ?? null,
          purchase_user: product.reservation_user
            ? { ...product.reservation_user }
            : null,
          purchased_at: new Date().toISOString(),
          reservation_userId: null,
          reservation_user: null,
          reservation_at: null,
        };
      }

      queryClient.setQueryData<ProductInfiniteCache<MySalesListItem>>(
        fromKey,
        (oldData) => {
          if (!oldData || !oldData.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.filter((item) => item.id !== product.id),
            })),
          };
        }
      );

      queryClient.setQueryData<ProductInfiniteCache<MySalesListItem>>(
        toKey,
        (oldData) => {
          if (!oldData || !oldData.pages || oldData.pages.length === 0)
            return oldData;
          const newPages = [...oldData.pages];
          const exists = newPages[0].products.some(
            (item) => item.id === nextProduct.id
          );
          if (!exists) {
            newPages[0] = {
              ...newPages[0],
              products: [nextProduct, ...newPages[0].products],
            };
          }
          return { ...oldData, pages: newPages };
        }
      );

      setCounts((c) => ({
        ...c,
        [from]: Math.max(0, c[from] - 1),
        [to]: c[to] + 1,
      }));

      return () => {
        queryClient.setQueryData(fromKey, prevFromData);
        queryClient.setQueryData(toKey, prevToData);
        setCounts(prevCounts);
      };
    },
    [queryClient, userId, counts]
  );

  const onMoveFailed = useCallback(
    async ({ from, to }: SalesMoveFailedPayload) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.userScope(
          PRODUCT_STATUS_SCOPE_TYPE[from],
          userId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.userScope(
          PRODUCT_STATUS_SCOPE_TYPE[to],
          userId
        ),
      });
    },
    [queryClient, userId]
  );

  return (
    <div className="flex flex-col px-page-x py-6">
      <div className="mb-6 flex rounded-xl border border-border bg-surface p-1 shadow-sm">
        {PRODUCT_STATUS_TYPES.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "group focus-ring-soft flex-1 min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-surface-dim text-primary shadow-sm dark:bg-background"
                : "text-muted hover:bg-background/70 hover:text-primary"
            )}
          >
            {PRODUCT_STATUS_LABEL[tab]}{" "}
            <span
              className={cn(
                "ml-0.5 text-xs transition-colors",
                activeTab === tab
                  ? "text-current opacity-80"
                  : "text-muted group-hover:text-primary"
              )}
            >
              ({counts[tab]})
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 mb-3">
        <div className="flex rounded-xl border border-border-subtle bg-surface p-1">
          <button
            onClick={() => setViewMode("list")}
            aria-label="리스트 보기"
            className={cn(
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
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
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
              viewMode === "grid"
                ? "bg-surface-dim text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                : "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* 선택 탭 전용 Suspense 경계 */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        }
      >
        <SalesTabContent
          key={activeTab} // 탭이 바뀔 때마다 컴포넌트를 새로 마운트
          type={activeTab}
          userId={userId}
          viewMode={viewMode}
          onOptimisticMove={onOptimisticMove}
          onMoveFailed={onMoveFailed}
        />
      </Suspense>
    </div>
  );
}

// ----------------------------------------------------------------------
// 내부 컴포넌트: 선택된 탭 전용 데이터 패칭 및 렌더링
// ----------------------------------------------------------------------

/**
 * 현재 활성 판매 탭 전용 콘텐츠
 *
 * - 상위 컨테이너가 넘긴 `type`만 기준으로 목록을 조회해 탭 간 훅 실행을 분리
 * - 무한 스크롤과 빈 상태, 아이템 단위 낙관 업데이트 연결을 한곳에서 처리
 */
function SalesTabContent({
  type,
  userId,
  viewMode,
  onOptimisticMove,
  onMoveFailed,
}: SalesTabContentProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 컴포넌트가 마운트된 해당 탭의 데이터만 패치
  const current = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: PRODUCT_STATUS_SCOPE_TYPE[type], userId },
  });

  const products = current.products;

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isFetchingNextPage,
    onLoadMore: current.loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 1000px 0px",
    threshold: 0.01,
  });

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-full bg-surface-dim mb-4">
          <TagIcon className="size-10 text-muted/50" />
        </div>
        <p className="text-lg font-medium leading-relaxed text-primary">
          {type === "selling"
            ? "판매 중인 제품이 없습니다"
            : type === "reserved"
              ? "예약 중인 제품이 없습니다"
              : "판매 완료한 제품이 없습니다"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid"
            ? "grid-cols-1 min-[360px]:grid-cols-2"
            : "grid-cols-1"
        )}
      >
        {products.map((product, index) => (
          <MySalesProductItem
            key={product.id}
            product={product}
            type={type}
            userId={userId}
            viewMode={viewMode}
            prioritizeImage={index === 0}
            onOptimisticMove={onOptimisticMove}
            onMoveFailed={onMoveFailed}
            // 리뷰 작성/수정 후 해당 카드만 같은 탭 캐시에서 즉시 갱신
            onReviewChanged={(patch) => current.updateOne(product.id, patch)}
          />
        ))}
      </div>
      <div className="py-6 flex justify-center min-h-[40px]">
        {current.hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {current.isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>불러오는 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}
