/**
 * File Name : features/stream/hooks/useCreateRecordingCommentMutation.ts
 * Description : 녹화본 댓글 생성 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   useRecordingComment에서 Create 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRecordingComment } from "@/features/stream/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 녹화본 댓글 생성 전용 Mutation 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `createRecordingComment` 서버 액션을 호출하여 댓글 생성 처리
 * - 성공 시 해당 녹화본 댓글 쿼리 캐시를 무효화(invalidateQueries)하여 목록 최신화 적용
 * - 에러 발생 시 상태 코드(NOT_LOGGED_IN 등)별 사용자 토스트 알림 처리
 *
 * @param {number} vodId - 대상 녹화본(VOD) ID
 */
export function useCreateRecordingCommentMutation(vodId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.streams.vodComments(vodId);

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await createRecordingComment(formData);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("💬 댓글 작성 완료");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      console.error(err);
      const msg = err.message;
      if (msg === "NOT_LOGGED_IN") toast.error("로그인이 필요합니다.");
      else if (msg === "VALIDATION_FAILED")
        toast.error("입력값을 확인해 주세요.");
      else toast.error("댓글 작성에 실패했습니다.");
    },
  });
}
