/**
 * File Name : features/post/hooks/useDeletePostCommentMutation.ts
 * Description : 게시글 댓글 삭제 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   usePostComment에서 Delete 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteCommentAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 게시글 댓글 삭제 전용 Mutation 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `deleteCommentAction` 서버 액션을 호출하여 특정 댓글 삭제 처리
 * - 성공 시 `onSuccess`에서 관련 쿼리 키를 무효화(invalidateQueries)하여 UI 상태 최신화 적용
 * - 에러 발생 시 `onError`를 통한 토스트 알림 처리
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
      toast.success("🗑️ 댓글 삭제 완료");
      // 삭제 성공 시 해당 게시글의 댓글 캐시를 무효화
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error("댓글 삭제에 실패했습니다.");
    },
  });
}
