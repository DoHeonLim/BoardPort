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
 * 2026.04.09  임도헌   Modified  성공 결과가 화면에 바로 드러나는 댓글 삭제는 실패 토스트만 남기도록 정리
 * 2026.05.16  임도헌   Modified  Mutation 에러 메시지 추출을 unknown-safe 방식으로 정리
 * 2026.05.18  임도헌   Modified  댓글 삭제 시 다시보기 목록 카드 commentCount 캐시 동기화 추가
 * 2026.08.13  임도헌   Modified  목록 낙관 업데이트/롤백/무효화를 현재 조회자로 제한
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteRecordingComment } from "@/features/stream/actions/comments";
import { queryKeys } from "@/lib/queryKeys";
import {
  cancelRecordingListQueries,
  getRecordingListSnapshots,
  invalidateRecordingListCaches,
  restoreRecordingListSnapshots,
  updateRecordingListCaches,
} from "@/features/stream/utils/recordingListCache";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

/**
 * 녹화본 댓글 삭제 전용 Mutation 훅
 *
 * [기능]
 * - `deleteRecordingComment` 서버 액션을 호출해 댓글 삭제를 처리
 * - 성공 시 녹화본 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 상세에서 댓글을 삭제한 뒤 뒤로갈 때 다시보기 카드 댓글 수가 즉시 맞도록 목록 캐시를 함께 갱신
 * - 실패 시 상태 코드별 토스트 알림으로 사용자 피드백을 제공
 *
 * @param {number} vodId - 대상 녹화본(VOD) ID
 * @param {number} viewerId - 댓글 필터 기준 조회자 ID
 */
export function useDeleteRecordingCommentMutation(
  vodId: number,
  viewerId: number
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.streams.vodComments(vodId, viewerId);
  const statsQueryKey = queryKeys.streams.recordingStats(vodId);

  return useMutation({
    mutationFn: async (commentId: number) => {
      const res = await deleteRecordingComment(commentId);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onMutate: async () => {
      await cancelRecordingListQueries(queryClient, viewerId);
      const previousRecordingLists = getRecordingListSnapshots(
        queryClient,
        viewerId
      );
      const previousStats = queryClient.getQueryData(statsQueryKey);

      // 삭제 낙관 업데이트는 0 아래로 내려가지 않도록 보정
      updateRecordingListCaches(
        queryClient,
        vodId,
        (recording) => ({
          commentCount: Math.max(0, (recording.commentCount ?? 0) - 1),
        }),
        viewerId
      );
      queryClient.setQueryData(
        statsQueryKey,
        (oldData: { commentCount: number } | undefined) => ({
          commentCount: Math.max(0, (oldData?.commentCount ?? 0) - 1),
        })
      );

      return { previousRecordingLists, previousStats };
    },
    onSuccess: () => {
      // 삭제 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown, _variables, context) => {
      console.error(err);
      restoreRecordingListSnapshots(queryClient, context?.previousRecordingLists);
      queryClient.setQueryData(statsQueryKey, context?.previousStats);
      const msg = getErrorMessage(err);
      if (msg === "NOT_LOGGED_IN") toast.error("로그인이 필요합니다.");
      else if (msg === "FORBIDDEN")
        toast.error("본인 댓글만 삭제할 수 있습니다.");
      else if (msg === "NOT_FOUND") toast.error("이미 삭제된 댓글입니다.");
      else toast.error("댓글 삭제에 실패했습니다.");
    },
    onSettled: () => {
      invalidateRecordingListCaches(queryClient, viewerId);
    },
  });
}
