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
 * 2026.03.12  임도헌   Modified   공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.14  임도헌   Modified   모바일에서 후기 모달 헤더/본문 여백을 한 단계 줄여 리스트 밀도를 보강
 * 2026.03.19  임도헌   Modified   외곽선과 그림자를 한 단계 낮춰 최근 프로필/알림 모달 톤과 시각 밀도를 통일
 * 2026.03.22  임도헌   Modified   뱃지 컬렉션 모달과 모션 규칙을 맞추기 위해 진입 transform 애니메이션 제거
 * 2026.04.08  임도헌   Modified   모바일에서는 공용 BottomSheet를 사용해 후기 전체 보기 흐름을 다른 프로필 오버레이와 통일
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.08.13  임도헌   Modified  리뷰 목록에 차단 필터 기준 조회자 ID 전달
 */

import { useEffect, useRef, Suspense } from "react";
import ReviewsList from "@/features/user/components/profile/ReviewsList";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  viewerId?: number | null;
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
  viewerId = null,
}: ReviewModalProps) {
  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 접근성 & 이벤트 리스너
  useEffect(() => {
    if (!isOpen) return;

    if (isMobile) return;

    // 초기 포커스 이동 (스크린 리더 접근성)
    setTimeout(() => dialogRef.current?.focus(), 0);

    // Body 스크롤 잠금
    lockBodyScroll();

    // ESC 키 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobile, isOpen, onClose]);

  if (!isOpen) return null;

  const reviewsContent = (
    <Suspense
      fallback={
        <div className="size-6 mx-auto mt-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      }
    >
      <ReviewsList
        userId={userId}
        viewerId={viewerId}
        scrollParentRef={scrollAreaRef}
      />
    </Suspense>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={isOpen}
        onClose={onClose}
        title="받은 거래 후기"
        contentClassName="px-0 pb-0"
        panelClassName="max-h-[84dvh]"
      >
        <div
          ref={scrollAreaRef}
          className="min-h-0 max-h-[68dvh] overflow-y-auto px-4 pb-4"
        >
          {reviewsContent}
        </div>
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 컨테이너 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-title"
        tabIndex={-1}
        className={cn(
          "relative flex w-full max-h-[80dvh] flex-col overflow-hidden bg-surface shadow-xl outline-none sm:max-w-2xl",
          // [반응형] Mobile: Bottom Sheet, Desktop: Center Card
          "rounded-t-2xl sm:rounded-2xl",
          "border-t sm:border border-border-subtle"
        )}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4 bg-surface sm:px-6">
          <h2 id="reviews-title" className="text-lg font-bold text-primary">
            받은 거래 후기
          </h2>
          <button
            onClick={onClose}
            className="focus-ring-soft p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* 내용 영역 (스크롤 가능) */}
        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-hide sm:p-6"
        >
          {reviewsContent}
        </div>
      </div>
    </div>
  );
}
