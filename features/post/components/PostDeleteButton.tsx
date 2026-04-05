/**
 * File Name : features/post/components/PostDeleteButton.tsx
 * Description : 게시글 삭제 버튼 (ConfirmDialog 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   게시글 수정 화면 삭제 액션을 ConfirmDialog 기반으로 분리
 * 2026.03.13  임도헌   Modified  삭제 완료 후 returnTo 복귀 경로를 우선 사용하도록 보강
 * 2026.03.18  임도헌   Modified  detail-edit 삭제는 back 복귀를 사용하고 목록 refresh 플래그로 stale list를 1회 보정
 * 2026.04.02  임도헌   Modified  삭제 버튼 컴포넌트 JSDoc 보강
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { deletePostAction } from "@/features/post/actions/delete";
import { setNavigationRefreshFlag } from "@/lib/navigationRefreshFlag";

interface PostDeleteButtonProps {
  postId: number;
  nextHref: string;
  preferHistoryBack?: boolean;
  refreshFlagKey?: string;
}

/**
 * 게시글 삭제 확인과 복귀 경로 처리를 묶는 버튼 컴포넌트
 *
 * @param {PostDeleteButtonProps} props - 삭제 대상 ID와 삭제 후 이동/복귀 전략
 * @returns {JSX.Element} 게시글 삭제 버튼과 확인 다이얼로그
 */
export default function PostDeleteButton({
  postId,
  nextHref,
  preferHistoryBack = false,
  refreshFlagKey,
}: PostDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // detail-edit 삭제는 history를 유지하고, 목록 freshness만 플래그 기반으로 보강
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

        if (preferHistoryBack && typeof window !== "undefined") {
          // history는 back으로 유지하고, 목록 freshness만 세션 플래그로 위임
          if (refreshFlagKey) {
            setNavigationRefreshFlag(refreshFlagKey);
          }
          router.back();
          return;
        }

        router.replace(nextHref);
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
