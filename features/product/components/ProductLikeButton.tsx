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
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dislikeProduct, likeProduct } from "@/features/product/actions/like";
import { queryKeys } from "@/lib/queryKeys";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
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
 * - 부모로부터 주입된 초기값(`initialIsLiked`, `initialLikeCount`)을 `useQuery`의 `initialData`로 설정하여 하이드레이션 구성
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 상태 반전 제공
 * - API 에러 발생 시 `onError`에서 캡처된 이전 상태 스냅샷(`previous`)으로 롤백 처리
 * - `onSettled` 시점 쿼리 무효화를 통한 서버 데이터와의 최종 정합성 보장
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
      const previous = queryClient.getQueryData(queryKey);

      // 캐시 덮어쓰기 (Optimistic Update)
      queryClient.setQueryData(queryKey, {
        isLiked: !data.isLiked,
        likeCount: data.isLiked
          ? Math.max(0, data.likeCount - 1)
          : data.likeCount + 1,
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("좋아요 처리에 실패했습니다.");
      // 에러 발생 시 이전 상태 스냅샷으로 롤백
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      // 서버 데이터와 일치시키기 위해 백그라운드 리패치
      queryClient.invalidateQueries({ queryKey });
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
