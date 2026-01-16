/**
 * File Name : components/product/MySalesProductList
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
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MySalesProductItem from "./MySalesProductItem";
import { useInfiniteScroll } from "@/hooks/common/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/common/usePageVisibility";
import { useProductPagination } from "@/hooks/product/useProductPagination";
import type { MySalesListItem, Paginated, TabCounts } from "@/types/product";
import { fetchInitialUserProductsClient } from "@/lib/product/fetchInitialUserProducts.client";
import { cn } from "@/lib/utils";
import {
  ListBulletIcon,
  Squares2X2Icon,
  TagIcon,
} from "@heroicons/react/24/outline";

type Tab = "selling" | "reserved" | "sold";

interface MySalesProductListProps {
  userId: number;
  initialSelling: Paginated<MySalesListItem>;
  initialCounts: TabCounts;
}

export default function MySalesProductList({
  userId,
  initialSelling,
  initialCounts,
}: MySalesProductListProps) {
  const [activeTab, setActiveTab] = useState<Tab>("selling");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [counts, setCounts] = useState<TabCounts>(initialCounts);

  const selling = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "SELLING", userId },
    initialProducts: initialSelling.products,
    initialCursor: initialSelling.nextCursor,
  });

  const reserved = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "RESERVED", userId },
    initialProducts: [],
    initialCursor: null,
  });
  const sold = useProductPagination<MySalesListItem>({
    mode: "profile",
    scope: { type: "SOLD", userId },
    initialProducts: [],
    initialCursor: null,
  });

  const [reservedLoaded, setReservedLoaded] = useState(false);
  const [soldLoaded, setSoldLoaded] = useState(false);

  const refreshTab = useCallback(
    async (tab: Tab) => {
      if (tab === "selling") {
        const data = await fetchInitialUserProductsClient<MySalesListItem>({
          type: "SELLING",
          userId,
        });
        selling.reset({ products: data.products, cursor: data.nextCursor });
      } else if (tab === "reserved") {
        const data = await fetchInitialUserProductsClient<MySalesListItem>({
          type: "RESERVED",
          userId,
        });
        reserved.reset({ products: data.products, cursor: data.nextCursor });
        setReservedLoaded(true);
      } else {
        const data = await fetchInitialUserProductsClient<MySalesListItem>({
          type: "SOLD",
          userId,
        });
        sold.reset({ products: data.products, cursor: data.nextCursor });
        setSoldLoaded(true);
      }
    },
    [userId, selling, reserved, sold]
  );

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

  // modifiedProduct 파라미터 추가
  const onOptimisticMove = useCallback(
    ({
      from,
      to,
      product,
      modifiedProduct,
    }: {
      from: Tab;
      to: Tab;
      product: MySalesListItem;
      modifiedProduct?: MySalesListItem;
    }): (() => void) => {
      const snap = {
        selling: { products: selling.products, cursor: selling.cursor },
        reserved: { products: reserved.products, cursor: reserved.cursor },
        sold: { products: sold.products, cursor: sold.cursor },
        counts,
      };

      let nextProduct = modifiedProduct ?? product;

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

      const fromList = lists[from].filter((p) => p.id !== product.id);
      const toList = [
        nextProduct,
        ...lists[to].filter((p) => p.id !== product.id),
      ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

      const resetByTab = (
        tab: Tab,
        nextProducts: MySalesListItem[],
        keepCursor: number | null
      ) => {
        const target =
          tab === "selling" ? selling : tab === "reserved" ? reserved : sold;
        target.reset({ products: nextProducts, cursor: keepCursor });
      };

      resetByTab(
        from,
        fromList,
        (from === "selling"
          ? snap.selling
          : from === "reserved"
            ? snap.reserved
            : snap.sold
        ).cursor
      );
      resetByTab(
        to,
        toList,
        (to === "selling"
          ? snap.selling
          : to === "reserved"
            ? snap.reserved
            : snap.sold
        ).cursor
      );

      setCounts((c) => ({
        ...c,
        [from]: Math.max(0, c[from] - 1),
        [to]: c[to] + 1,
      }));

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
    async ({ from, to }: { from: Tab; to: Tab }) => {
      await Promise.all([refreshTab(from), refreshTab(to)]);
    },
    [refreshTab]
  );

  const current =
    activeTab === "selling"
      ? selling
      : activeTab === "reserved"
        ? reserved
        : sold;
  const currentProducts = current.products as MySalesListItem[];

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
        {(["selling", "reserved", "sold"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labelMap = {
            selling: "판매중",
            reserved: "예약중",
            sold: "판매완료",
          };
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
              {labelMap[tab]}{" "}
              <span className="text-xs opacity-70 ml-0.5">({count})</span>
            </button>
          );
        })}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end gap-2 mb-3">
        {/* ... (View toggle buttons code remains same) ... */}
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
