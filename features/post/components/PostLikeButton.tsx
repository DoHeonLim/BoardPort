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
 * 2026.04.14  임도헌   Modified  좋아요 버튼의 접근성 이름을 시각 레이블과 일치하도록 보강
 * 2026.04.14  임도헌   Modified  게시글 상세 기준으로 좋아요 시각 텍스트를 명시해 Lighthouse 레이블 불일치 가능성을 낮춤
 * 2026.04.14  임도헌   Modified  별도 aria-labelledby 없이 버튼 본문 텍스트를 그대로 이름으로 사용하도록 단순화
 * 2026.05.12  임도헌   Modified  다른 상세 화면과 맞춰 시각 레이블은 하트와 숫자만 남기고 접근성 이름은 aria-label로 분리
 * 2026.05.18  임도헌   Modified  상세 좋아요 변경 시 게시글 목록 캐시의 isLiked와 좋아요 수를 함께 낙관 업데이트
 * 2026.05.26  임도헌   Modified  initialData 기반 likeStatus query에 local queryFn을 부여해 refetch 경고 방지
 * 2026.06.17  임도헌   Modified  낙관 반영 직후 좋아요 버튼이 흐려 보이지 않도록 pending opacity 제거
 * 2026.06.17  임도헌   Modified  계정 전환 시 이전 사용자의 좋아요 캐시가 재사용되지 않도록 viewer scope 추가
 * 2026.08.13  임도헌   Modified  낙관 업데이트/롤백/무효화를 현재 조회자 캐시로 제한
 * 2026.08.27  임도헌   Modified  재방문 시 새 서버 좋아요 상태를 기존 무기한 cache보다 우선하도록 동기화
 */
"use client";

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { dislikePost, likePost } from "@/features/post/actions/likes";
import { queryKeys } from "@/lib/queryKeys";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PostsPage } from "@/features/post/types";
import { isPostListKeyForViewer } from "@/features/post/utils/postQueryCache";
import { useServerSnapshotQuery } from "@/features/common/hooks/useServerSnapshotQuery";

interface PostLikeButtonProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
  viewerId?: number | null;
}

/**
 * 게시글 좋아요 버튼 컴포넌트
 *
 * [상태 주입 및 캐시 제어 로직]
 * - 서버가 전달한 최신 상태를 기존 상세 cache보다 우선한 뒤 QueryClient와 동기화
 * - `useMutation`의 `onMutate` 단계를 활용한 낙관적 업데이트(Optimistic Update)로 즉각적인 UI 피드백 제공
 * - 상세 좋아요 변경 시 목록 카드의 좋아요 수와 isLiked도 함께 갱신해 뒤로가기 후 하트 색상 정합성 유지
 * - 좋아요 상태 query key에 viewer scope를 포함해 계정 전환/재로그인 후 stale 상태 노출 방지
 * - `onError` 발생 시 `previous` 스냅샷을 활용한 이전 상태 복구(Rollback) 로직 포함
 * - `onSettled` 단계에서는 원격 queryFn이 있는 목록 쿼리만 무효화해 로컬 상세 cache의 불필요한 재조회를 방지
 */
export default function PostLikeButton({
  postId,
  isLiked: initialIsLiked,
  likeCount: initialLikeCount,
  viewerId = null,
}: PostLikeButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.posts.likeStatus(postId, viewerId);
  const initialLikeStatus = {
    isLiked: initialIsLiked,
    likeCount: initialLikeCount,
  };

  // 1. 새 서버 상태를 우선 반영한 뒤 mutation이 갱신하는 cache를 구독
  const data = useServerSnapshotQuery({
    queryKey,
    snapshot: initialLikeStatus,
  });

  // 2. 상태 변경 (Mutation)
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (data.isLiked) await dislikePost(postId);
      else await likePost(postId);
    },
    // Mutate 발생 직후 실행 (낙관적 업데이트)
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({
          predicate: (query) =>
            isPostListKeyForViewer(query.queryKey, viewerId),
        }),
      ]);
      // 롤백을 위한 이전 상태 스냅샷 저장
      const previous = queryClient.getQueryData(queryKey);
      const previousLists =
        queryClient.getQueriesData<InfiniteData<PostsPage>>({
          predicate: (query) =>
            isPostListKeyForViewer(query.queryKey, viewerId),
        });

      const nextIsLiked = !data.isLiked;
      const nextLikeCount = data.isLiked
        ? Math.max(0, data.likeCount - 1)
        : data.likeCount + 1;

      // 캐시 강제 업데이트
      queryClient.setQueryData(queryKey, {
        isLiked: nextIsLiked,
        likeCount: nextLikeCount,
      });

      // 목록 카드는 별도 좋아요 버튼이 없지만 하트 색상은 isLiked 기준이므로 상세 변경을 즉시 반영
      queryClient.setQueriesData<InfiniteData<PostsPage>>(
        {
          predicate: (query) =>
            isPostListKeyForViewer(query.queryKey, viewerId),
        },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  posts: page.posts.map((post) =>
                    post.id === postId
                      ? {
                          ...post,
                          isLiked: nextIsLiked,
                          _count: {
                            ...post._count,
                            post_likes: nextLikeCount,
                          },
                        }
                      : post
                  ),
                })),
              }
            : old
      );

      return { previous, previousLists };
    },
    // 에러 발생 시 이전 상태로 복구
    onError: (err, _variables, context) => {
      console.error("Like mutation failed:", err);
      toast.error("게시글 좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      queryClient.setQueryData(queryKey, context?.previous);
      context?.previousLists.forEach(([listQueryKey, listData]) => {
        queryClient.setQueryData(listQueryKey, listData);
      });
    },
    // 성공/실패 무관하게 백그라운드 데이터 최신화
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          isPostListKeyForViewer(query.queryKey, viewerId),
      });
    },
  });
  const likeButtonLabel = data.isLiked
    ? `게시글 좋아요 취소, 현재 ${data.likeCount.toLocaleString()}개`
    : `게시글 좋아요, 현재 ${data.likeCount.toLocaleString()}개`;

  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "focus-ring-soft -ml-1.5 flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-surface-dim",
        "disabled:cursor-not-allowed",
        data.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500"
      )}
      aria-busy={isPending}
      aria-pressed={data.isLiked}
      aria-label={likeButtonLabel}
    >
      {data.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-sm font-medium tabular-nums">
        {data.likeCount.toLocaleString()}
      </span>
    </button>
  );
}
