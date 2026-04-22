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
 * 2026.02.04  임도헌   Modified  Stacking Context 문제 해결을 위해 createPortal 적용
 * 2026.03.08  임도헌   Modified  모달 진입 fade 애니메이션 제거
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.23  임도헌   Modified  구조 구분선 성격에 맞게 공용 확인 모달 외곽선을 subtle 기준으로 정리
 * 2026.04.08  임도헌   Modified  모바일에서는 하단 시트형, 데스크톱에서는 중앙 카드형으로 분리해 키보드/안전영역 대응 보강
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.21  임도헌   Modified  중첩 모달 위에서도 확인 다이얼로그가 안정적으로 보이도록 포털 레이어 우선순위를 10단위 규칙으로 정리
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
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

/**
 * 삭제/확인용 공용 모달
 *
 * [Portal 적용]
 * - `createPortal`을 사용하여 DOM의 최상위(`document.body`)에 렌더링
 * - 부모 요소의 `sticky`, `z-index` 등 쌓임 맥락(Stacking Context) 문제를 해결하여 화면 전체를 덮도록 보장
 */
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

  // SSR Hydration 불일치 방지를 위한 mounted 상태
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 포커스 진입/복원 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    prevFocusedRef.current = document.activeElement as HTMLElement | null;

    const t = setTimeout(() => firstRef.current?.focus(), 0);
    lockBodyScroll();

    return () => {
      clearTimeout(t);
      unlockBodyScroll();
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

  // open이 false거나 마운트 전이면 렌더링 안 함
  if (!open || !mounted) return null;

  const onBackdropClick = () => {
    if (!loading) onCancel();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-6 sm:items-center sm:px-6 sm:pb-6"
      onClick={onBackdropClick}
    >
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
          "relative z-10 flex w-full max-w-[480px] flex-col rounded-2xl border border-border-subtle bg-surface p-5 shadow-2xl sm:p-6",
          "max-h-[min(80dvh,560px)] sm:max-h-[min(70dvh,560px)]",
          "rounded-b-2xl sm:rounded-2xl"
        )}
        onClick={stop}
      >
        <div className="overflow-y-auto">
          <h3 id="confirm-title" className="text-lg font-bold text-primary">
            {title}
          </h3>

          {description && (
            <div
              id={descId}
              className="mt-2 text-sm leading-relaxed text-muted"
            >
              {description}
            </div>
          )}
        </div>

        <div className="mt-6 flex shrink-0 justify-end gap-3 border-t border-border-subtle pt-4">
          <button
            ref={firstRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="focus-ring-soft rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="focus-ring-strong rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body // Portal Target
  );
}
