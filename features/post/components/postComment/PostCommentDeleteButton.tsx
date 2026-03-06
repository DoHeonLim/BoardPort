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
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified  Context 참조 제거 및 useDeletePostCommentMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useDeletePostCommentMutation } from "../../hooks/useDeletePostCommentMutation";

/**
 * 댓글 삭제 버튼 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - `useDeletePostCommentMutation` 훅을 호출하여 서버 측 삭제 로직 실행
 * - 버튼 클릭 시 `ConfirmDialog`를 통한 명시적 삭제 재확인 절차 제공
 * - 비동기 처리 중 버튼 비활성화(isPending) 상태 제어
 */
export default function PostCommentDeleteButton({
  postId,
  commentId,
}: {
  postId: number;
  commentId: number;
}) {
  const { mutateAsync: deleteComment, isPending } =
    useDeletePostCommentMutation(postId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteComment(commentId);
      setIsConfirmOpen(false);
    } catch {
      // 에러 핸들링 및 토스트는 Mutation 내부에서 처리
    }
  };

  return (
    <>
      <button
        disabled={isPending}
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
        loading={isPending}
      />
    </>
  );
}
