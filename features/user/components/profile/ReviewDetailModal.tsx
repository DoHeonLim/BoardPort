/**
 * File Name : features/user/components/profile/ReviewDetailModal.tsx
 * Description : 단일 리뷰 상세 보기 모달
 * Author : 임도헌
 *
 * History
 * 2024.12.03  임도헌   Created
 * 2024.12.29  임도헌   Modified  리뷰 상세 모달 스타일 수정
 * 2025.10.19  임도헌   Modified  onDelete 비동기/로딩 처리 + ESC/오버레이 닫기 + 접근성 보강
 * 2026.01.12  임도헌   Modified   [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import type { ProfileReview } from "@/features/user/types";

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  review?: Pick<ProfileReview, "id" | "rate" | "payload">;
  onDelete?: () => void | Promise<void>;
  emptyMessage?: string;
}

/**
 * 단일 리뷰 상세 내용 보기 모달
 *
 * [기능]
 * 1. 리뷰 내용, 별점, 작성자 정보를 표시합니다.
 * 2. 삭제 권한이 있는 경우(`onDelete` prop 존재 시) 삭제 버튼을 노출합니다.
 * 3. 리뷰 데이터가 없는 경우 `emptyMessage`를 표시합니다.
 * 4. 접근성(ESC 닫기) 및 삭제 로딩 상태를 관리합니다.
 */
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

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // 삭제 핸들러 (비동기 처리 & 로딩 상태 관리)
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete();
      // 성공 후 처리는 상위 컴포넌트(MySalesProductItem 등)에서 담당
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
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
