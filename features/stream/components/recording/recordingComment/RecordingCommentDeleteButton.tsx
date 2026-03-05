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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified  Context 제거 및 useDeleteRecordingCommentMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDeleteRecordingCommentMutation } from "@/features/stream/hooks/useDeleteRecordingCommentMutation";
import { cn } from "@/lib/utils";

/**
 * 녹화본 댓글 삭제 버튼 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - `useDeleteRecordingCommentMutation` 훅을 호출하여 서버 측 삭제 로직 실행
 * - `ConfirmDialog`를 통한 명시적 삭제 재확인 절차 제공
 * - 비동기 처리 중 버튼 비활성화(isPending) 상태 제어
 */
export default function RecordingCommentDeleteButton({
  vodId,
  commentId,
}: {
  vodId: number;
  commentId: number;
}) {
  const { mutateAsync: deleteComment, isPending } =
    useDeleteRecordingCommentMutation(vodId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteComment(commentId);
      setIsConfirmOpen(false);
    } catch {
      // 에러 및 토스트는 훅 내부에서 처리
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
        description="이 댓글을 정말 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={isPending}
      />
    </>
  );
}
