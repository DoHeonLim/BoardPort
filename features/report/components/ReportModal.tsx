/**
 * File Name : features/report/components/ReportModal.tsx
 * Description : 모든 도메인 공용 신고 모달 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   라디오 버튼 기반 신고 사유 선택 및 제출 UI 구현
 * 2026.02.20  임도헌   Modified  레이아웃에서 모달 위치가 깨지지 않도록 createPortal 적용
 */
"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { submitReportAction } from "@/features/report/actions/create";
import {
  REPORT_REASON_LABELS,
  type ReportTargetType,
} from "@/features/report/constants";
import { ReportReason } from "@/generated/prisma/client";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: number;
  targetType: ReportTargetType;
}

/**
 * 신고 접수 모달
 * - 도메인 전반에서 공통으로 사용되는 신고 UI
 * - 사유 선택(Radio) 및 상세 내용 입력 후 제출 처리
 *
 * @param isOpen - 모달 열림 여부
 * @param onClose - 모달 닫기 핸들러
 * @param targetId - 신고 대상 ID
 * @param targetType - 신고 대상 타입
 */
export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  // SSR 환경 대응 (마운트 여부 확인)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDescription("");
    } else {
      // 열렸을 때 배경 스크롤 방지
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = () => {
    if (!reason) {
      toast.error("신고 사유를 선택해주세요.");
      return;
    }

    startTransition(async () => {
      const res = await submitReportAction({
        targetId,
        targetType,
        reason: reason as ReportReason,
        description,
      });

      if (res.success) {
        toast.success(
          "신고가 정상적으로 접수되었습니다. 깨끗한 바다를 만들어주셔서 감사합니다! ⚓"
        );
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Background Click to Close */}
      <div
        className="absolute inset-0"
        onClick={() => !isPending && onClose()}
      />

      <div
        className="relative bg-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim/30">
          <h2
            id="report-modal-title"
            className="font-bold text-primary text-lg"
          >
            신고하기
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* body */}
        <div className="p-6 flex flex-col gap-6">
          <div>
            <label className="text-sm font-bold text-primary mb-3 block">
              신고 사유
            </label>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
              {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map(
                (r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all",
                      reason === r
                        ? "bg-brand/5 border-brand/50 text-brand dark:text-brand-light"
                        : "bg-surface border-border text-muted hover:bg-surface-dim"
                    )}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) =>
                        setReason(e.target.value as ReportReason)
                      }
                      className="size-4 text-brand focus:ring-brand border-border"
                      disabled={isPending}
                    />
                    <span className="text-sm font-semibold">
                      {REPORT_REASON_LABELS[r]}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-primary mb-2 block">
              상세 설명{" "}
              <span className="font-normal text-muted text-xs">(선택)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="내용을 입력하세요..."
              className="input-primary min-h-[100px] p-4 text-sm bg-surface-dim border-none resize-none"
              maxLength={500}
              disabled={isPending}
            />
          </div>
        </div>

        {/* footer */}
        <div className="p-4 border-t border-border bg-surface-dim/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary h-11 px-6 border-transparent"
            disabled={isPending}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary h-11 px-8"
            disabled={isPending || !reason}
          >
            {isPending ? "접수 중..." : "신고하기"}
          </button>
        </div>
      </div>
    </div>
  );

  // createPortal 적용으로 z-index 충돌 방지
  return createPortal(modalContent, document.body);
}
