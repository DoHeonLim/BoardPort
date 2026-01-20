/**
 * File Name : features/post/components/postComment/PostCommentDeleteButton.tsx
 * Description : 댓글 삭제 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.01  임도헌   Created
 * 2024.11.06  임도헌   Modified  댓글 삭제 기능 추가
 * 2024.11.23  임도헌   Modified  삭제 버튼 접근성 추가
 * 2024.11.25  임도헌   Modified  삭제 버튼 디자인 변경
 * 2024.12.25  임도헌   Modified  삭제 버튼 토스트 메시지 추가
 * 2025.05.08  임도헌   Modified  댓글 삭제 모달 추가
 * 2025.07.12  임도헌   Modified  버튼 비활성화 추가, UX 개선
 * 2026.01.13  임도헌   Modified  [UI] ConfirmDialog로 모달 교체 및 스타일 통일
 * 2026.01.16  임도헌   Renamed   CommentDeleteButton -> PostCommentDeleteButton
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { useState } from "react";
import { usePostCommentContext } from "@/features/post/components/postComment/PostCommentContext";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toast } from "sonner";
import { TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function PostCommentDeleteButton({
  commentId,
}: {
  commentId: number;
}) {
  const { deleteComment } = usePostCommentContext();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteComment(commentId);
      setIsConfirmOpen(false);
      toast.success("댓글을 삭제했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("삭제 중 오류가 발생했습니다.");
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
        description="이 댓글을 정말 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={isDeleting}
      />
    </>
  );
}
