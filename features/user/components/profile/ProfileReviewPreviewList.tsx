/**
 * File Name : features/user/components/profile/ProfileReviewPreviewList.tsx
 * Description : 프로필 메인용 후기 미리보기 리스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.15  임도헌   Created   프로필 메인에서 받은 거래 후기 일부를 미리 보여주는 압축 리스트 추가
 */
"use client";

import ReviewItem from "@/features/user/components/profile/ReviewsItem";
import type { ProfileReview } from "@/features/user/types";

interface ProfileReviewPreviewListProps {
  reviews: ProfileReview[];
}

/**
 * 프로필 메인 후기 미리보기 리스트
 *
 * - 전체 보기 모달 진입 전, 최근 후기 일부를 메인 화면에서 바로 노출
 * - 리뷰가 없을 경우 간단한 빈 상태 카드 표시
 *
 * @param reviews - 프로필 메인에 노출할 리뷰 배열
 */
export default function ProfileReviewPreviewList({
  reviews,
}: ProfileReviewPreviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-dim/30 px-4 py-8 text-center text-sm text-muted">
        아직 받은 후기가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface px-4 py-2.5 shadow-sm">
      <div className="divide-y divide-border-subtle">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} variant="preview" />
        ))}
      </div>
    </div>
  );
}
