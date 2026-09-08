/**
 * File Name : features/post/service/postList.test.ts
 * Description : 게시글 목록 정렬과 커서 페이지네이션 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   생성 시각 동률 게시글의 ID 보조 정렬 계약 검증
 * 2026.09.08  임도헌   Modified  프로필 작성자 필터와 기존 공개 정책 결합 검증
 * 2026.09.08  임도헌   Modified  조회·좋아요·댓글 정렬과 동률 기준 검증
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

  it.each([
    ["views", [{ views: "desc" }, { created_at: "desc" }, { id: "desc" }]],
    [
      "likes",
      [
        { post_likes: { _count: "desc" } },
        { created_at: "desc" },
        { id: "desc" },
      ],
    ],
    [
      "comments",
      [
        { comments: { _count: "desc" } },
        { created_at: "desc" },
        { id: "desc" },
      ],
    ],
  ] as const)(
    "%s 정렬은 생성 시각과 ID로 동률을 결정한다",
    async (sort, orderBy) => {
      const { getPostsList } = await import("./post");

      await getPostsList({ sort }, -1);

      expect(mocks.postFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy })
      );
    }
  );

  it("프로필 목록은 작성자 조건과 정지 사용자 은닉 조건을 함께 적용한다", async () => {
    const { getPostsList } = await import("./post");

    await getPostsList({ authorId: 42 }, 7);

    expect(mocks.postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { user: { bannedAt: null } },
            { userId: 42 },
          ]),
        }),
      })
    );
  });

  it("차단 관계의 작성자는 프로필 목록 조건에서도 제외한다", async () => {
    mocks.getBlockedUserIds.mockResolvedValue([42]);
    const { getPostsList } = await import("./post");

    await getPostsList({ authorId: 42 }, 7);

    expect(mocks.postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { notIn: [42] } }),
      })
    );
  });

  it("프로필 미리보기는 요청한 개수보다 한 건 더 조회해 다음 페이지를 판정한다", async () => {
    const { getPostsList } = await import("./post");

    await getPostsList({ authorId: 42 }, 7, null, 2);

    expect(mocks.postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });
});
