/**
 * File Name : features/user/service/myLikes.test.ts
 * Description : 사용자 관심 목록 복합 커서 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   커서 항목 삭제 후에도 다음 정렬 범위 조회 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postLikeFindMany: vi.fn(),
  getBlockedUserIds: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    postLike: { findMany: mocks.postLikeFindMany },
  },
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: mocks.getBlockedUserIds,
}));
vi.mock("@/features/stream/service/playback", () => ({
  resolveStreamThumbnailUrl: (value: string | null | undefined) => value ?? null,
}));

describe("getLikedPostsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.postLikeFindMany.mockResolvedValue([]);
  });

  it("커서 좋아요 레코드 재조회 없이 찜 시각과 게시글 ID 다음 범위를 조회한다", async () => {
    const { getLikedPostsPage } = await import("./myLikes");

    const result = await getLikedPostsPage(7, {
      id: 21,
      likedAt: "2026-09-11T10:00:00.000Z",
    });

    expect(result).toEqual({ posts: [], nextCursor: null });
    expect(mocks.postLikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 7,
          OR: [
            { created_at: { lt: new Date("2026-09-11T10:00:00.000Z") } },
            {
              created_at: new Date("2026-09-11T10:00:00.000Z"),
              postId: { lt: 21 },
            },
          ],
        }),
      })
    );
  });
});
