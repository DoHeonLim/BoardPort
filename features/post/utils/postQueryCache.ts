/**
 * File Name : features/post/utils/postQueryCache.ts
 * Description : Post TanStack Query 캐시 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   삭제된 게시글을 infinite cache와 nextCursor에서 제거하는 유틸 분리
 * 2026.08.13  임도헌   Modified  게시글 목록 캐시 판별을 현재 조회자 범위로 제한
 */

export type PostInfiniteCache<T extends { id: number }> = {
  pages: Array<{
    posts: T[];
    nextCursor: number | null;
    totalCount?: number;
  }>;
  pageParams?: unknown[];
};

const getViewerScope = (viewerId: number | null) => viewerId ?? "guest";

/** posts/list/{viewerId}/{filters} 구조에서 현재 조회자의 목록 키인지 판별 */
export function isPostListKeyForViewer(
  key: readonly unknown[],
  viewerId: number | null
) {
  return (
    Array.isArray(key) &&
    key.length >= 4 &&
    key[0] === "posts" &&
    key[1] === "list" &&
    key[2] === getViewerScope(viewerId)
  );
}

/**
 * infinite query 캐시에서 삭제된 게시글과 해당 게시글을 가리키는 nextCursor를 함께 제거
 *
 * - 삭제된 게시글이 페이지 마지막 아이템이면 기존 nextCursor가 삭제된 id로 남을 수 있음
 * - 그 상태에서 다음 페이지를 요청하면 Prisma cursor가 존재하지 않아 무한스크롤이 실패할 수 있음
 */
export function removePostFromInfiniteCache<T extends { id: number }>(
  oldData: PostInfiniteCache<T> | undefined,
  postId: number
): PostInfiniteCache<T> | undefined {
  if (!oldData?.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => {
      const posts = page.posts.filter((post) => post.id !== postId);
      const removedFromPage = posts.length !== page.posts.length;
      // 삭제된 게시글이 다음 페이지 cursor였으면 남은 마지막 항목으로 되돌려
      // 존재하지 않는 Prisma cursor 요청을 막는다.
      const nextCursor =
        page.nextCursor === postId
          ? (posts[posts.length - 1]?.id ?? null)
          : page.nextCursor;

      return {
        ...page,
        posts,
        nextCursor,
        totalCount:
          removedFromPage && typeof page.totalCount === "number"
            ? Math.max(0, page.totalCount - 1)
            : page.totalCount,
      };
    }),
  };
}
