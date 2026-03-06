/**
 * File Name : components/global/BottomSheet.tsx
 * Description : 모바일용 공용 Bottom Sheet
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   모바일 액션 메뉴 및 필터용 공용 바텀시트 추가
 */
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
      setTranslateY(0);
      setIsDragging(false);
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

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.touches[0]?.clientY ?? 0;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const currentY = event.touches[0]?.clientY ?? dragStartYRef.current;
    const deltaY = Math.max(0, currentY - dragStartYRef.current);
    setTranslateY(deltaY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (translateY > 96) {
      onClose();
      return;
    }

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
          "relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-2xl",
          !isDragging && "transition-transform duration-200 ease-out",
          panelClassName
        )}
        style={{ transform: `translateY(${translateY}px)` }}
      >
        <div
          className="flex cursor-grab flex-col items-center px-4 pt-3 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="mb-3 h-1.5 w-12 rounded-full bg-border"
            aria-hidden="true"
          />
          <div className="flex w-full items-center justify-between gap-3 border-b border-border pb-3">
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
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto px-4 pb-4", contentClassName)}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-border bg-surface px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
