/**
 * File Name : features/user/components/profile/ReviewsList.tsx
 * Description : 리뷰 목록 컴포넌트 (무한 스크롤)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.06  임도헌   Created
 * 2024.12.06  임도헌   Modified  유저 리뷰 리스트 컴포넌트 추가
 * 2025.10.05  임도헌   Modified  created_at 전달 추가 (Item에서 날짜 표기)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 불필요한 스타일 제거 및 간격 조정
 * 2026.01.15  임도헌   Modified  무한 스크롤 로직 추가
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { useRef } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useReviewPagination } from "@/features/review/hooks/useReviewPagination";
import ReviewItem from "@/features/user/components/profile/ReviewsItem";
import type { ProfileReview } from "@/features/user/types";

interface ReviewsListProps {
  userId: number;
  initialReviews: ProfileReview[];
  /**
   * 모달 등 특정 영역 내에서 스크롤될 때 해당 컨테이너의 Ref.
   * 전달되지 않으면 Window 스크롤을 기준으로 동작
   */
  scrollParentRef?: React.RefObject<HTMLElement>;
}

/**
 * 리뷰 목록 렌더링 및 무한 스크롤 관리 컴포넌트
 *
 * [기능]
 * 1. `useReviewPagination` 훅을 사용하여 리뷰 데이터를 로드하고 상태를 관리
 * 2. `useInfiniteScroll`을 사용하여 스크롤이 바닥에 닿으면 추가 데이터를 로드
 *    - `scrollParentRef`를 통해 모달 내부 스크롤도 지원
 * 3. 로딩 상태(스피너) 및 빈 상태(Empty State) UI를 렌더링
 */
export default function ReviewsList({
  userId,
  initialReviews,
  scrollParentRef,
}: ReviewsListProps) {
  // 1. 데이터 관리 훅 사용
  const { reviews, isLoading, hasMore, loadMore } = useReviewPagination({
    userId,
    initialReviews,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 2. 무한 스크롤 연결
  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootRef: scrollParentRef, // 모달 내부 스크롤 지원
    threshold: 0.1,
    rootMargin: "200px",
  });

  // 3. Empty State
  if (reviews.length === 0) {
    return (
      <div className="py-20 text-center text-muted text-sm border border-dashed border-border rounded-xl bg-surface-dim/30">
        아직 받은 후기가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 리스트 영역 */}
      <div className="space-y-0 divide-y divide-border">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>

      {/* 로딩 인디케이터 및 트리거 */}
      <div className="py-6 flex justify-center min-h-[40px]">
        {isLoading ? (
          <div className="size-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        ) : (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
