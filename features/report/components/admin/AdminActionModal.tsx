/**
 * File Name : features/report/components/admin/AdminActionModal.tsx
 * Description : 관리자 전용 공용 액션 모달 (사유 입력 + 확정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   ReportActionDialog를 범용화하여 통합
 * 2026.02.08  임도헌   Modified  정지 기간 선택 옵션(showBanOptions) 추가
 * 2026.03.23  임도헌   Modified  관리자 공용 액션 모달 셸 보더를 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.30  임도헌   Modified  권한 변경 확인에도 재사용되도록 관리자 공통 액션 모달 문맥을 확장
 * 2026.04.06  임도헌   Modified  모바일 키보드가 열려도 사유 입력과 하단 액션이 덜 가려지도록 시트형 배치 적용
 * 2026.04.10  임도헌   Modified  관리자 액션 모달의 보조 라벨 크기를 공통 타이포 스케일로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.26  임도헌   Modified  관리자 액션 모달에 dialog 의미와 설명/입력 라벨 연결, ESC 닫기 흐름을 보강
 * 2026.04.26  임도헌   Modified  primary 확인 버튼의 다크모드 색조를 공용 CTA 톤과 맞춰 정리
 * 2026.04.28  임도헌   Modified  모바일 관리자 액션을 공용 BottomSheet로 분기해 작은 화면의 입력/버튼 잘림을 완화
 * 2026.06.19  임도헌   Modified  데스크톱 X 닫기를 추가하고 푸터 취소 버튼을 제거해 실제 관리자 액션만 남김
 * 2026.06.19  임도헌   Modified  데스크톱 관리자 액션 모달을 포털로 렌더링해 관리자 셸의 레이아웃 문맥에서 분리
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 */

import { XMarkIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import BottomSheet from "@/components/global/BottomSheet";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";

interface AdminActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  placeholder?: string;

  // 메인 액션 설정
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "success";

  /**
   * onConfirm
   * @param reason - 입력된 사유
   * @param banDuration - (옵션) 선택된 정지 기간 (일수, 0=영구)
   */
  onConfirm: (reason: string, banDuration?: number) => Promise<void>;

  // 보조 액션 설정 (선택)
  secondaryLabel?: string;
  onSecondaryAction?: (reason: string) => Promise<void>;
  // 유효성 검사
  minReasonLength?: number;
  // 추가 옵션 UI 활성화 여부
  showBanOptions?: boolean;
}

/**
 * 관리자 공통 액션 모달 (삭제/차단/승인 등)
 *
 * [기능]
 * 1. 관리자의 주요 의사결정 시 사유(Reason)를 필수로 입력받음
 * 2. 정지 기간 선택 옵션(영구/기간제)을 동적으로 렌더링 지원
 * 3. 비동기 처리 중 로딩 상태 표시 및 버튼 비활성화
 * 4. 삭제/정지/권한 변경처럼 관리자 확인이 필요한 액션을 공통 문법으로 재사용
 * 5. Audit Log 기록을 위한 필수 메타데이터 확보
 * 6. 모바일은 BottomSheet, 데스크톱은 중앙 모달로 분기해 입력/버튼 접근성 유지
 */
export default function AdminActionModal({
  open,
  onClose,
  title,
  description,
  placeholder = "처리 사유를 입력해주세요...",
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  secondaryLabel,
  onSecondaryAction,
  minReasonLength = 5,
  showBanOptions = false, // 기본값 false
}: AdminActionModalProps) {
  const [reason, setReason] = useState("");
  const [banDuration, setBanDuration] = useState(0); // 0: 영구
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const handleRequestClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 종료 시 입력 상태 초기화
  // 같은 모달을 여러 대상에 재사용하므로 닫힐 때 사유와 기간을 기본값으로 초기화
  useEffect(() => {
    if (!open) {
      setReason("");
      setBanDuration(0);
    }
  }, [open]);

  useModalFocus({
    open,
    enabled: mounted && !isMobile,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    onClose: handleRequestClose,
  });

  if (!open || !mounted) return null;

  const handleConfirm = () => {
    if (reason.trim().length < minReasonLength) return;
    startTransition(async () => {
      // 정지 기간 조건부 전달
      // 정지 옵션이 켜진 경우에만 duration을 넘겨 공용 confirm 시그니처 유지
      await onConfirm(reason, showBanOptions ? banDuration : undefined);
    });
  };

  const handleSecondary = () => {
    if (!onSecondaryAction) return;
    startTransition(async () => {
      await onSecondaryAction(reason);
    });
  };

  const variantClasses = {
    primary:
      "bg-brand text-white hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark",
    danger: "bg-danger text-white hover:bg-red-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  const content = (
    <div className="space-y-4">
      {showBanOptions && (
        <div>
          <label
            htmlFor="admin-action-ban-duration"
            className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block"
          >
            정지 기간
          </label>
          <Select
            id="admin-action-ban-duration"
            value={banDuration}
            onChange={(e) => setBanDuration(Number(e.target.value))}
            className="bg-surface-dim border-transparent"
          >
            <option value={0}>영구 정지 (Permanent)</option>
            <option value={1}>1일 정지</option>
            <option value={3}>3일 정지</option>
            <option value={7}>7일 정지</option>
            <option value={30}>30일 정지</option>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="admin-action-reason"
          className="text-xs font-bold text-muted uppercase tracking-wider"
        >
          사유 입력 <span className="text-danger">*</span>
        </label>
        <textarea
          id="admin-action-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          placeholder={placeholder}
          className="input-primary h-32 w-full resize-none border-none bg-surface-dim p-4 text-sm focus:ring-brand/15 dark:focus:ring-brand-light/15"
        />
        <p className="text-xs text-right text-muted">
          {reason.length} / {minReasonLength}자 이상
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col justify-end gap-3 sm:flex-row">
      {secondaryLabel && onSecondaryAction && (
        <button
          onClick={handleSecondary}
          disabled={isPending}
          className="btn-secondary flex-1 sm:flex-none border-border"
        >
          {secondaryLabel}
        </button>
      )}

      <button
        onClick={handleConfirm}
        disabled={isPending || reason.trim().length < minReasonLength}
        className={cn(
          "focus-ring-strong flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] disabled:opacity-50 sm:flex-none",
          variantClasses[confirmVariant]
        )}
      >
        {isPending && (
          <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {confirmLabel}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        title={title}
        description={description}
        onClose={handleRequestClose}
        footer={footer}
        contentClassName="pt-4"
        panelClassName="max-h-[90dvh]"
      >
        {content}
      </BottomSheet>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
        aria-describedby="admin-action-description"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                id="admin-action-title"
                className="text-xl font-bold text-primary"
              >
                {title}
              </h3>
              <p
                id="admin-action-description"
                className="mt-2 text-sm leading-relaxed text-muted"
              >
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isPending}
              aria-label="관리자 액션 모달 닫기"
              className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-50"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
          {content}
        </div>

        <div className="shrink-0 border-t border-border-subtle bg-surface px-6 py-4">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
}
