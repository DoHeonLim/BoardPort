/**
 * File Name : features/post/components/PostDeleteButton.tsx
 * Description : 게시글 삭제 버튼 (ConfirmDialog 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   게시글 수정 화면 삭제 액션을 ConfirmDialog 기반으로 분리
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { deletePostAction } from "@/features/post/actions/delete";

interface PostDeleteButtonProps {
  postId: number;
}

export default function PostDeleteButton({ postId }: PostDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deletePostAction(postId);

        if (!result.success) {
          toast.error(result.error ?? "게시글 삭제에 실패했습니다.");
          return;
        }

        toast.success("게시글이 삭제되었습니다.");
        setConfirmOpen(false);
        router.replace("/posts");
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("게시글 삭제 중 오류가 발생했습니다.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="w-full mx-5 h-11 rounded-xl bg-danger/10 text-danger text-sm font-semibold transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "삭제 중..." : "삭제하기"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="게시글을 삭제할까요?"
        description="삭제한 게시글은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isPending}
      />
    </>
  );
}
