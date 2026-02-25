/**
 * File Name : features/product/components/productDetail/ProductDetailActions.tsx
 * Description : 하단 고정 액션바 (좋아요, 채팅/수정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   좋아요 및 채팅 인터랙션 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용 (bg-surface-dim, border-border)
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.05  임도헌   Modified  bumpCount prop 추가 및 횟수 제한 UI 적용
 */
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import ProductLikeButton from "@/features/product/components/ProductLikeButton";
import ChatButton from "@/features/chat/components/ChatButton";
import { MAX_BUMP_COUNT } from "@/features/product/constants";
import { bumpProductAction } from "@/features/product/actions/bump";
import { ArrowUpIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ProductDetailActionsProps {
  productId: number;
  isLiked: boolean;
  likeCount: number;
  isOwner: boolean;
  bumpCount?: number;
}

/**
 * 화면 하단에 고정되는 액션 버튼 영역
 * - 소유자: 수정 버튼 표시
 * - 방문자: 좋아요 버튼 + 채팅하기 버튼 표시
 */
export default function ProductDetailActions({
  productId,
  isLiked,
  likeCount,
  isOwner,
  bumpCount = 0,
}: ProductDetailActionsProps) {
  const [isPending, startTransition] = useTransition(); // 추가

  const isBumpMaxed = bumpCount >= MAX_BUMP_COUNT;

  // 끌어올리기 핸들러
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
        "w-full bg-surface/90 backdrop-blur-lg border-t border-border",
        // 아이폰 하단 홈 바 여백을 고려하되 기본 패딩도 예쁘게 보장
        "px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        // 모달에서 뜰 때 하단 그림자가 위로 자연스럽게 퍼지도록
        "shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
      )}
    >
      <div className="flex items-center justify-between gap-4 max-w-mobile mx-auto">
        {/* 좋아요 버튼 */}
        <div className="shrink-0">
          <ProductLikeButton
            productId={productId}
            isLiked={isLiked}
            likeCount={likeCount}
          />
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex-1 flex gap-3 h-12">
          {isOwner ? (
            <>
              {/* 끌어올리기 버튼 (다크모드 가시성 개선) */}
              <button
                onClick={handleBump}
                disabled={isPending || isBumpMaxed}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-xl font-bold text-sm border transition-all shadow-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isBumpMaxed
                    ? "bg-surface-dim text-muted border-transparent"
                    : "bg-surface text-brand border-brand/50 hover:bg-brand/5 dark:text-brand-light dark:border-brand-light/50 dark:hover:bg-brand-light/10 active:scale-[0.98]"
                )}
              >
                {isPending ? (
                  <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpIcon className="size-4" />
                )}
                <span>{isBumpMaxed ? "UP 마감" : "UP"}</span>
                <span className="text-[10px] font-normal opacity-80">
                  ({bumpCount}/{MAX_BUMP_COUNT})
                </span>
              </button>

              {/* 수정 버튼 (시맨틱 btn-primary 적용) */}
              <Link
                href={`/products/view/${productId}/edit`}
                className="flex-1 btn-primary flex items-center justify-center gap-1.5 h-12 shadow-sm"
              >
                <PencilSquareIcon className="size-4" />
                <span>수정</span>
              </Link>
            </>
          ) : (
            <div className="w-full">
              <ChatButton productId={productId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
