/**
 * File Name : features/user/components/profile/ReviewDetailModal.tsx
 * Description : 리뷰 상세 모달 컴포넌트(구매자, 판매자)
 * Author : 임도헌
 *
 * History
 * 2024.12.03  임도헌   Created
 * 2024.12.29  임도헌   Modified  리뷰 상세 모달 스타일 수정
 * 2025.10.19  임도헌   Modified  onDelete 비동기/로딩 처리 + ESC/오버레이 닫기 + 접근성 보강
 * 2026.01.12  임도헌   Modified   [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  review?: {
    id: number;
    rate: number;
    payload: string;
  };

  onDelete?: () => void | Promise<void>;
  emptyMessage?: string;
}

export default function ReviewDetailModal({
  isOpen,
  onClose,
  title,
  review,
  onDelete,
  emptyMessage = "아직 작성된 리뷰가 없습니다.",
}: ReviewDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="review-detail-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-in mx-4 overflow-hidden",
          "bg-surface border border-border"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-dim/30">
          <div className="flex items-center justify-between">
            <h3
              id="review-detail-title"
              className="text-lg font-bold text-primary"
            >
              {title}
            </h3>
            {review && (
              <div
                className="flex gap-0.5"
                aria-label={`별점 ${review.rate}점`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= review.rate
                        ? "text-yellow-400"
                        : "text-neutral-200 dark:text-neutral-700"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 min-h-[80px] flex items-center">
          {review ? (
            <p className="text-primary whitespace-pre-wrap leading-relaxed">
              {review.payload}
            </p>
          ) : (
            <span className="text-muted text-sm w-full text-center block">
              {emptyMessage}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-dim/30 flex justify-end gap-2">
          {review && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-primary bg-surface hover:bg-surface-dim border border-border rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
