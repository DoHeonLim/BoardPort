/**
 * File Name : components/global/BottomSheet.tsx
 * Description : 모바일용 공용 Bottom Sheet
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   모바일 액션 메뉴 및 필터용 공용 바텀시트 추가
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 검색 모달 등과 중첩되어도 스크롤 잠금/복구 안정화
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.26  임도헌   Modified  드래그 닫기를 pointer 이벤트로 통합해 PC 좁은 viewport의 마우스 드래그도 지원
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface BottomSheetProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  panelClassName?: string;
}

/**
 * 모바일 액션/입력용 공용 Bottom Sheet
 *
 * [상호작용]
 * - 포털 렌더링으로 상위 stacking context 영향 없이 화면 최상단에 노출
 * - ESC, 백드롭 클릭, 드래그 다운 제스처로 닫기 지원
 * - 열릴 때 포커스를 시트 내부로 이동시키고 닫힐 때 기존 포커스로 복귀
 */
export default function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  contentClassName,
  panelClassName,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dragStartYRef = useRef(0);
  const dragCurrentYRef = useRef(0);
  const titleId = useId();
  const fallbackDescriptionId = useId();
  const descriptionId = description ? fallbackDescriptionId : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    lockBodyScroll();

    return () => {
      window.clearTimeout(timer);
      unlockBodyScroll();
      previousFocusRef.current?.focus?.();
      setTranslateY(0);
      setIsDragging(false);
      dragStartYRef.current = 0;
      dragCurrentYRef.current = 0;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'a,button,input,textarea,select,details,[tabindex]:not([tabindex="-1"])'
      );
      const focusableList = Array.from(focusableElements).filter(
        (element) => !element.hasAttribute("disabled")
      );

      if (focusableList.length === 0) return;

      const firstElement = focusableList[0];
      const lastElement = focusableList[focusableList.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStartYRef.current = event.clientY;
    dragCurrentYRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = Math.max(0, event.clientY - dragStartYRef.current);
    dragCurrentYRef.current = deltaY;
    setTranslateY(deltaY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragCurrentYRef.current > 96) {
      onClose();
      return;
    }

    dragCurrentYRef.current = 0;
    setTranslateY(0);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-border-subtle bg-surface shadow-2xl",
          !isDragging && "transition-transform duration-200 ease-out",
          panelClassName
        )}
        style={{ transform: `translateY(${translateY}px)` }}
      >
        <div
          className="flex touch-none select-none cursor-grab flex-col items-center px-4 pt-3 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div
            className="mb-3 h-1.5 w-12 rounded-full bg-border"
            aria-hidden="true"
          />
          <div className="flex w-full items-center justify-between gap-3 border-b border-border-subtle pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-bold text-primary">
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-relaxed text-muted"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="시트 닫기"
              className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
        </div>

        <div
          className={cn("flex-1 overflow-y-auto px-4 pb-4", contentClassName)}
        >
          {children}
        </div>

        {footer && (
          <div className="border-t border-border-subtle bg-surface px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
