/**
 * File Name : features/post/components/PostLikeButton.tsx
 * Description : 게시글 좋아요 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.01  임도헌   Created
 * 2024.11.01  임도헌   Modified  좋아요 버튼 추가
 * 2024.11.06  임도헌   Modified  useOptimistic에 payload 사용하지 않아서 삭제
 * 2024.12.18  임도헌   Modified  sm:hidden 추가(모바일 반응형 추가)
 * 2024.12.24  임도헌   Modified  좋아요 버튼 아이콘 변경
 * 2025.05.10  임도헌   Modified  startTransition을 사용한 성능 최적화
 * 2025.07.06  임도헌   Modified  좋아요 함수 import 변경
 * 2026.01.13  임도헌   Modified  [UI] 아이콘 크기 조정 및 시맨틱 컬러 적용
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.22  임도헌   Modified  useTransition 적용, 에러 핸들링 및 롤백 로직 추가
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.01  임도헌   Modified  React useOptimistic 제거 및 TanStack Query useMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  실패 토스트를 구체화해 v1.2 피드백 기준 반영
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dislikePost, likePost } from "@/features/post/actions/likes";
import { queryKeys } from "@/lib/queryKeys";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostLikeButtonProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
}

/**
 * 게시글 좋아요 버튼 컴포넌트
 *
 * [상태 주입 및 캐시 제어 로직]
 * - `initialData`를 통한 초기 렌더링 깜빡임 방지 및 상태 하이드레이션 적용
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 피드백 제공
 * - `onError` 발생 시 `previous` 스냅샷을 활용한 이전 상태 복구(Rollback) 로직 포함
 * - `onSettled` 단계에서 `invalidateQueries` 호출로 서버/클라이언트 데이터 최종 동기화 처리
 */
export default function PostLikeButton({
  postId,
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
}: PostLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.posts.likeStatus(postId);

  // 1. 상태 조회 (초기값 하이드레이션)
  const { data } = useQuery({
    queryKey,
    initialData: { isLiked: initialIsLiked, likeCount: initialLikeCount },
    staleTime: Infinity, // Mutation이 일어나기 전까지 캐시 유지
  });

  // 2. 상태 변경 (Mutation)
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (data.isLiked) await dislikePost(postId);
      else await likePost(postId);
    },
    // Mutate 발생 직후 실행 (낙관적 업데이트)
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      // 롤백을 위한 이전 상태 스냅샷 저장
      const previous = queryClient.getQueryData(queryKey);

      // 캐시 강제 업데이트
      queryClient.setQueryData(queryKey, {
        isLiked: !data.isLiked,
        likeCount: data.isLiked
          ? Math.max(0, data.likeCount - 1)
          : data.likeCount + 1,
      });

      return { previous };
    },
    // 에러 발생 시 이전 상태로 복구
    onError: (err, variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("게시글 좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      queryClient.setQueryData(queryKey, context?.previous);
    },
    // 성공/실패 무관하게 백그라운드 데이터 최신화
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <button
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 transition-all p-1.5 -ml-1.5 rounded-lg hover:bg-surface-dim",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        data.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500"
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
