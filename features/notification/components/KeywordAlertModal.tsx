/**
 * File Name : features/notification/components/KeywordAlertModal.tsx
 * Description : 알림 센터에서 키워드 알림을 등록·수정·삭제하는 전용 관리 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.16  임도헌   Created   NotificationListContainer 상단 키워드 버튼에서 여는 전용 관리 모달 추가
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import KeywordAlertManager from "@/features/notification/components/KeywordAlertManager";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { RegionRange } from "@/generated/prisma/enums";

interface KeywordAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeywords: { id: number; keyword: string; regionRange: RegionRange }[];
  userLocation: {
    region1?: string | null;
    region2?: string | null;
    region3?: string | null;
    regionRange: string;
  };
}

/**
 * 알림 센터용 키워드 관리 모달
 *
 * [기능]
 * - 모바일에서는 Bottom Sheet, 데스크톱에서는 중앙 모달로 렌더링
 * - 기존 KeywordAlertManager를 비접기 모드로 재사용
 */
export default function KeywordAlertModal({
  isOpen,
  onClose,
  initialKeywords,
  userLocation,
}: KeywordAlertModalProps) {
  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || isMobile) return;

    setTimeout(() => dialogRef.current?.focus(), 0);
    lockBodyScroll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobile, isOpen, onClose]);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <BottomSheet
        open={isOpen}
        title="키워드 알림 관리"
        description="관심 있는 키워드를 등록하고 범위를 조정합니다."
        onClose={onClose}
        contentClassName="pt-4"
      >
        <KeywordAlertManager
          initialKeywords={initialKeywords}
          userLocation={userLocation}
          collapsible={false}
          defaultExpanded
        />
      </BottomSheet>
    );
  }

  const desktopModal = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyword-alert-modal-title"
        tabIndex={-1}
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div className="min-w-0">
            <h2
              id="keyword-alert-modal-title"
              className="text-lg font-bold text-primary"
            >
              키워드 알림 관리
            </h2>
            <p className="mt-1 text-sm text-muted">
              관심 있는 키워드를 등록하고 범위를 조정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            aria-label="키워드 관리 모달 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-5">
          <KeywordAlertManager
            initialKeywords={initialKeywords}
            userLocation={userLocation}
            collapsible={false}
            defaultExpanded
          />
        </div>
      </div>
    </div>
  );

  return isMounted ? createPortal(desktopModal, document.body) : null;
}
