/**
 * File Name : features/product/utils/productSort.test.ts
 * Description : 상품 목록 정렬 query 정규화 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   허용 정렬값과 기본 최신순 회귀 검증
 */

import { describe, expect, it } from "vitest";
import { normalizeProductSort } from "@/features/product/utils/productSort";

describe("normalizeProductSort", () => {
  it.each(["latest", "priceAsc", "priceDesc"] as const)(
    "%s 정렬값을 유지한다",
    (sort) => {
      expect(normalizeProductSort(sort)).toBe(sort);
    }
  );

  it.each([undefined, null, "", "unknown"])(
    "%s 값은 최신순으로 정규화한다",
    (sort) => {
      expect(normalizeProductSort(sort)).toBe("latest");
    }
  );
});
