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
 * 2026.03.12  임도헌   Modified  리뷰 작성 별점 색상을 채움형 노란 별 기준으로 복원
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 외곽선과 헤더/푸터 보더 강도 정리
 * 2026.04.06  임도헌   Modified  모바일 키보드가 열려도 textarea와 하단 액션 버튼이 덜 가려지도록 시트형 배치 적용
 * 2026.04.26  임도헌   Modified  리뷰 작성 모달에 dialog 의미와 별점 radiogroup, 후기 입력 라벨을 추가해 접근성을 보강
 */

import { useCallback, useEffect, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdrop}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-review-title"
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
          "bg-surface border border-border-subtle"
        )}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-border-subtle bg-surface">
          <h2 id="create-review-title" className="text-lg font-bold text-primary">
            거래 후기 작성
          </h2>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* 별점 선택 */}
          <div
            className="flex justify-center gap-1"
            role="radiogroup"
            aria-label="거래 별점"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star}점`}
                disabled={isSubmitting}
                className="focus-ring-soft rounded-full p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                onMouseEnter={() => !isSubmitting && setHoverRating(star)}
                onMouseLeave={() => !isSubmitting && setHoverRating(0)}
                onClick={() => !isSubmitting && setRating(star)}
              >
                <StarIcon
                  aria-hidden="true"
                  className={cn(
                    "h-10 w-10 transition-colors motion-safe:transition-transform duration-200",
                    star <= (hoverRating || rating)
                      ? "text-yellow-400 scale-110"
                      : "text-neutral-300 dark:text-neutral-700",
                    !isSubmitting && "hover:scale-125"
                  )}
                />
              </button>
            ))}
          </div>

          {/* 텍스트 입력 */}
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="솔직한 거래 경험을 남겨주세요."
            aria-label="거래 후기 내용"
            className={cn(
              "w-full h-32 p-4 rounded-xl resize-none",
              "bg-surface-dim border-transparent focus:bg-surface focus:border-brand/50",
              "text-primary placeholder:text-muted/60 focus:ring-2 focus:ring-brand/20",
              "transition-[background-color,color,border-color,box-shadow]"
            )}
            disabled={isSubmitting}
          />
        </div>

        {/* 하단 액션 */}
        <div className="shrink-0 px-6 py-4 border-t border-border-subtle bg-surface flex justify-end gap-3">
          <button
            onClick={handleBackdrop}
            disabled={isSubmitting}
            className="btn-secondary-modal h-10 px-4 text-sm font-medium"
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
