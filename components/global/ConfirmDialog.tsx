/**
 * File Name : components/global/ConfirmDialog.tsx
 * Description : 삭제/확인용 공용 모달 (시맨틱 토큰 및 접근성 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.21  임도헌   Created   기본 확인/취소, 로딩/비활성화, Esc/외부클릭 닫기
 * 2025.09.09  임도헌   Modified  a11y(alertdialog/aria-describedby), 포커스 트랩/복원, 바디 스크롤 잠금, 로딩 중 닫힘 차단
 * 2026.01.10  임도헌   Modified  [Rule 3.1.2] Danger 색상 및 시맨틱 토큰 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/global
 */
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusedRef = useRef<HTMLElement | null>(null);
  const descId = description ? "confirm-desc" : undefined;

  // 포커스 진입/복원 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    prevFocusedRef.current = document.activeElement as HTMLElement | null;

    const t = setTimeout(() => firstRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      // 닫히면 이전 포커스로 복귀
      prevFocusedRef.current?.focus?.();
    };
  }, [open]);

  // ESC + 포커스 트랩(Tab 순환)
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!loading) onCancel();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a,button,input,textarea,select,details,[tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(
          (el) => !el.hasAttribute("disabled")
        );
        if (list.length === 0) return;

        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const onBackdropClick = () => {
    if (!loading) onCancel();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-[60]" onClick={onBackdropClick}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={descId}
        className={cn(
          "relative mx-auto mt-40 w-[min(480px,92vw)] p-6 shadow-2xl",
          // 시맨틱 토큰 적용
          "bg-surface rounded-2xl border border-border animate-fade-in"
        )}
        onClick={stop}
      >
        <h3 id="confirm-title" className="text-lg font-bold text-primary">
          {title}
        </h3>

        {description && (
          <div id={descId} className="mt-2 text-sm text-muted leading-relaxed">
            {description}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={firstRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            // 파괴적 액션 -> bg-danger
            className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-red-600 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
