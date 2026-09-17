/**
 * File Name : features/user/hooks/useMyLikesPagination.ts
 * Description : 찜한 게시글·다시보기 무한 스크롤 훅
 * Author : 임도헌
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  LikedPostsPage,
  LikedRecordingsPage,
  MyLikesCursor,
  MyLikesTab,
} from "@/features/user/types";

type SupportedTab = Exclude<MyLikesTab, "products">;

async function fetchMyLikesPage(
  type: SupportedTab,
  cursor: MyLikesCursor | null
): Promise<LikedPostsPage | LikedRecordingsPage> {
  const params = new URLSearchParams({ type });
  if (cursor) {
    params.set("cursorId", String(cursor.id));
    params.set("cursorAt", cursor.likedAt);
  }
  const response = await fetch(`/api/profile/likes?${params.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("관심 목록을 불러오지 못했습니다.");
  return response.json();
}

/** 선택된 게시글·다시보기 찜 목록의 누적 페이지 상태 조립 */
export function useMyLikesPagination(type: SupportedTab, userId: number) {
  const queryKey =
    type === "posts"
      ? queryKeys.posts.liked(userId)
      : queryKeys.streams.likedRecordings(userId);
  const query = useSuspenseInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchMyLikesPage(type, pageParam as MyLikesCursor | null),
    initialPageParam: null as MyLikesCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60 * 1000,
  });

  const items =
    type === "posts"
      ? query.data.pages.flatMap((page) => (page as LikedPostsPage).posts)
      : query.data.pages.flatMap(
          (page) => (page as LikedRecordingsPage).recordings
        );

  return {
    items,
    hasMore: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  };
}
