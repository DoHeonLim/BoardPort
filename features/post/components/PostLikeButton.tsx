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
 */
"use client";

import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { dislikePost, likePost } from "@/features/post/actions/likes";
import { cn } from "@/lib/utils";

interface ILikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  postId: number;
}

/**
 * 좋아요 버튼 컴포넌트
 * - `useOptimistic`을 사용하여 즉각적인 UI 피드백을 제공
 * - `useTransition`으로 중복 요청을 방지
 * - 실패 시 자동으로 롤백
 */
export default function PostLikeButton({
  isLiked,
  likeCount,
  postId,
}: ILikeButtonProps) {
  const [optimisticState, setOptimisticState] = useOptimistic(
    { isLiked, likeCount },
    (state, newIsLiked: boolean) => ({
      isLiked: newIsLiked,
      likeCount: newIsLiked ? state.likeCount + 1 : state.likeCount - 1,
    })
  );

  const [isPending, startTransition] = useTransition();

  const handleClick = async () => {
    // 트랜잭션 진행 중 중복 클릭 방지
    if (isPending) return;

    // 1. 낙관적 업데이트를 위한 다음 상태
    const nextIsLiked = !optimisticState.isLiked;

    // 2. startTransition으로 UI 업데이트와 서버 액션 래핑
    startTransition(async () => {
      // 2-1. UI를 즉시 업데이트
      setOptimisticState(nextIsLiked);

      try {
        // 2-2. 서버 액션 호출
        // 현재 '좋아요' 상태이므로 '싫어요' 액션 호출
        if (nextIsLiked) await likePost(postId);
        // 현재 '싫어요' 상태이므로 '좋아요' 액션 호출
        else await dislikePost(postId);
      } catch (error) {
        // 2-3. 서버 액션 실패 시 롤백 (useOptimistic이 자동으로 처리하지만, 명시적 에러 메시지)
        console.error("Like action failed:", error);
        toast.error("좋아요 처리에 실패했습니다.");
        // 실패 시 React가 자동으로 state를 롤백함
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      // isPending 상태를 사용하여 버튼 비활성화 (피드백 향상)
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 transition-all p-1.5 -ml-1.5 rounded-lg hover:bg-surface-dim",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        optimisticState.isLiked
          ? "text-rose-500"
          : "text-muted hover:text-rose-500"
      )}
      aria-label={optimisticState.isLiked ? "좋아요 취소" : "좋아요"}
      aria-pressed={optimisticState.isLiked}
    >
      {optimisticState.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-sm font-medium">{optimisticState.likeCount}</span>
    </button>
  );
}
