/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingLikeButton.tsx
 * Description : 스트리밍 녹화본(VodAsset) 좋아요 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.07  임도헌   Created   post 방식 기반 녹화본 좋아요 버튼 컴포넌트 구현
 * 2025.09.10  임도헌   Modified  useOptimistic 제거 → 로컬 상태 + 낙관 업데이트
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환(streamId → vodId)
 * 2026.01.14  임도헌   Modified  [UI] PostLikeButton과 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.03.01  임도헌   Modified  React useOptimistic 제거 및 TanStack Query useMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  likeRecording,
  dislikeRecording,
} from "@/features/stream/actions/likes";
import { queryKeys } from "@/lib/queryKeys";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecordingLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  vodId: number;
}

/**
 * 녹화본(VOD) 좋아요 버튼 컴포넌트
 *
 * [상태 주입 및 캐시 제어 로직]
 * - 부모로부터 주입된 초기값(`initialIsLiked`, `initialLikeCount`)을 `useQuery`의 `initialData`로 설정하여 서버 상태 동기화(Hydration) 구성
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 상태 반전 및 피드백 제공
 * - API 요청 에러 발생 시 `onError`에서 캡처된 이전 상태 스냅샷(`previous`)으로 안전한 롤백(Rollback) 처리
 * - `onSettled` 시점 관련 쿼리 무효화(invalidateQueries)를 통한 서버 데이터와의 최종 정합성 보장
 */
export default function RecordingLikeButton({
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
  vodId,
}: RecordingLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.streams.likeStatus(vodId);

  // 1. 상태 하이드레이션
  const { data } = useQuery({
    queryKey,
    initialData: { isLiked: initialIsLiked, likeCount: initialLikeCount },
    staleTime: Infinity,
  });

  // 2. 상태 변경 (Mutation)
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // 서버 액션 호출 (이들은 성공/실패 여부를 객체로 리턴하므로 여기서 에러를 던져야 onError가 탐지)
      const res = data.isLiked
        ? await dislikeRecording(vodId)
        : await likeRecording(vodId);
      if (res && !res.success) throw new Error(res.error);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, {
        isLiked: !data.isLiked,
        likeCount: data.isLiked
          ? Math.max(0, data.likeCount - 1)
          : data.likeCount + 1,
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("좋아요 처리에 실패했습니다.");
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <button
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-lg transition-colors hover:bg-surface-dim",
        data.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500",
        isPending && "opacity-70 cursor-not-allowed"
      )}
      aria-label={data.isLiked ? "좋아요 취소" : "좋아요"}
    >
      {data.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-sm font-medium">{data.likeCount}</span>
    </button>
  );
}
