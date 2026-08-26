/**
 * File Name : features/product/components/ProductLikeButton.tsx
 * Description : 제품 좋아요 버튼 (Optimistic UI)
 * Author : 임도헌
 *
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.11  임도헌   Created
 * 2024.12.11  임도헌   Modified  제품 좋아요 버튼 컴포넌트 추가
 * 2025.06.08  임도헌   Modified  서버 데이터 props 기반으로 분리
 * 2026.01.08  임도헌   Modified  useOptimistic 적용하여 반응성 개선 (PostLikeButton과 UX 통일)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.03.01  임도헌   Modified  React useOptimistic 제거 및 TanStack Query useMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  좋아요 취소 시 '찜한 내역(LIKED)' 전역 캐시 즉시 제거 로직(Optimistic UI) 추가
 * 2026.03.06  임도헌   Modified  LIKED 캐시 갱신 predicate 범위 정교화(구조 일치 키만 타겟팅)
 * 2026.03.06  임도헌   Modified  products 목록 캐시(_count.product_likes) 낙관적 업데이트 및 롤백 추가
 * 2026.03.06  임도헌   Modified  좋아요 추가 시 LIKED 목록 첫 페이지 prepend 낙관적 반영 추가
 * 2026.03.26  임도헌   Modified  찜한 내역 카드 상단 빠른 해제를 위한 quick-remove variant 지원
 * 2026.03.26  임도헌   Modified  quick-remove 버튼의 모바일 라벨/톤을 줄여 제목 공간과 액션 위계를 보정
 * 2026.04.10  임도헌   Modified  products 타이포 정책에 맞춰 quick-remove 초소형 라벨을 text-xs/font-medium 기준으로 통일
 * 2026.05.16  임도헌   Modified  제품 목록/찜 목록 캐시 갱신 shape 타입 정리
 * 2026.05.18  임도헌   Modified  목록 카드 하트 색상 보정을 위해 낙관 업데이트에 isLiked 상태 반영
 * 2026.05.26  임도헌   Modified  initialData 기반 likeStatus query에 local queryFn을 부여해 refetch 경고 방지
 * 2026.06.17  임도헌   Modified  좋아요 낙관 반영 직전 목록/찜 목록 fetch 취소 및 pending opacity 제거
 * 2026.06.17  임도헌   Modified  계정 전환 시 이전 사용자의 좋아요 캐시가 재사용되지 않도록 viewer scope 추가
 * 2026.06.18  임도헌   Modified  다크모드에서 빠른 찜 해제 버튼의 중립 배경/경계 대비 보강
 * 2026.08.13  임도헌   Modified  낙관 업데이트/롤백/무효화를 현재 조회자 캐시로 제한
 * 2026.08.27  임도헌   Modified  목록·상세 재방문 시 새 서버 좋아요 상태를 기존 무기한 cache보다 우선하도록 동기화
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dislikeProduct, likeProduct } from "@/features/product/actions/like";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import {
  HeartIcon as OutlineHeartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import {
  isLikedScopeKey,
  isProductListKeyForViewer,
  pickProductFromLists,
} from "@/features/product/utils/productQueryCache";
import { cn } from "@/lib/utils";
import type { ProductInfiniteCache } from "@/features/product/utils/productQueryCache";
import { useServerSnapshotQuery } from "@/features/common/hooks/useServerSnapshotQuery";

interface ProductLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  productId: number;
  viewerId?: number | null;
  variant?: "stack" | "quick-remove";
  className?: string;
}

type ProductLikeCacheItem = {
  id: number;
  isLiked?: boolean;
  liked_at?: string;
  _count: {
    product_likes: number;
  };
};

/**
 * 제품 좋아요 버튼 컴포넌트
 *
 * [상태 주입 및 캐시 제어 로직]
 * - 부모가 전달한 최신 상태를 기존 상세 cache보다 우선한 뒤 QueryClient와 동기화
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 상태 반전 및 피드백 제공
 * - 목록 카드 하트 색상이 현재 사용자 좋아요 여부를 의미하도록 list cache의 `isLiked`를 함께 갱신
 * - 좋아요 취소 시 찜한 목록(`LIKED` scope) 쿼리 캐시에 접근하여 해당 아이템을 목록에서 즉각 제거 처리
 * - 진행 중인 목록/찜 목록 fetch가 낙관 업데이트를 덮어쓰지 않도록 변경 직전 관련 쿼리 취소
 * - 좋아요 상태 query key에 viewer scope를 포함해 계정 전환/재로그인 후 stale 상태 노출 방지
 * - API 요청 에러 발생 시 `onError`에서 캡처된 이전 상태 스냅샷(`previous`)으로 안전한 롤백(Rollback) 처리
 * - `onSettled` 시점에는 원격 queryFn이 있는 목록/찜 목록만 무효화해 로컬 상세 cache의 불필요한 재조회를 방지
 */
