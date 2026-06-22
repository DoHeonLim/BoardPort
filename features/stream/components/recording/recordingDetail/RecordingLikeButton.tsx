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
 * 2026.04.17  임도헌   Modified  녹화본 상세 좋아요 버튼의 낙관 업데이트와 접근성 이름 책임 설명 보강
 * 2026.05.18  임도헌   Modified  녹화본 상세 좋아요 변경 시 메인/채널 다시보기 목록 캐시 동기화 추가
 * 2026.05.26  임도헌   Modified  initialData 기반 likeStatus query에 local queryFn을 부여하고 목록 캐시만 재검증
 * 2026.06.07  임도헌   Modified  계정 전환 시 이전 사용자의 VOD 좋아요 캐시가 재사용되지 않도록 viewer scope 추가
 * 2026.06.17  임도헌   Modified  낙관 반영 직후 좋아요 버튼이 흐려 보이지 않도록 pending opacity 제거
 */

"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  likeRecording,
  dislikeRecording,
} from "@/features/stream/actions/likes";
import { queryKeys } from "@/lib/queryKeys";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cancelRecordingListQueries,
  getRecordingListSnapshots,
  invalidateRecordingListCaches,
  restoreRecordingListSnapshots,
  updateRecordingListCaches,
} from "@/features/stream/utils/recordingListCache";

interface RecordingLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  vodId: number;
  viewerId: number;
}

/**
 * 녹화본(VOD) 좋아요 버튼 컴포넌트
 *
 * [기능]
 * - 부모로부터 주입된 초기값(`initialIsLiked`, `initialLikeCount`)을 `useQuery`의 `initialData`로 설정하여 서버 상태 동기화(Hydration) 구성
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 상태 반전 및 피드백 제공
 * - 상세에서 좋아요를 바꾼 뒤 뒤로가도 목록 카드의 좋아요 수와 하트 상태가 유지되도록 다시보기 목록 캐시도 함께 갱신
 * - API 요청 에러 발생 시 `onError`에서 캡처된 이전 상태 스냅샷(`previous`)으로 안전한 롤백(Rollback) 처리
 * - `onSettled` 시점 관련 쿼리 무효화(invalidateQueries)를 통한 서버 데이터와의 최종 정합성 보장
 * - 버튼 본문은 숫자만 노출하고, 스크린리더 이름은 `aria-label`로 분리해 상세 페이지 액션 의미를 명확히 전달
 */
export default function RecordingLikeButton({
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
  vodId,
  viewerId,
}: RecordingLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.streams.likeStatus(vodId, viewerId);
  const initialLikeStatus = {
    isLiked: initialIsLiked,
    likeCount: initialLikeCount,
  };

  // 1. 상태 하이드레이션
  const { data } = useQuery({
    queryKey,
    queryFn: async () =>
      queryClient.getQueryData<typeof initialLikeStatus>(queryKey) ??
      initialLikeStatus,
    initialData: initialLikeStatus,
    staleTime: Infinity,
    enabled: false,
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
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        cancelRecordingListQueries(queryClient),
      ]);
      const previous = queryClient.getQueryData(queryKey);
      const previousRecordingLists = getRecordingListSnapshots(queryClient);

      const nextState = {
        isLiked: !data.isLiked,
        likeCount: data.isLiked
          ? Math.max(0, data.likeCount - 1)
          : data.likeCount + 1,
      };

      queryClient.setQueryData(queryKey, nextState);

      // 상세에서 좋아요를 바꾼 뒤 뒤로갈 때 이전 목록 캐시도 같은 상태를 보여주도록 동기화
      updateRecordingListCaches(queryClient, vodId, () => nextState);

      return { previous, previousRecordingLists };
    },
    onError: (err, _variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("좋아요 처리에 실패했습니다.");
      queryClient.setQueryData(queryKey, context?.previous);
      restoreRecordingListSnapshots(queryClient, context?.previousRecordingLists);
    },
    onSettled: () => {
      invalidateRecordingListCaches(queryClient);
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "focus-ring-soft -ml-1.5 flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-surface-dim",
        data.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500",
        isPending && "cursor-not-allowed"
      )}
      aria-busy={isPending}
      aria-pressed={data.isLiked}
      // 시각 카운트의 접근성 이름 포함을 통한 보조기기/시각 정보 불일치 방지
      aria-label={
        data.isLiked
          ? `좋아요 취소, 현재 ${data.likeCount}개`
          : `좋아요, 현재 ${data.likeCount}개`
      }
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
