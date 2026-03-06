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
 * 2026.03.01  임도헌   Modified  isFetchingNextPage 적용을 통한 하단 스피너 분리 최적화
 * 2026.03.03  임도헌   Modified  initialReviews Props 제거 및 훅 호출 시그니처 변경
 * 2026.03.05  임도헌   Modified   주석 최신화
 */
"use client";

import { useRef } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useReviewPagination } from "@/features/review/hooks/useReviewPagination";
import ReviewItem from "@/features/user/components/profile/ReviewsItem";

interface ReviewsListProps {
  userId: number;
  scrollParentRef?: React.RefObject<HTMLElement>;
}

/**
 * 프로필 리뷰 무한 스크롤 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `useReviewPagination` 훅을 통한 서버 하이드레이션 상태 추출 및 무한 스크롤 제어
 * - 사용자 가시성(`usePageVisibility`) 기반 `useInfiniteScroll` 감지를 활용한 모달(`scrollParentRef`) 내부 독립 페이징 적용
 * - 데이터 페칭 상태(`isFetchingNextPage`)에 따른 하단 로딩 스피너 분리 및 빈 목록(Empty State) 조건부 렌더링
 */
export default function ReviewsList({
  userId,
  scrollParentRef,
}: ReviewsListProps) {
  // TanStack Query 기반 데이터 관리 훅 호출
  const { reviews, isFetchingNextPage, hasMore, loadMore } =
    useReviewPagination(userId);

  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 무한 스크롤 센서 등록
  // 스크롤 중복 호출 방지를 위해 isLoading 플래그에 isFetchingNextPage를 바인딩함.
  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootRef: scrollParentRef, // 모달 등 특정 스크롤 컨테이너를 기준으로 동작하도록 설정함.
    threshold: 0.1,
    rootMargin: "200px", // 조기 로딩을 위한 여유 마진 확보
  });

  // 데이터가 없을 경우 표시되는 Empty State
  if (reviews.length === 0) {
    return (
      <div className="py-20 text-center text-muted text-sm border border-dashed border-border rounded-xl bg-surface-dim/30">
        아직 받은 후기가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-0 divide-y divide-border">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
      <div className="py-6 flex justify-center min-h-[40px]">
        {hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {isFetchingNextPage && (
          <div className="size-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
