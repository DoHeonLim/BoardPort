/**
 * File Name : features/post/utils/postQueryCache.test.ts
 * Description : Post infinite query cache 정리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   삭제된 게시글과 stale nextCursor 제거 기준 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  removePostFromInfiniteCache,
  type PostInfiniteCache,
} from "@/features/post/utils/postQueryCache";

type TestPost = { id: number; title: string };

function createCache(): PostInfiniteCache<TestPost> {
  return {
    pages: [
      {
        posts: [
          { id: 10, title: "첫 번째 게시글" },
          { id: 20, title: "삭제 대상 게시글" },
        ],
        nextCursor: 20,
        totalCount: 3,
      },
      {
        posts: [{ id: 30, title: "세 번째 게시글" }],
        nextCursor: null,
        totalCount: 3,
      },
    ],
    pageParams: [undefined, 20],
  };
}

describe("removePostFromInfiniteCache", () => {
  it("캐시가 없으면 그대로 반환한다", () => {
    expect(removePostFromInfiniteCache(undefined, 10)).toBeUndefined();
  });

  it("삭제된 게시글을 페이지 목록에서 제거한다", () => {
    const result = removePostFromInfiniteCache(createCache(), 20);

    expect(result?.pages[0].posts).toEqual([
      { id: 10, title: "첫 번째 게시글" },
    ]);
    expect(result?.pages[1].posts).toEqual([
      { id: 30, title: "세 번째 게시글" },
    ]);
  });

  it("삭제된 게시글이 nextCursor였으면 남은 마지막 게시글 id로 보정한다", () => {
    const result = removePostFromInfiniteCache(createCache(), 20);

    // 삭제된 id가 cursor로 남으면 다음 페이지 요청에서 존재하지 않는 Prisma cursor를 참조할 수 있다.
    expect(result?.pages[0].nextCursor).toBe(10);
  });

  it("페이지가 비면 nextCursor를 null로 보정한다", () => {
    const cache: PostInfiniteCache<TestPost> = {
      pages: [
        {
          posts: [{ id: 20, title: "삭제 대상 게시글" }],
          nextCursor: 20,
          totalCount: 1,
        },
      ],
    };

    const result = removePostFromInfiniteCache(cache, 20);

    expect(result?.pages[0].posts).toEqual([]);
    expect(result?.pages[0].nextCursor).toBeNull();
  });

  it("삭제가 발생한 페이지의 totalCount만 1 감소시킨다", () => {
    const result = removePostFromInfiniteCache(createCache(), 20);

    expect(result?.pages[0].totalCount).toBe(2);
    expect(result?.pages[1].totalCount).toBe(3);
  });

  it("pageParams는 유지한다", () => {
    const result = removePostFromInfiniteCache(createCache(), 20);

    expect(result?.pageParams).toEqual([undefined, 20]);
  });
});
