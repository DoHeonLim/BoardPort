/**
 * File Name : features/review/hooks/usePushNotification.ts
 * Description : 유저 리뷰 무한 스크롤을 위한 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   [Move] ProfileReviewsModal에서 로직 분리
 * 2026.01.16  임도헌   Moved     hooks -> hooks/review
 * 2026.01.18  임도헌   Moved     hooks/review -> features/review/hooks
 */
"use client";

import { useState, useCallback } from "react";
import { getMoreUserReviewsAction } from "@/features/user/actions/review";
import type { ProfileReview } from "@/features/user/types";

interface UseReviewPaginationProps {
  userId: number; // 리뷰 대상 유저 ID
  initialReviews: ProfileReview[]; // SSR로 받은 초기 데이터 (1페이지)
}

/**
 * 리뷰 목록 페이지네이션 훅
 *
 * [기능]
 * 1. 초기 데이터(`initialReviews`)를 기반으로 상태 초기화
 * 2. 마지막 아이템 정보를 이용해 다음 커서(Cursor) 추론
 * 3. `loadMore` 호출 시 서버 액션을 통해 추가 데이터 로드 및 병합
 */
export function useReviewPagination({
  userId,
  initialReviews,
}: UseReviewPaginationProps) {
  // 전체 리뷰 목록 상태
  const [reviews, setReviews] = useState<ProfileReview[]>(initialReviews);

  // 데이터 로딩 중 상태
  const [isLoading, setIsLoading] = useState(false);

  // 커서 상태 초기화
  // - 서버에서 nextCursor를 따로 주지 않고, 리스트의 마지막 항목으로 커서를 직접 계산하는 방식
  // - Keyset Pagination: (created_at, id) 복합 커서 사용
  const [cursor, setCursor] = useState(() => {
    const tail = initialReviews.at(-1);
    if (!tail) return null; // 데이터가 없으면 커서도 없음

    // created_at이 문자열(JSON 직렬화)로 올 수 있으므로 Date 객체로 변환
    const created =
      typeof tail.created_at === "string"
        ? new Date(tail.created_at)
        : tail.created_at;

    return { lastCreatedAt: created, lastId: tail.id };
  });

  // 더 불러올 데이터가 있는지 여부
  // - 초기 데이터가 있으면 true로 시작 (실제 더 있는지는 loadMore 시 확인)
  const [hasMore, setHasMore] = useState(initialReviews.length > 0);

  /**
   * 추가 데이터 로드 함수
   * - 스크롤이 바닥에 닿았을 때(InfiniteScroll) 호출됨
   */
  const loadMore = useCallback(async () => {
    // 1. 로딩 조건 체크: 이미 로딩 중이거나, 더 이상 데이터가 없거나, 커서가 없으면 중단
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);
    try {
      // 2. 서버 액션 호출 (다음 페이지 데이터 요청)
      const { reviews: newReviews, nextCursor } =
        await getMoreUserReviewsAction(userId, cursor);

      // 3. 데이터 병합 및 상태 업데이트
      if (newReviews.length > 0) {
        setReviews((prev) => [...prev, ...newReviews]); // 기존 목록 뒤에 추가
        setCursor(nextCursor); // 다음 커서 업데이트
        setHasMore(!!nextCursor); // 다음 커서 유무로 hasMore 결정
      } else {
        // 4. 데이터가 없으면 종료 처리
        setHasMore(false);
      }
    } catch (error) {
      console.error(
        "[useReviewPagination] Failed to load more reviews:",
        error
      );
      // 에러 발생 시 UI에 알림을 주거나 재시도 UI를 표시하는 로직 추가 가능
    } finally {
      setIsLoading(false);
    }
  }, [userId, cursor, hasMore, isLoading]);

  return {
    reviews, // 렌더링할 전체 리뷰 목록
    isLoading, // 로딩 인디케이터 표시용
    hasMore, // 무한 스크롤 트리거 활성화 여부
    loadMore, // 트리거 시 호출할 함수
  };
}
