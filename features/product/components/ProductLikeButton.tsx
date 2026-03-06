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
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dislikeProduct, likeProduct } from "@/features/product/actions/like";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import {
  isLikedScopeKey,
  pickProductFromLists,
} from "@/features/product/utils/productQueryCache";
import { cn } from "@/lib/utils";

interface ProductLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  productId: number;
}

/**
 * 제품 좋아요 버튼 컴포넌트
 *
 * [상태 주입 및 캐시 제어 로직]
 * - 부모로부터 주입된 초기값(`initialIsLiked`, `initialLikeCount`)을 `useQuery`의 `initialData`로 설정하여 서버 상태 동기화(Hydration) 구성
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 상태 반전 및 피드백 제공
 * - 좋아요 취소 시 찜한 목록(`LIKED` scope) 쿼리 캐시에 접근하여 해당 아이템을 목록에서 즉각 제거 처리
 * - API 요청 에러 발생 시 `onError`에서 캡처된 이전 상태 스냅샷(`previous`)으로 안전한 롤백(Rollback) 처리
 * - `onSettled` 시점 관련 쿼리 무효화(invalidateQueries)를 통한 서버 데이터와의 최종 정합성 보장
 */
export default function ProductLikeButton({
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
  productId,
}: ProductLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.products.likeStatus(productId);

  // 1. 상태 조회 및 하이드레이션
  const { data } = useQuery({
    queryKey,
    initialData: { isLiked: initialIsLiked, likeCount: initialLikeCount },
    staleTime: Infinity,
  });

  // 2. 상태 변경 (Mutation)
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (data.isLiked) await dislikeProduct(productId);
      else await likeProduct(productId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousLikeStatus = queryClient.getQueryData(queryKey);
      const listQueries = queryClient.getQueriesData({
        queryKey: queryKeys.products.lists(),
      });
      const likedQueries = queryClient.getQueriesData({
        predicate: (query) => isLikedScopeKey(query.queryKey),
      });

      const nextLikeCount = data.isLiked
        ? Math.max(0, data.likeCount - 1)
        : data.likeCount + 1;

      // 1) 상세 버튼 상태 즉시 반영
      queryClient.setQueryData(queryKey, {
        isLiked: !data.isLiked,
        likeCount: nextLikeCount,
      });

      // 2) /products 목록 캐시 즉시 반영 (_count.product_likes)
      queryClient.setQueriesData(
        { queryKey: queryKeys.products.lists() },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              products: page.products.map((p: any) =>
                p.id === productId
                  ? {
                      ...p,
                      _count: {
                        ...p._count,
                        product_likes: nextLikeCount,
                      },
                    }
                  : p
              ),
            })),
          };
        }
      );

      // 3) 좋아요 취소 시 LIKED 목록에서 즉시 제거
      if (data.isLiked) {
        queryClient.setQueriesData(
          { predicate: (query) => isLikedScopeKey(query.queryKey) },
          (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                products: page.products.filter((p: any) => p.id !== productId),
              })),
            };
          }
        );
      }

      // 좋아요 추가: LIKED 첫 페이지에 즉시 prepend
      if (!data.isLiked) {
        const snapshot = pickProductFromLists(
          listQueries,
          productId
        );
        if (snapshot) {
          queryClient.setQueriesData(
            { predicate: (query) => isLikedScopeKey(query.queryKey) },
            (oldData: any) => {
              if (!oldData?.pages?.length) return oldData;

              const alreadyExists = oldData.pages.some((page: any) =>
                page.products.some((p: any) => p.id === productId)
              );
              if (alreadyExists) return oldData;

              const firstPage = oldData.pages[0];
              return {
                ...oldData,
                pages: [
                  {
                    ...firstPage,
                    products: [snapshot, ...firstPage.products],
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
    onError: (err, variables, context) => {
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
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({
        predicate: (query) => isLikedScopeKey(query.queryKey),
      });
    },
  });

  return (
    <button
      onClick={() => mutate()}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-colors active:scale-95",
        "hover:bg-surface-dim disabled:opacity-50 disabled:cursor-not-allowed",
        data.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500"
      )}
      disabled={isPending}
      aria-label={data.isLiked ? "좋아요 취소" : "좋아요"}
    >
      {data.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-xs font-medium mt-0.5">{data.likeCount}</span>
    </button>
  );
}
