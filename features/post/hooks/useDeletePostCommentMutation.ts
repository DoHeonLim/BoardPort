/**
 * File Name : features/post/hooks/useDeletePostCommentMutation.ts
 * Description : 게시글 댓글 삭제 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   usePostComment에서 Delete 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.03  임도헌   Modified  댓글 삭제 성공 토스트를 녹화 댓글과 같은 문법으로 통일
 * 2026.04.09  임도헌   Modified  성공 결과가 화면에 바로 드러나는 댓글 삭제는 실패 토스트만 남기도록 정리
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteCommentAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 게시글 댓글 삭제 전용 Mutation 훅
 *
 * [기능]
 * - `deleteCommentAction` 서버 액션을 호출해 댓글 삭제를 처리
 * - 성공 시 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 실패 시 토스트 알림으로 사용자 피드백을 제공
 *
 * @param {number} postId - 삭제할 댓글이 속한 게시글 ID
 */
export function useDeletePostCommentMutation(postId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.posts.comments(postId);

  return useMutation({
    mutationFn: async (commentId: number) => {
      const res = await deleteCommentAction(commentId, postId);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      // 삭제 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error("댓글 삭제에 실패했습니다.");
    },
  });
}
