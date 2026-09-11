/**
 * File Name : features/post/utils/postSort.test.ts
 * Description : 게시글 목록 정렬 query 정규화 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   허용 정렬값과 기본 최신순 회귀 검증
 */

import { describe, expect, it } from "vitest";
import { normalizePostSort } from "@/features/post/utils/postSort";

describe("normalizePostSort", () => {
  it.each(["latest", "views", "likes", "comments"] as const)(
    "%s 정렬값을 유지한다",
    (sort) => {
      expect(normalizePostSort(sort)).toBe(sort);
    }
  );

  it.each([undefined, null, "", "unknown"])(
    "%s 값은 최신순으로 정규화한다",
    (sort) => {
      expect(normalizePostSort(sort)).toBe("latest");
    }
  );
});
