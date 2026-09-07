/**
 * File Name : features/user/components/profile/ReviewDetailModal.tsx
 * Description : 단일 리뷰 상세 보기 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.03  임도헌   Created
 * 2024.12.29  임도헌   Modified  리뷰 상세 모달 스타일 수정
 * 2025.10.19  임도헌   Modified  onDelete 비동기/로딩 처리 + ESC/오버레이 닫기 + 접근성 보강
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.06  임도헌   Modified  리뷰 상세 모달에 신고 버튼 추가 및 ReportModal 연동
 * 2026.02.27  임도헌   Modified  본인 리뷰 신고 방지 적용
 * 2026.03.12  임도헌   Modified  리뷰 상세 별점 색상을 채움형 노란 별 기준으로 복원
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 외곽선과 헤더/푸터 보더 강도 정리
 * 2026.03.23  임도헌   Modified  데스크톱에서 텍스트형 모달이 세로로만 길어지지 않도록 폭을 한 단계 확장
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.26  임도헌   Modified  리뷰 상세 별점 aria-label을 sr-only 텍스트와 장식용 아이콘 구조로 정리
 * 2026.06.18  임도헌   Modified  닫기 버튼을 공통 secondary modal 스타일로 통일
 * 2026.06.19  임도헌   Modified  X 닫기 버튼을 추가하고 푸터 닫기 버튼을 제거해 신고/삭제 액션만 남김
 * 2026.08.27  임도헌   Modified  중첩 신고 모달을 고려한 포커스 관리를 공용 useModalFocus로 통일
 */

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { ProfileReview } from "@/features/user/types";
import { useModalFocus } from "@/hooks/useModalFocus";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  review?: Pick<ProfileReview, "id" | "rate" | "payload">;
  onDelete?: () => void | Promise<void>;
  emptyMessage?: string;
  isOwnReview?: boolean;
}

/**
 * 단일 리뷰 상세 내용 보기 모달
 *
 * [기능]
 * 1. 리뷰 내용, 별점, 작성자 정보를 표시
 * 2. 삭제 권한이 있는 경우(`onDelete` prop 존재 시) 삭제 버튼을 노출
 * 3. 리뷰 데이터가 없는 경우 `emptyMessage`를 표시
 * 4. 접근성(ESC 닫기) 및 삭제 로딩 상태를 관리
 */
export default function ReviewDetailModal({
  isOpen,
  onClose,
  title,
  review,
  onDelete,
  emptyMessage = "아직 작성된 리뷰가 없습니다.",
  isOwnReview = false,
}: ReviewDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useModalFocus({
    open: isOpen,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    onClose,
  });

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

  const hasFooterActions = Boolean(review && (!isOwnReview || onDelete));

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
        tabIndex={-1}
        className={cn(
          "relative mx-4 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl sm:max-w-lg",
          "bg-surface border border-border-subtle"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-surface">
          <div className="flex items-center justify-between">
            <h3
              id="review-detail-title"
              className="text-lg font-bold text-primary"
            >
              {title}
            </h3>
            <div className="flex items-center gap-3">
              {review && (
                <div className="flex gap-0.5">
                  <span className="sr-only">별점 {review.rate}점</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      aria-hidden="true"
                      className={cn(
                        "w-4 h-4",
                        star <= review.rate
                          ? "text-yellow-400"
                          : "text-neutral-300 dark:text-neutral-700"
                      )}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="리뷰 상세 모달 닫기"
                className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
              >
                <XMarkIcon className="size-6" />
              </button>
            </div>
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

        {hasFooterActions && (
          <div className="px-6 py-4 border-t border-border-subtle bg-surface flex justify-between gap-2">
            {/* 신고 버튼 (좌측 배치) */}
            <div className="flex items-center">
              {review && !isOwnReview && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="focus-ring-soft rounded-md text-muted hover:text-danger text-sm flex items-center gap-1 transition-colors"
                >
                  <ExclamationTriangleIcon className="size-4" />
                  <span className="text-xs">신고</span>
                </button>
              )}
            </div>

            {review && onDelete ? (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="focus-ring-soft px-4 py-2 text-sm font-medium text-danger bg-danger/10 hover:bg-danger/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
      {/* 신고 모달 */}
      {review && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetId={review.id} // Review ID
          targetType="REVIEW"
        />
      )}
    </div>
  );
}
