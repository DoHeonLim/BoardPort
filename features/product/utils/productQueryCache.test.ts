/**
 * File Name : features/product/utils/productQueryCache.test.ts
 * Description : Product infinite query cache 정리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   삭제된 상품과 stale nextCursor 제거 기준 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  removeProductFromInfiniteCache,
  type ProductInfiniteCache,
} from "@/features/product/utils/productQueryCache";

type TestProduct = { id: number; title: string };

function createCache(): ProductInfiniteCache<TestProduct> {
  return {
    pages: [
      {
        products: [
          { id: 1, title: "첫 번째 상품" },
          { id: 2, title: "삭제 대상 상품" },
        ],
        nextCursor: 2,
        totalCount: 3,
      },
      {
        products: [{ id: 3, title: "세 번째 상품" }],
        nextCursor: null,
        totalCount: 3,
      },
    ],
    pageParams: [undefined, 2],
  };
}

describe("removeProductFromInfiniteCache", () => {
  it("캐시가 없으면 그대로 반환한다", () => {
    expect(removeProductFromInfiniteCache(undefined, 1)).toBeUndefined();
  });

  it("삭제된 상품을 페이지 목록에서 제거한다", () => {
    const result = removeProductFromInfiniteCache(createCache(), 2);

    expect(result?.pages[0].products).toEqual([
      { id: 1, title: "첫 번째 상품" },
    ]);
    expect(result?.pages[1].products).toEqual([
      { id: 3, title: "세 번째 상품" },
    ]);
  });

  it("삭제된 상품이 nextCursor였으면 남은 마지막 상품 id로 보정한다", () => {
    const result = removeProductFromInfiniteCache(createCache(), 2);

    // 삭제된 id가 cursor로 남으면 다음 페이지 요청에서 존재하지 않는 Prisma cursor를 참조할 수 있다.
    expect(result?.pages[0].nextCursor).toBe(1);
  });

  it("페이지가 비면 nextCursor를 null로 보정한다", () => {
    const cache: ProductInfiniteCache<TestProduct> = {
      pages: [
        {
          products: [{ id: 2, title: "삭제 대상 상품" }],
          nextCursor: 2,
          totalCount: 1,
        },
      ],
    };

    const result = removeProductFromInfiniteCache(cache, 2);

    expect(result?.pages[0].products).toEqual([]);
    expect(result?.pages[0].nextCursor).toBeNull();
  });

  it("삭제가 발생한 페이지의 totalCount만 1 감소시킨다", () => {
    const result = removeProductFromInfiniteCache(createCache(), 2);

    expect(result?.pages[0].totalCount).toBe(2);
    expect(result?.pages[1].totalCount).toBe(3);
  });

  it("pageParams는 유지한다", () => {
    const result = removeProductFromInfiniteCache(createCache(), 2);

    expect(result?.pageParams).toEqual([undefined, 2]);
  });
});
