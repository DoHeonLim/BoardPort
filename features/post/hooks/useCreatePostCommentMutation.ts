/**
 * File Name : features/post/hooks/useCreatePostCommentMutation.ts
 * Description : 게시글 댓글 생성 전용 훅 (CQRS Mutation 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   usePostComment에서 Create 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.03  임도헌   Modified  댓글 작성 성공 토스트를 녹화 댓글과 같은 문법으로 통일
 * 2026.04.09  임도헌   Modified  성공 결과가 화면에 바로 드러나는 댓글 작성은 실패 토스트만 남기도록 정리
 * 2026.05.18  임도헌   Modified  댓글 작성 시 상세 메타와 목록 카드 댓글 수 캐시 동기화 추가
 */
"use client";

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { createCommentAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";
import type { PostsPage } from "@/features/post/types";

/**
 * 게시글 댓글 생성 전용 Mutation 훅
 *
 * [기능]
 * - `createCommentAction` 서버 액션을 호출해 댓글 생성을 처리
 * - 성공 시 댓글 목록 쿼리를 무효화해 최신 목록을 다시 읽음
 * - 상세 메타와 목록 카드 댓글 수를 낙관적으로 갱신해 상세/뒤로가기 흐름의 체감 지연을 줄임
 * - 실패 시 토스트 알림으로 사용자 피드백을 제공
 *
 * @param {number} postId - 댓글을 작성할 게시글 ID
 */
export function useCreatePostCommentMutation(postId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.posts.comments(postId);
  const statsQueryKey = queryKeys.posts.stats(postId);

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await createCommentAction(formData);
      if (!res.success) throw new Error(res.error);
      return res;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.lists() });

      const previousStats = queryClient.getQueryData(statsQueryKey);
      const previousLists = queryClient.getQueriesData<InfiniteData<PostsPage>>({
        queryKey: queryKeys.posts.lists(),
      });

      queryClient.setQueryData(
        statsQueryKey,
        (oldData: { commentCount: number } | undefined) => ({
          commentCount: (oldData?.commentCount ?? 0) + 1,
        })
      );
      queryClient.setQueriesData<InfiniteData<PostsPage>>(
        { queryKey: queryKeys.posts.lists() },
        (oldData) =>
          oldData
            ? {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  posts: page.posts.map((post) =>
                    post.id === postId
                      ? {
                          ...post,
                          _count: {
                            ...post._count,
                            comments: post._count.comments + 1,
                          },
                        }
                      : post
                  ),
                })),
              }
            : oldData
      );

      return { previousStats, previousLists };
    },
    onSuccess: () => {
      // 등록 직후 최신 댓글 목록 재조회
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err, _variables, context) => {
      console.error(err);
      queryClient.setQueryData(statsQueryKey, context?.previousStats);
      context?.previousLists.forEach(([listQueryKey, listData]) => {
        queryClient.setQueryData(listQueryKey, listData);
      });
      toast.error("댓글 작성에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}
