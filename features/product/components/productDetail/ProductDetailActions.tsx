/**
 * File Name : features/product/components/productDetail/ProductDetailActions.tsx
 * Description : 하단 고정 액션바 (좋아요, 채팅/UP)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   좋아요 및 채팅 인터랙션 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용 (bg-surface-dim, border-border)
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.05  임도헌   Modified  bumpCount prop 추가 및 횟수 제한 UI 적용
 * 2026.03.19  임도헌   Modified  하단 액션바의 반투명/블러 톤을 줄이고 solid 패널 기준으로 정리
 * 2026.03.25  임도헌   Modified  모바일 하단 액션바 높이/그림자 밀도를 줄이고 owner 액션 비중을 재조정
 * 2026.04.06  임도헌   Modified  수정/삭제를 상단 owner 메뉴로 이동하고 하단 액션바는 UP 중심으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 상세 액션바 타이포 무게를 정리
 * 2026.04.20  임도헌   Modified  owner용 UP 버튼 포커스가 배경에 묻히지 않도록 inset 강조 기준으로 조정
 * 2026.06.17  임도헌   Modified  좋아요 상태 캐시 분리를 위해 viewerId 전달
 */
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import ProductLikeButton from "@/features/product/components/ProductLikeButton";
import ChatButton from "@/features/chat/components/ChatButton";
import { MAX_BUMP_COUNT } from "@/features/product/constants";
import { bumpProductAction } from "@/features/product/actions/bump";
import { ArrowUpIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ProductDetailActionsProps {
  productId: number;
  isLiked: boolean;
  likeCount: number;
  isOwner: boolean;
  viewerId?: number | null;
  bumpCount?: number;
}

/**
 * 화면 하단에 고정되는 액션 버튼 영역
 * - 공통: 좋아요 버튼 유지
 * - 소유자: 끌어올리기 버튼 표시
 * - 방문자: 채팅하기 버튼 표시
 */
export default function ProductDetailActions({
  productId,
  isLiked,
  likeCount,
  isOwner,
  viewerId = null,
  bumpCount = 0,
}: ProductDetailActionsProps) {
  const [isPending, startTransition] = useTransition();
  const isBumpMaxed = bumpCount >= MAX_BUMP_COUNT;

  const handleBump = () => {
    startTransition(async () => {
      const res = await bumpProductAction(productId);
      if (res.success) {
        toast.success("게시글을 끌어올렸습니다! 목록 상단에 노출됩니다.");
      } else {
        toast.error(res.error ?? "끌어올리기에 실패했습니다.");
      }
    });
  };

  return (
    <div
      className={cn(
        "w-full border-t border-border-subtle bg-surface",
        "px-4 py-2.5 sm:py-3",
        "pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        "shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.16)]"
      )}
    >
      <div className="mx-auto flex max-w-mobile items-center justify-between gap-3 sm:gap-4">
        <div className="shrink-0">
          <ProductLikeButton
            productId={productId}
            isLiked={isLiked}
            likeCount={likeCount}
            viewerId={viewerId}
          />
        </div>

        <div className="flex h-11 flex-1 gap-2 sm:h-12 sm:gap-3">
          {isOwner ? (
            <button
              onClick={handleBump}
              disabled={isPending || isBumpMaxed}
              className={cn(
                "w-full",
                "focus-ring-strong-inset flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-[background-color,color,border-color,box-shadow] sm:rounded-xl",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isBumpMaxed
                  ? "bg-surface-dim text-muted border-transparent"
                  : "border-brand/25 bg-brand/8 text-brand hover:bg-brand/12 dark:border-brand-light/30 dark:bg-brand-light/14 dark:text-brand-light dark:hover:bg-brand-light/18 active:scale-[0.98]"
              )}
            >
              {isPending ? (
                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
              <span>{isBumpMaxed ? "UP 마감" : "UP"}</span>
              <span className="text-xs font-normal opacity-80">
                ({bumpCount}/{MAX_BUMP_COUNT})
              </span>
            </button>
          ) : (
            <div className="w-full">
              <ChatButton
                productId={productId}
                className="h-11 rounded-lg text-sm shadow-none sm:h-12 sm:rounded-xl sm:text-base sm:shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
