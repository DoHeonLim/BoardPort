/**
 * File Name : features/post/service/postDetail.test.ts
 * Description : 게시글 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   실제 미존재·DB 실패 경계와 최신 조회수 overlay를 검증
 * 2026.09.05  임도헌   Modified  상세 본문이 남아 있어도 최신 DB에서 삭제된 게시글의 미존재 판정 검증
 * 2026.09.09  임도헌   Modified  상세 본문과 분리한 최신 반응 통계 및 조회자 좋아요 상태 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postFindUnique: vi.fn(),
  postLikeFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    post: { findUnique: mocks.postFindUnique },
    postLike: { findUnique: mocks.postLikeFindUnique },
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

  it("상세 본문 조회에서 별도 최신 상태로 읽는 반응 통계를 제외한다", async () => {
    mocks.postFindUnique.mockResolvedValue({ id: 91, board_games: [] });
    const { getPostDetail } = await import("./post");

    await getPostDetail(91);

    const query = mocks.postFindUnique.mock.calls[0]?.[0];
    expect(query.include).not.toHaveProperty("_count");
  });

  it("DB 상세 조회 실패를 cache 밖으로 전파한다", async () => {
    const databaseError = new Error("database unavailable");
    mocks.postFindUnique.mockRejectedValue(databaseError);
    const { getCachedPost } = await import("./post");

    await expect(getCachedPost(91)).rejects.toBe(databaseError);
  });

  it("상세 본문 cache의 조회수를 최신 DB 값으로 덮어쓴다", async () => {
    mocks.postFindUnique
      .mockResolvedValueOnce({ id: 91, views: 3, board_games: [] })
      .mockResolvedValueOnce({
        views: 42,
        _count: { comments: 5, post_likes: 7 },
      });
    const { getPostDetailViewData } = await import("./post");

    const result = await getPostDetailViewData(91, null);

    expect(result.post?.views).toBe(42);
    expect(result.post?._count).toEqual({ comments: 5, post_likes: 7 });
    expect(result.likeStatus).toEqual({ likeCount: 7, isLiked: false });
  });

  it("로그인 조회자의 좋아요 여부만 별도 복합 키로 확인한다", async () => {
    mocks.postFindUnique
      .mockResolvedValueOnce({ id: 91, views: 3, board_games: [] })
      .mockResolvedValueOnce({
        views: 3,
        _count: { comments: 0, post_likes: 1 },
      });
    mocks.postLikeFindUnique.mockResolvedValue({ postId: 91 });
    const { getPostDetailViewData } = await import("./post");

    const result = await getPostDetailViewData(91, 7);

    expect(mocks.postLikeFindUnique).toHaveBeenCalledWith({
      where: { id: { postId: 91, userId: 7 } },
      select: { postId: true },
    });
    expect(result.likeStatus).toEqual({ likeCount: 1, isLiked: true });
  });

  it("이전 상세 본문이 있어도 최신 DB에서 삭제됐으면 null 반환", async () => {
    mocks.postFindUnique
      .mockResolvedValueOnce({ id: 91, views: 3, board_games: [] })
      .mockResolvedValueOnce(null);
    const { getPostDetailViewData } = await import("./post");

    await expect(getPostDetailViewData(91, null)).resolves.toEqual({
      post: null,
      likeStatus: { likeCount: 0, isLiked: false },
    });
  });
});
