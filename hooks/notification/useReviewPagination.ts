/**
 * File Name : hooks/notification/usePushNotification.ts
 * Description : 유저 리뷰 무한 스크롤을 위한 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   [Move] ProfileReviewsModal에서 로직 분리
 * 2026.01.16  임도헌   Moved     hooks -> hooks/notification
 */

"use client";

import { useState, useCallback } from "react";
import { getMoreUserReviews } from "@/lib/user/getUserReviews";
import type { ProfileReview } from "@/types/profile";

interface UseReviewPaginationProps {
  userId: number;
  initialReviews: ProfileReview[];
}

export function useReviewPagination({
  userId,
  initialReviews,
}: UseReviewPaginationProps) {
  const [reviews, setReviews] = useState<ProfileReview[]>(initialReviews);
  const [isLoading, setIsLoading] = useState(false);

  // 서버 액션이 nextCursor를 반환하지만,
  // 초기 상태에서는 initialReviews의 마지막 아이템으로 커서를 추론해야 함
  const [cursor, setCursor] = useState(() => {
    const tail = initialReviews.at(-1);
    if (!tail) return null;

    // created_at이 Date 객체가 아닐 경우(직렬화된 경우) 대응
    const created =
      typeof tail.created_at === "string"
        ? new Date(tail.created_at)
        : tail.created_at;

    return { lastCreatedAt: created, lastId: tail.id };
  });

  const [hasMore, setHasMore] = useState(initialReviews.length > 0);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);
    try {
      const { reviews: newReviews, nextCursor } = await getMoreUserReviews(
        userId,
        cursor
      );

      if (newReviews.length > 0) {
        setReviews((prev) => [...prev, ...newReviews]);
        setCursor(nextCursor);
        setHasMore(!!nextCursor);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more reviews:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, cursor, hasMore, isLoading]);

  return {
    reviews,
    isLoading,
    hasMore,
    loadMore,
  };
}
