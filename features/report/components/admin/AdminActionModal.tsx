/**
 * File Name : features/report/components/admin/AdminActionModal.tsx
 * Description : 관리자 전용 공용 액션 모달 (사유 입력 + 확정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   ReportActionDialog를 범용화하여 통합
 * 2026.02.08  임도헌   Modified  정지 기간 선택 옵션(showBanOptions) 추가
 */

"use client";

import { useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

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
 * 4. Audit Log 기록을 위한 필수 메타데이터 확보
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

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setReason("");
      setBanDuration(0);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (reason.trim().length < minReasonLength) return;
    startTransition(async () => {
      // banDuration은 showBanOptions가 true일 때만 유의미함
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
      "bg-brand dark:bg-brand-light text-white dark:text-gray-900 hover:opacity-90",
    danger: "bg-danger text-white hover:bg-red-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border animate-fade-in">
        <h3 className="text-xl font-bold text-primary">{title}</h3>
        <p className="text-sm text-muted mt-2 mb-6 leading-relaxed">
          {description}
        </p>

        <div className="space-y-4">
          {showBanOptions && (
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">
                정지 기간
              </label>
              <Select
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
            <label className="text-xs font-bold text-muted uppercase tracking-wider">
              사유 입력 <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              placeholder={placeholder}
              className="input-primary w-full h-32 p-4 text-sm resize-none bg-surface-dim border-none focus:ring-brand"
            />
            <p className="text-[10px] text-right text-muted">
              {reason.length} / {minReasonLength}자 이상
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={isPending}
            className="btn-secondary flex-1 sm:flex-none border-transparent bg-surface-dim text-muted hover:text-primary"
          >
            취소
          </button>

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
              "px-6 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2",
              variantClasses[confirmVariant]
            )}
          >
            {isPending && (
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
