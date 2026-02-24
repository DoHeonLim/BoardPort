/**
 * File Name : features/report/components/admin/ReportActionDialog.tsx
 * Description : 신고 처리 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created
 */
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateReportAction } from "@/features/report/actions/admin";

interface ReportActionDialogProps {
  reportId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: (id: number, status: string, comment: string) => void;
}

/**
 * 신고 처리(조치) 다이얼로그
 *
 * [기능]
 * 1. 신고 상세 내용에 대한 관리자 코멘트 입력
 * 2. '조치 완료(승인)' 또는 '기각' 버튼을 통해 상태 변경 요청
 * 3. 처리 성공 시 상위 리스트 상태를 낙관적으로 업데이트
 */
export default function ReportActionDialog({
  reportId,
  open,
  onClose,
  onSuccess,
}: ReportActionDialogProps) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleAction = (status: "RESOLVED" | "DISMISSED") => {
    startTransition(async () => {
      const res = await updateReportAction(reportId, status, comment);
      if (res.success) {
        toast.success(
          status === "RESOLVED"
            ? "신고를 승인(조치)했습니다."
            : "신고를 기각했습니다."
        );
        onSuccess(reportId, status, comment);
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border animate-fade-in">
        <h3 className="text-lg font-bold text-primary mb-2">신고 처리</h3>
        <p className="text-sm text-muted mb-4">
          조치 내용이나 기각 사유를 입력하세요.
        </p>

        <textarea
          className="input-primary w-full h-32 p-4 text-sm resize-none mb-6 bg-surface-dim border-none"
          placeholder="처리 내용을 입력하세요..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isPending}
            className="btn-secondary h-10 text-sm border-transparent bg-surface-dim text-muted hover:text-primary"
          >
            취소
          </button>
          <button
            onClick={() => handleAction("DISMISSED")}
            disabled={isPending}
            className="btn-secondary h-10 text-sm border-border text-primary"
          >
            기각
          </button>
          <button
            onClick={() => handleAction("RESOLVED")}
            disabled={isPending}
            className="btn-primary h-10 text-sm"
          >
            {isPending ? "처리 중..." : "조치 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
