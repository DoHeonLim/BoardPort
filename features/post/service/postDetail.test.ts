/**
 * File Name : features/post/service/postDetail.test.ts
 * Description : 게시글 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   실제 미존재만 null로 반환하고 DB 실패는 cache 밖으로 전파하는지 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    post: { findUnique: mocks.postFindUnique },
  },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

describe("post detail lookup boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("실제로 존재하지 않는 게시글만 null로 반환한다", async () => {
    mocks.postFindUnique.mockResolvedValue(null);
    const { getPostDetail } = await import("./post");

    await expect(getPostDetail(404)).resolves.toBeNull();
  });

  it("DB 상세 조회 실패를 cache 밖으로 전파한다", async () => {
    const databaseError = new Error("database unavailable");
    mocks.postFindUnique.mockRejectedValue(databaseError);
    const { getCachedPost } = await import("./post");

    await expect(getCachedPost(91)).rejects.toBe(databaseError);
  });
});
