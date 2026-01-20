/**
 * File Name : features/stream/components/recording/recordingComment/RecordingCommentDeleteButton.tsx
 * Description : 녹화본 댓글 삭제 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.19  임도헌   Created
 * 2024.11.19  임도헌   Modified  스트리밍 삭제 버튼 추가
 * 2025.05.16  임도헌   Modified  status props 추가
 * 2025.07.31  임도헌   Modified  DeleteResponse 추가
 * 2025.08.05  임도헌   Modified  Post 방식에 맞춰 토스트/아이콘/모달 삭제 처리
 * 2025.08.23  임도헌   Modified  상태 비교를 CONNECTED로 통일(소문자 불일치 수정)
 * 2025.09.09  임도헌   Move      StreamDeleteButton에서 RecordingCommentDeleteButton으로 이동동
 * 2025.09.09  임도헌   Modified  ConfirmDialog/sonner 적용, 중복 클릭 방지, a11y 보강
 * 2026.01.14  임도헌   Modified  ConfirmDialog 적용 및 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useState } from "react";
import { useRecordingCommentContext } from "@/features/stream/components/recording/recordingComment/RecordingCommentContext";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RecordingCommentDeleteButton({
  commentId,
}: {
  commentId: number;
}) {
  const { deleteComment } = useRecordingCommentContext();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteComment(commentId);
      setIsConfirmOpen(false);
      toast.success("댓글을 삭제했습니다.");
    } catch {
      toast.error("삭제 실패");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        disabled={isDeleting}
        aria-label="댓글 삭제"
        onClick={() => setIsConfirmOpen(true)}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          "text-muted hover:text-danger hover:bg-danger/10",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <TrashIcon className="size-4" />
      </button>

      <ConfirmDialog
        open={isConfirmOpen}
        title="댓글 삭제"
        description="이 댓글을 정말 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={isDeleting}
      />
    </>
  );
}
