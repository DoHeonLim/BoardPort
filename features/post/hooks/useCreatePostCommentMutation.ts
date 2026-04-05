/**
 * File Name : features/post/hooks/useCreatePostCommentMutation.ts
 * Description : 게시글 댓글 생성 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   usePostComment에서 Create 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.03  임도헌   Modified  댓글 작성 성공 토스트를 녹화 댓글과 같은 문법으로 통일
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCommentAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 게시글 댓글 생성 전용 Mutation 훅
 *
 * [기능]
 * - `createCommentAction` 서버 액션을 호출해 댓글 생성을 처리
 * - 성공 시 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 실패 시 토스트 알림으로 사용자 피드백을 제공
 *
 * @param {number} postId - 댓글을 작성할 게시글 ID
 */
export function useCreatePostCommentMutation(postId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.posts.comments(postId);

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await createCommentAction(formData);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("댓글을 작성했습니다.");
      // 등록 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error("댓글 작성에 실패했습니다.");
    },
  });
}
