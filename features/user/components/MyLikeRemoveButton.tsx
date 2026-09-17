/**
 * File Name : features/user/components/MyLikeRemoveButton.tsx
 * Description : 게시글·다시보기 관심 목록 빠른 해제 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   낙관적 빠른 해제와 소형 휴지통 액션 구현
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { dislikePost } from "@/features/post/actions/likes";
import { dislikeRecording } from "@/features/stream/actions/likes";
import { queryKeys } from "@/lib/queryKeys";
import type {
  LikedPostsPage,
  LikedRecordingsPage,
} from "@/features/user/types";

type MyLikeRemoveButtonProps = {
  type: "posts" | "recordings";
  id: number;
  userId: number;
  onRemoved: () => void;
  onRestore: () => void;
};

/** 현재 찜 목록에서 항목을 먼저 제거하고 실패 시 이전 캐시 복원 */
export default function MyLikeRemoveButton({
  type,
  id,
  userId,
  onRemoved,
  onRestore,
}: MyLikeRemoveButtonProps) {
  const queryClient = useQueryClient();
  const queryKey =
    type === "posts"
      ? queryKeys.posts.liked(userId)
      : queryKeys.streams.likedRecordings(userId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === "posts") {
        await dislikePost(id);
        return;
      }
      const result = await dislikeRecording(id);
      if (!result.success) throw new Error(result.error);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      if (type === "posts") {
        queryClient.setQueryData(
          queryKey,
          (old: { pages: LikedPostsPage[] } | undefined) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    posts: page.posts.filter((post) => post.id !== id),
                  })),
                }
              : old
        );
      } else {
        queryClient.setQueryData(
          queryKey,
          (old: { pages: LikedRecordingsPage[] } | undefined) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    recordings: page.recordings.filter(
                      (recording) => recording.vodId !== id
                    ),
                  })),
                }
              : old
        );
      }
      onRemoved();
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      onRestore();
      toast.error("찜 해제에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      if (type === "posts") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.posts.likeStatus(id, userId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
      } else {
        queryClient.invalidateQueries({
          queryKey: queryKeys.streams.likeStatus(id, userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.streams.recordingLists(),
        });
      }
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-busy={mutation.isPending}
      aria-label="찜 해제"
      title="찜 해제"
      className="focus-ring-soft inline-flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface text-muted shadow-md transition-[background-color,color,border-color,box-shadow] hover:border-danger/40 hover:bg-surface-dim hover:text-danger disabled:cursor-not-allowed"
    >
      <TrashIcon className="size-4" aria-hidden="true" />
    </button>
  );
}
