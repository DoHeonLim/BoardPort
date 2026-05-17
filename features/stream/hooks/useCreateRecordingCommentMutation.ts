/**
 * File Name : features/stream/hooks/useCreateRecordingCommentMutation.ts
 * Description : 녹화본 댓글 생성 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   useRecordingComment에서 Create 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.03  임도헌   Modified  댓글 작성 성공 토스트를 게시글 댓글과 같은 문법으로 통일
 * 2026.04.09  임도헌   Modified  성공 결과가 화면에 바로 드러나는 댓글 작성은 실패 토스트만 남기도록 정리
 * 2026.05.16  임도헌   Modified  Mutation 에러 메시지 추출을 unknown-safe 방식으로 정리
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRecordingComment } from "@/features/stream/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

/**
 * 녹화본 댓글 생성 전용 Mutation 훅
 *
 * [기능]
 * - `createRecordingComment` 서버 액션을 호출해 댓글 생성을 처리
 * - 성공 시 녹화본 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 실패 시 상태 코드별 토스트 알림으로 사용자 피드백을 제공
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
      // 등록 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => {
      console.error(err);
      const msg = getErrorMessage(err);
      if (msg === "NOT_LOGGED_IN") toast.error("로그인이 필요합니다.");
      else if (msg === "VALIDATION_FAILED")
        toast.error("입력값을 확인해 주세요.");
      else toast.error("댓글 작성에 실패했습니다.");
    },
  });
}
