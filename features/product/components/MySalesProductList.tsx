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
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { fetchUserProductsAction } from "@/features/user/actions/product";
import MySalesProductItem from "@/features/product/components/MySalesProductItem";
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
  Paginated,
  TabCounts,
  ProductStatus,
  ViewMode,
} from "@/features/product/types";
import { cn } from "@/lib/utils";

interface MySalesProductListProps {
  userId: number;
  initialSelling: Paginated<MySalesListItem>;
  initialCounts: TabCounts;
}

/**
 * 내 판매 목록 리스트 컴포넌트
 *
 * [기능]
 * 1. 판매중/예약중/판매완료 3개의 탭으로 구분하여 상품을 보여줌
 * 2. `useProductPagination` 훅을 각 탭별로 독립적으로 사용하여 상태를 관리
 * 3. 상태 변경(예: 판매중 -> 예약중) 시 `onOptimisticMove`를 통해 즉시 UI를 반영
 * 4. 탭 전환 시 필요한 데이터를 서버 액션(`fetchUserProductsAction`)으로 지연 로딩
 */
export default function MySalesProductList({
  userId,
  initialSelling,
  initialCounts,
}: MySalesProductListProps) {
  // --- State ---
  const [activeTab, setActiveTab] = useState<ProductStatus>("selling");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [counts, setCounts] = useState<TabCounts>(initialCounts);

  // --- Pagination Hooks (각 탭별 독립 관리) ---

  // 1. 판매 중 (초기 데이터 있음)
  const selling = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "SELLING", userId },
    initialProducts: initialSelling.products,
    initialCursor: initialSelling.nextCursor,
  });

  // 2. 예약 중 (초기엔 빈 상태, 탭 클릭 시 로드)
  const reserved = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "RESERVED", userId },
    initialProducts: [],
    initialCursor: null,
  });

  // 3. 판매 완료 (초기엔 빈 상태, 탭 클릭 시 로드)
  const sold = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "SOLD", userId },
    initialProducts: [],
    initialCursor: null,
  });

  // 데이터 로드 여부 플래그 (중복 로딩 방지)
  const [reservedLoaded, setReservedLoaded] = useState(false);
  const [soldLoaded, setSoldLoaded] = useState(false);

  // --- Methods ---

  /**
   * 탭 데이터를 서버에서 새로고침
   * 상태 변경 후 데이터 정합성을 맞추거나, 처음 탭을 열 때 사용
   */
  const refreshTab = useCallback(
    async (tab: ProductStatus) => {
      if (tab === "selling") {
        const data = await fetchUserProductsAction<MySalesListItem>({
          type: "SELLING",
          userId,
        });
        selling.reset({ products: data.products, cursor: data.nextCursor });
      } else if (tab === "reserved") {
        const data = await fetchUserProductsAction<MySalesListItem>({
          type: "RESERVED",
          userId,
        });
        reserved.reset({ products: data.products, cursor: data.nextCursor });
        setReservedLoaded(true);
      } else {
        const data = await fetchUserProductsAction<MySalesListItem>({
          type: "SOLD",
          userId,
        });
        sold.reset({ products: data.products, cursor: data.nextCursor });
        setSoldLoaded(true);
      }
    },
    [userId, selling, reserved, sold]
  );

  // 탭 전환 시 데이터 로딩 (Lazy Load)
  useEffect(() => {
    let mounted = true;
    const loadTab = async () => {
      try {
        if (activeTab === "reserved" && !reservedLoaded) {
          await refreshTab("reserved");
        }
        if (activeTab === "sold" && !soldLoaded) {
          await refreshTab("sold");
        }
      } catch (e) {
        console.warn(
          `[MySalesProductList] Failed to load ${activeTab} tab:`,
          e
        );
      }
    };
    if (mounted) loadTab();
    return () => {
      mounted = false;
    };
  }, [activeTab, reservedLoaded, soldLoaded, refreshTab]);

  /**
   * Optimistic UI Update 핸들러
   * - 하위 아이템에서 상태 변경 요청이 오면, 현재 탭에서 제거하고 대상 탭으로 이동
   * - 실패 시 롤백할 수 있는 함수를 반환
   */
  const onOptimisticMove = useCallback(
    ({
      from,
      to,
      product,
      modifiedProduct,
    }: {
      from: ProductStatus;
      to: ProductStatus;
      product: MySalesListItem;
      modifiedProduct?: MySalesListItem;
    }): (() => void) => {
      // 1. 현재 상태 스냅샷 저장 (롤백용)
      const snap = {
        selling: { products: selling.products, cursor: selling.cursor },
        reserved: { products: reserved.products, cursor: reserved.cursor },
        sold: { products: sold.products, cursor: sold.cursor },
        counts,
      };

      // 2. 이동할 제품 객체 준비
      let nextProduct = modifiedProduct ?? product;

      // 예약 -> 판매완료 시 일부 필드 자동 보정 (예약자를 구매자로 승격 등)
      if (!modifiedProduct && from === "reserved" && to === "sold") {
        nextProduct = {
          ...product,
          purchase_userId: product.reservation_userId ?? null,
          purchase_user: product.reservation_user
            ? {
                username: product.reservation_user.username,
                avatar: product.reservation_user.avatar ?? null,
              }
            : null,
          purchased_at: new Date().toISOString(),
          reservation_userId: null,
          reservation_user: null,
          reservation_at: null,
        } as MySalesListItem;
      }

      const lists = {
        selling: selling.products,
        reserved: reserved.products,
        sold: sold.products,
      };

      // 3. 리스트 조작 (제거 및 추가)
      const fromList = lists[from].filter((p) => p.id !== product.id);
      const toList = [
        nextProduct,
        ...lists[to].filter((p) => p.id !== product.id),
      ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i); // 중복 방지

      // 4. 각 훅의 상태 업데이트
      const resetByTab = (
        tab: ProductStatus,
        nextProducts: MySalesListItem[],
        keepCursor: number | null
      ) => {
        const target =
          tab === "selling" ? selling : tab === "reserved" ? reserved : sold;
        target.reset({ products: nextProducts, cursor: keepCursor });
      };

      resetByTab(from, fromList, snap[from].cursor);
      resetByTab(to, toList, snap[to].cursor);

      // 5. 카운트 업데이트
      setCounts((c) => ({
        ...c,
        [from]: Math.max(0, c[from] - 1),
        [to]: c[to] + 1,
      }));

      // 6. 롤백 함수 반환
      return () => {
        selling.reset(snap.selling);
        reserved.reset(snap.reserved);
        sold.reset(snap.sold);
        setCounts(snap.counts);
      };
    },
    [selling, reserved, sold, counts]
  );

  const onMoveFailed = useCallback(
    async ({ from, to }: { from: ProductStatus; to: ProductStatus }) => {
      // 실패 시 양쪽 탭 모두 새로고침하여 정합성 맞춤
      await Promise.all([refreshTab(from), refreshTab(to)]);
    },
    [refreshTab]
  );

  // 현재 활성 탭의 데이터 및 훅 선택
  const current =
    activeTab === "selling"
      ? selling
      : activeTab === "reserved"
        ? reserved
        : sold;
  const currentProducts = current.products as MySalesListItem[];

  // 리뷰 변경 등 부분 업데이트 처리
  const applyPatchToCurrent = (id: number, patch: Partial<MySalesListItem>) => {
    if (activeTab === "selling") selling.updateOne(id, patch);
    else if (activeTab === "reserved") reserved.updateOne(id, patch);
    else sold.updateOne(id, patch);
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isLoading,
    onLoadMore: current.loadMore,
    enabled: isVisible,
    rootMargin: "1000px 0px 0px 0px",
    threshold: 0.01,
  });

  return (
    <div className="flex flex-col px-page-x py-6">
      {/* Tabs */}
      <div className="flex p-1 mb-6 bg-surface-dim rounded-xl border border-border">
        {PRODUCT_STATUS_TYPES.map((tab) => {
          const isActive = activeTab === tab;
          const count = counts[tab];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                isActive
                  ? "bg-surface text-brand shadow-sm"
                  : "text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              {PRODUCT_STATUS_LABEL[tab]}{" "}
              <span className="text-xs opacity-70 ml-0.5">({count})</span>
            </button>
          );
        })}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end gap-2 mb-3">
        <div className="flex p-1 bg-surface-dim rounded-lg border border-border">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {currentProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="p-4 rounded-full bg-surface-dim mb-4">
              <TagIcon className="size-10 text-muted/50" />
            </div>
            <p className="text-lg font-medium text-primary">
              {activeTab === "selling"
                ? "판매 중인 제품이 없습니다"
                : activeTab === "reserved"
                  ? "예약 중인 제품이 없습니다"
                  : "판매 완료한 제품이 없습니다"}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {currentProducts.map((product) => (
              <MySalesProductItem
                key={product.id}
                product={product}
                type={activeTab}
                userId={userId}
                onOptimisticMove={onOptimisticMove}
                onMoveFailed={onMoveFailed}
                onReviewChanged={(patch) =>
                  applyPatchToCurrent(product.id, patch)
                }
              />
            ))}
          </div>
        )}

        {/* Trigger */}
        <div className="py-6 flex justify-center min-h-[40px]">
          {current.hasMore && (
            <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
          )}
          {current.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              <span>불러오는 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
