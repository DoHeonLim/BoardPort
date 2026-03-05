/**
 * File Name : features/user/components/profile/ProfileReviewsModal.tsx
 * Description : 유저 리뷰 목록 모달 (무한 스크롤)
 * Author : 임도헌
 *
 * History
 * 2024.12.07  임도헌   Created
 * 2024.12.07  임도헌   Modified   유저 리뷰 모달 컴포넌트 추가
 * 2024.12.08  임도헌   Modified   threshold 값 변경(보이는 영역 50%)
 * 2024.12.29  임도헌   Modified   유저 리뷰 모달 스타일 수정
 * 2024.12.29  임도헌   Modified   리뷰가 없을 때 메시지 추가
 * 2025.10.05  임도헌   Modified   getMoreUserReviews({ lastCreatedAt, lastId }) 시그니처 반영 + 옵저버 가드 강화
 * 2025.10.29  임도헌   Modified   ESC 닫기/포커스 복귀/바디 스크롤락/a11y 보강, 옵저버 의존성 안정화
 * 2025.11.13  임도헌   Modified   긴 문장 가독성 개선: 읽기 폭 제한(max-w-2xl/ max-w-prose), overscroll-contain
 * 2026.01.15  임도헌   Modified   무한 스크롤 로직을 ReviewsList로 위임하고 레이아웃만 담당
 * 2026.01.17  임도헌   Moved      components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified   주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified   Suspense 적용
 * 2026.03.05  임도헌   Modified   주석 최신화
 */
"use client";

import { useEffect, useRef, Suspense } from "react";
import ReviewsList from "@/features/user/components/profile/ReviewsList";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

/**
 * 받은 거래 후기(리뷰) 목록 모달 컴포넌트
 *
 * [UI 구성 및 스크롤 제어 로직]
 * - React `Suspense`를 활용한 `ReviewsList` 자식 컴포넌트 데이터 로딩 상태의 선언적 제어
 * - 모달 내부의 스크롤 컨테이너(`scrollAreaRef`)를 `ReviewsList`에 주입하여 독립적 무한 스크롤 트리거 적용
 * - 화면 크기에 따른 하단 시트(Bottom Sheet) 및 중앙 카드 렌더링 반응형 분기 처리
 */
export default function ProfileReviewsModal({
  isOpen,
  onClose,
  userId,
}: ReviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 접근성 & 이벤트 리스너
  useEffect(() => {
    if (!isOpen) return;

    // 초기 포커스 이동 (스크린 리더 접근성)
    setTimeout(() => dialogRef.current?.focus(), 0);

    // Body 스크롤 잠금
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // ESC 키 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-title"
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-2xl bg-surface shadow-2xl overflow-hidden outline-none flex flex-col",
          // [반응형] Mobile: Bottom Sheet, Desktop: Center Card
          "h-[85vh] rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-fade-in",
          "border-t sm:border border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
          <h2 id="reviews-title" className="text-lg font-bold text-primary">
            받은 거래 후기
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto p-6 scrollbar-hide"
        >
          <Suspense
            fallback={
              <div className="size-6 mx-auto mt-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            }
          >
            {/* ReviewsList에 scrollParentRef 전달 -> 내부 무한 스크롤 트리거 기준 */}
            <ReviewsList userId={userId} scrollParentRef={scrollAreaRef} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
