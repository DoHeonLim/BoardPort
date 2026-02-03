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
 */
"use client";

import { useOptimistic, useTransition } from "react";
import { dislikeProduct, likeProduct } from "@/features/product/actions/like";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IProductLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  productId: number;
}

/**
 * 좋아요 버튼 컴포넌트
 * - `useOptimistic`을 사용하여 즉각적인 UI 피드백을 제공합니다.
 * - `useTransition`으로 서버 액션 중복 호출을 방지합니다.
 * - 실패 시 자동으로 롤백되며 에러 토스트를 표시합니다.
 */
export default function ProductLikeButton({
  isLiked,
  likeCount,
  productId,
}: IProductLikeButtonProps) {
  // Optimistic UI State
  const [optimisticState, setOptimisticState] = useOptimistic(
    { isLiked, likeCount },
    (state, newIsLiked: boolean) => ({
      isLiked: newIsLiked,
      likeCount: newIsLiked ? state.likeCount + 1 : state.likeCount - 1,
    })
  );

  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const nextIsLiked = !optimisticState.isLiked;

    startTransition(async () => {
      // 1. Optimistic Update
      setOptimisticState(nextIsLiked);
      try {
        // 2. Server Action Call
        if (nextIsLiked) await likeProduct(productId);
        else await dislikeProduct(productId);
      } catch (error) {
        console.error(error);
        toast.error("좋아요 처리에 실패했습니다.");
        // 실패 시 React가 자동으로 state를 롤백함
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl transition-colors active:scale-95",
        "hover:bg-surface-dim disabled:opacity-50 disabled:cursor-not-allowed",
        optimisticState.isLiked
          ? "text-rose-500"
          : "text-muted hover:text-rose-500"
      )}
      disabled={isPending}
      aria-label={optimisticState.isLiked ? "좋아요 취소" : "좋아요"}
      aria-pressed={optimisticState.isLiked}
    >
      {optimisticState.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-xs font-medium mt-0.5">
        {optimisticState.likeCount}
      </span>
    </button>
  );
}
