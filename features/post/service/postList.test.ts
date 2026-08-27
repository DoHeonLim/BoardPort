/**
 * File Name : features/post/service/postList.test.ts
 * Description : 게시글 목록 정렬과 커서 페이지네이션 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   생성 시각 동률 게시글의 ID 보조 정렬 계약 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  postFindUnique: vi.fn(),
  postFindMany: vi.fn(),
  postCount: vi.fn(),
  postLikeFindMany: vi.fn(),
  getBlockedUserIds: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    user: { findUnique: mocks.userFindUnique },
    post: {
      findUnique: mocks.postFindUnique,
      findMany: mocks.postFindMany,
      count: mocks.postCount,
    },
    postLike: { findMany: mocks.postLikeFindMany },
  },
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: mocks.getBlockedUserIds,
}));

describe("getPostsList ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.postFindMany.mockResolvedValue([]);
    mocks.postCount.mockResolvedValue(0);
    mocks.postLikeFindMany.mockResolvedValue([]);
  });

  it("생성 시각 동률을 ID 내림차순으로 결정한다", async () => {
    const { getPostsList } = await import("./post");

    await getPostsList(undefined, -1);

    expect(mocks.postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
      })
    );
  });

  it("다음 페이지도 동일한 정렬과 마지막 게시글 ID 커서를 사용한다", async () => {
    mocks.postFindUnique.mockResolvedValue({ id: 27 });
    const { getPostsList } = await import("./post");

    await getPostsList(undefined, -1, 27);

    expect(mocks.postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        cursor: { id: 27 },
        skip: 1,
      })
    );
  });
});