export default function ProductLikeButton({
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
  productId,
  viewerId = null,
  variant = "stack",
  className = "",
}: ProductLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.products.likeStatus(productId, viewerId);
  const initialLikeStatus = {
    isLiked: initialIsLiked,
    likeCount: initialLikeCount,
  };

  // 1. 새 서버 상태를 우선 반영한 뒤 mutation이 갱신하는 cache를 구독
  const data = useServerSnapshotQuery({
    queryKey,
    snapshot: initialLikeStatus,
  });

  // 2. 상태 변경 (Mutation)
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (data.isLiked) await dislikeProduct(productId);
      else await likeProduct(productId);
    },
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({
          predicate: (query) =>
            isProductListKeyForViewer(query.queryKey, viewerId),
        }),
        queryClient.cancelQueries({
          predicate: (query) =>
            isLikedScopeKey(query.queryKey, viewerId),
        }),
      ]);

      const previousLikeStatus = queryClient.getQueryData(queryKey);
      const listQueries = queryClient.getQueriesData({
        predicate: (query) =>
          isProductListKeyForViewer(query.queryKey, viewerId),
      });
      const likedQueries = queryClient.getQueriesData({
        predicate: (query) => isLikedScopeKey(query.queryKey, viewerId),
      });

      const nextLikeCount = data.isLiked
        ? Math.max(0, data.likeCount - 1)
        : data.likeCount + 1;
      const nextIsLiked = !data.isLiked;

      // 1) 상세 버튼 상태 즉시 반영
      queryClient.setQueryData(queryKey, {
        isLiked: nextIsLiked,
        likeCount: nextLikeCount,
      });

      // 2) /products 목록 캐시 즉시 반영: 좋아요 수와 하트 강조 기준(isLiked)을 같이 갱신
      queryClient.setQueriesData(
        {
          predicate: (query) =>
            isProductListKeyForViewer(query.queryKey, viewerId),
        },
        (oldData: ProductInfiniteCache<ProductLikeCacheItem> | undefined) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((product) =>
                product.id === productId
                  ? {
                      ...product,
                      isLiked: nextIsLiked,
                      _count: {
                        ...product._count,
                        product_likes: nextLikeCount,
                      },
                    }
                  : product
              ),
            })),
          };
        }
      );

      // 3) 좋아요 취소 시 LIKED 목록에서 즉시 제거
      if (data.isLiked) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              isLikedScopeKey(query.queryKey, viewerId),
          },
          (oldData: ProductInfiniteCache<{ id: number }> | undefined) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                products: page.products.filter(
                  (product) => product.id !== productId
                ),
              })),
            };
          }
        );
      }

      // 좋아요 추가: LIKED 첫 페이지에 즉시 prepend
      if (!data.isLiked) {
        const snapshot = pickProductFromLists<ProductLikeCacheItem>(
          listQueries,
          productId
        );
        if (snapshot) {
          queryClient.setQueriesData(
            {
              predicate: (query) =>
                isLikedScopeKey(query.queryKey, viewerId),
            },
            (oldData: ProductInfiniteCache<ProductLikeCacheItem> | undefined) => {
              if (!oldData?.pages?.length) return oldData;

              const alreadyExists = oldData.pages.some((page) =>
                page.products.some((product) => product.id === productId)
              );
              if (alreadyExists) return oldData;

              const firstPage = oldData.pages[0];
              return {
                ...oldData,
                pages: [
                  {
                    ...firstPage,
                    products: [
                      {
                        ...snapshot,
                        isLiked: true,
                        liked_at: new Date().toISOString(),
                      },
                      ...firstPage.products,
                    ],
                  },
                  ...oldData.pages.slice(1),
                ],
              };
            }
          );
        }
      }

      return { previousLikeStatus, listQueries, likedQueries };
    },
    onError: (err, _variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("좋아요 처리에 실패했습니다.");

      // 롤백: like status
      queryClient.setQueryData(queryKey, context?.previousLikeStatus);

      // 롤백: products lists
      context?.listQueries?.forEach(([k, v]: [readonly unknown[], unknown]) => {
        queryClient.setQueryData(k, v);
      });

      // 롤백: liked lists
      context?.likedQueries?.forEach(
        ([k, v]: [readonly unknown[], unknown]) => {
          queryClient.setQueryData(k, v);
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          isProductListKeyForViewer(query.queryKey, viewerId),
      });
      queryClient.invalidateQueries({
        predicate: (query) => isLikedScopeKey(query.queryKey, viewerId),
      });
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutate()}
      className={cn(
        variant === "quick-remove"
          ? [
              "inline-flex h-7 items-center justify-center gap-1 rounded-full border border-border-subtle bg-surface/92 px-2 text-muted shadow-sm transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform sm:h-8 sm:gap-1.5 sm:px-3",
              "dark:border-border-strong dark:bg-surface-dim dark:text-primary dark:shadow-[0_0_0_1px_rgba(148,163,184,0.08)]",
              "hover:-translate-y-0.5 hover:bg-surface-dim hover:text-primary active:scale-95",
              "dark:hover:border-border-strong dark:hover:bg-surface-hover dark:hover:text-primary",
              "focus-ring-soft",
              "disabled:cursor-not-allowed",
            ]
          : [
              "flex flex-col items-center justify-center p-2 rounded-xl transition-colors active:scale-95",
              "hover:bg-surface-dim disabled:cursor-not-allowed",
            ],
        variant === "quick-remove"
          ? "text-muted"
          : data.isLiked
            ? "text-rose-500"
            : "text-muted hover:text-rose-500",
        className
      )}
      disabled={isPending}
      aria-busy={isPending}
      aria-pressed={data.isLiked}
      aria-label={
        variant === "quick-remove"
          ? data.isLiked
            ? "찜 해제"
            : "찜하기"
          : data.isLiked
            ? `좋아요 취소 ${data.likeCount}`
            : `좋아요 ${data.likeCount}`
      }
    >
      {variant === "quick-remove" ? (
        <>
          {data.isLiked ? (
            <XMarkIcon className="size-3 shrink-0 sm:size-3.5" />
          ) : (
            <OutlineHeartIcon className="size-3 shrink-0 sm:size-3.5" />
          )}
          <span className="text-xs font-medium leading-none">
            {data.isLiked ? (
              <>
                <span className="sm:hidden">해제</span>
                <span className="hidden sm:inline">찜 해제</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">찜</span>
                <span className="hidden sm:inline">찜하기</span>
              </>
            )}
          </span>
        </>
      ) : data.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      {variant === "stack" && (
        <span className="text-xs font-medium mt-0.5">{data.likeCount}</span>
      )}
    </button>
  );
}
