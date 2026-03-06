/**
 * File Name : features/user/components/profile/CreateReviewModal.tsx
 * Description : 리뷰 작성 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.03  임도헌   Created
 * 2024.12.03  임도헌   Modified  리뷰 작성 모달 컴포넌트 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.22  임도헌   Modified  리뷰 로딩 추가, 폼 제출 후 초기화
 * 2024.12.29  임도헌   Modified  리뷰 작성 모달 스타일 수정
 * 2025.10.19  임도헌   Modified  제출 성공 시에만 닫기 + 중복클릭 방지 + 폼 리셋
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (bg-surface)
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

import { useCallback, useEffect, useState } from "react";
import UserAvatar from "@/components/global/UserAvatar";
import { StarIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, rating: number) => Promise<boolean> | boolean;
  username: string;
  userAvatar: string | null;
}

/**
 * 거래 후기 작성 모달
 *
 * [기능]
 * 1. 별점(1~5점) 선택 및 리뷰 내용 입력
 * 2. 입력값이 유효할 때만 제출 버튼 활성화
 * 3. 모달이 닫힐 때 폼 상태 초기화
 */
export default function CreateReviewModal({
  isOpen,
  onClose,
  onSubmit,
  username,
  userAvatar,
}: CreateReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0); // 별점 호버 효과용
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 닫힐 때 폼 리셋
  const resetForm = useCallback(() => {
    setRating(0);
    setReviewText("");
    setHoverRating(0);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  if (!isOpen) return null;

  const disabled = rating === 0 || reviewText.trim() === "" || isSubmitting;

  const handleBackdrop = () => {
    if (isSubmitting) return; // 제출 중 닫기 방지
    onClose();
  };

  const handleSubmit = async () => {
    if (disabled) return;
    try {
      setIsSubmitting(true);
      const ok = await onSubmit(reviewText, rating);
      if (ok) {
        resetForm();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdrop}
      />

      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl shadow-xl animate-fade-in mx-4 overflow-hidden",
          "bg-surface border border-border"
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-dim/30">
          <h2 className="text-lg font-bold text-primary">거래 후기 작성</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex justify-center">
            <UserAvatar
              avatar={userAvatar}
              username={username}
              size="md"
              disabled
              text="님과의 거래는 어떠셨나요?"
              className="pointer-events-none"
            />
          </div>

          {/* Star Rating */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={cn(
                  "cursor-pointer w-10 h-10 transition-all duration-200",
                  star <= (hoverRating || rating)
                    ? "text-yellow-400 scale-110"
                    : "text-neutral-200 dark:text-neutral-700",
                  !isSubmitting && "hover:scale-125"
                )}
                onMouseEnter={() => !isSubmitting && setHoverRating(star)}
                onMouseLeave={() => !isSubmitting && setHoverRating(0)}
                onClick={() => !isSubmitting && setRating(star)}
              />
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="솔직한 거래 경험을 남겨주세요."
            className={cn(
              "w-full h-32 p-4 rounded-xl resize-none",
              "bg-surface-dim border-transparent focus:bg-surface focus:border-brand/50",
              "text-primary placeholder:text-muted/60 focus:ring-2 focus:ring-brand/20",
              "transition-all"
            )}
            disabled={isSubmitting}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-dim/30 flex justify-end gap-3">
          <button
            onClick={handleBackdrop}
            disabled={isSubmitting}
            className="btn-secondary h-10 text-sm border-transparent hover:bg-surface-dim"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="btn-primary h-10 text-sm"
          >
            {isSubmitting ? "작성 중..." : "후기 남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}
