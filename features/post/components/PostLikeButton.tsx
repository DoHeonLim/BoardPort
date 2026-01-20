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
 */
"use client";

import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { useOptimistic, startTransition } from "react";
import { toast } from "sonner";
import { dislikePost, likePost } from "@/app/posts/[id]/actions/likes";
import { cn } from "@/lib/utils";

interface ILikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  postId: number;
}

export default function PostLikeButton({
  isLiked,
  likeCount,
  postId,
}: ILikeButtonProps) {
  const [state, reducerFn] = useOptimistic(
    { isLiked, likeCount },
    (previousState) => ({
      isLiked: !previousState.isLiked,
      likeCount: previousState.isLiked
        ? previousState.likeCount - 1
        : previousState.likeCount + 1,
    })
  );

  const handleClick = async () => {
    startTransition(() => {
      reducerFn(undefined);
    });

    try {
      if (isLiked) {
        await dislikePost(postId);
      } else {
        await likePost(postId);
        toast.success("좋아요를 눌렀습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-surface-dim",
        state.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500"
      )}
      aria-label={state.isLiked ? "좋아요 취소" : "좋아요"}
      aria-pressed={state.isLiked}
    >
      {state.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-sm font-medium">{state.likeCount}</span>
    </button>
  );
}
