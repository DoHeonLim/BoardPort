/**
 * File Name : features/stream/hooks/useDeleteRecordingCommentMutation.ts
 * Description : 녹화본 댓글 삭제 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   useRecordingComment에서 Delete 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.03  임도헌   Modified  댓글 삭제 성공 토스트를 게시글 댓글과 같은 문법으로 통일
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteRecordingComment } from "@/features/stream/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 녹화본 댓글 삭제 전용 Mutation 훅
 *
 * [기능]
 * - `deleteRecordingComment` 서버 액션을 호출해 댓글 삭제를 처리
 * - 성공 시 녹화본 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 실패 시 상태 코드별 토스트 알림으로 사용자 피드백을 제공
 *
 * @param {number} vodId - 대상 녹화본(VOD) ID
 */
export function useDeleteRecordingCommentMutation(vodId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.streams.vodComments(vodId);

  return useMutation({
    mutationFn: async (commentId: number) => {
      const res = await deleteRecordingComment(commentId);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("댓글을 삭제했습니다.");
      // 삭제 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      console.error(err);
      const msg = err.message;
      if (msg === "NOT_LOGGED_IN") toast.error("로그인이 필요합니다.");
      else if (msg === "FORBIDDEN")
        toast.error("본인 댓글만 삭제할 수 있습니다.");
      else if (msg === "NOT_FOUND") toast.error("이미 삭제된 댓글입니다.");
      else toast.error("댓글 삭제에 실패했습니다.");
    },
  });
}
