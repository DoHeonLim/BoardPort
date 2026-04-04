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
 * 2026.03.05  임도헌   Modified  isModalContext 기반 edit 링크 replace 분기 추가
 * 2026.03.13  임도헌   Modified  일반 상세도 비채팅 returnTo 문맥에서는 replace 기반 수정 진입으로 stale history를 방지
 * 2026.03.17  임도헌   Modified  일반 상세 수정 진입에도 flow=detail-edit를 부여하고 비채팅 returnTo 문맥에서는 replace 기반 진입으로 삭제 복귀를 안정화
 * 2026.03.18  임도헌   Modified  하단 액션바의 returnTo를 sanitizeCallbackUrl 기준으로 정리해 수정 진입 링크 안전성 보강
 * 2026.03.19  임도헌   Modified  하단 액션바의 반투명/블러 톤을 줄이고 solid 패널 기준으로 정리
 * 2026.03.25  임도헌   Modified  모바일 하단 액션바 높이/그림자 밀도를 줄이고 owner 액션 비중을 재조정
 */
"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
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
  isModalContext?: boolean;
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
  isModalContext = false,
}: ProductDetailActionsProps) {
  const [isPending, startTransition] = useTransition(); // 추가

  const isBumpMaxed = bumpCount >= MAX_BUMP_COUNT;
  const sp = useSearchParams();
  // 상세 URL에 실린 returnTo를 정제한 뒤 편집 링크에 재사용
  const rawReturnTo = sp.get("returnTo");
  const returnTo = rawReturnTo
    ? sanitizeCallbackUrl(rawReturnTo)
    : null;
  const editFlow = isModalContext ? "modal-edit" : "detail-edit";
  // 채팅 returnTo는 삭제 후 상품 목록으로 보내는 예외가 있어 push 진입 유지
  const shouldReplaceEditEntry =
    isModalContext || (!!returnTo && !returnTo.startsWith("/chats/"));
  const editHref = returnTo
    ? `/products/view/${productId}/edit?returnTo=${encodeURIComponent(returnTo)}&flow=${editFlow}`
    : `/products/view/${productId}/edit?flow=${editFlow}`;

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
        "w-full border-t border-border-subtle bg-surface",
        // 아이폰 하단 홈 바 여백을 고려하되 기본 패딩도 예쁘게 보장
        "px-4 py-2.5 sm:py-3",
        "pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-[max(env(safe-area-inset-bottom),0.75rem)]",
        // 모달에서 뜰 때 하단 그림자가 위로 자연스럽게 퍼지도록
        "shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.16)]"
      )}
    >
      <div className="mx-auto flex max-w-mobile items-center justify-between gap-3 sm:gap-4">
        {/* 좋아요 버튼 */}
        <div className="shrink-0">
          <ProductLikeButton
            productId={productId}
            isLiked={isLiked}
            likeCount={likeCount}
          />
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex h-11 flex-1 gap-2.5 sm:h-12 sm:gap-3">
          {isOwner ? (
            <>
              {/* 끌어올리기 버튼: 수정보다 한 단계 가벼운 owner 보조 액션 */}
              <button
                onClick={handleBump}
                disabled={isPending || isBumpMaxed}
                className={cn(
                  "w-[7.75rem] shrink-0 sm:flex-1 sm:w-auto",
                  "flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl border text-sm font-semibold transition-all",
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
                <span className="text-[10px] font-normal opacity-80">
                  ({bumpCount}/{MAX_BUMP_COUNT})
                </span>
              </button>

              {/* 수정 버튼 (시맨틱 btn-primary 적용) */}
              <Link
                href={editHref}
                replace={shouldReplaceEditEntry}
                className="flex-1 btn-primary flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm shadow-none sm:h-12 sm:rounded-xl sm:text-base sm:shadow-sm"
              >
                <PencilSquareIcon className="size-4" />
                <span>수정</span>
              </Link>
            </>
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
