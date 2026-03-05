/**
 * File Name : features/post/hooks/useCreatePostCommentMutation.ts
 * Description : 게시글 댓글 생성 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   usePostComment에서 Create 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCommentAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 게시글 댓글 생성 전용 Mutation 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `createCommentAction` 서버 액션을 호출하여 댓글 생성 처리
 * - 성공 시 `onSuccess`에서 관련 쿼리 키를 무효화(invalidateQueries)하여 최신 댓글 목록 백그라운드 갱신 유도
 * - 에러 발생 시 `onError`를 통한 토스트 알림 처리
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
      toast.success("💬 댓글 작성 완료");
      // 등록 성공 시 해당 게시글의 댓글 캐시를 무효화하여 백그라운드 갱신을 유도
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.error(err);
      toast.error("댓글 작성에 실패했습니다.");
    },
  });
}
