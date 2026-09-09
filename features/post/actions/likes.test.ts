/**
 * File Name : features/post/actions/likes.test.ts
 * Description : 게시글 좋아요 Action의 실패 전파와 cache 책임 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   Service 실패가 mutation 롤백용 예외로 전파되고 캐시를 무효화하지 않는지 검증
 * 2026.09.09  임도헌   Modified  반응 통계 분리 후 상세 본문 cache 무효화가 없는 계약 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  togglePostLike: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/post/service/like", () => ({
  togglePostLike: mocks.togglePostLike,
}));

describe("post like action failure propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 11 });
  });

  it.each([
    ["좋아요 추가", "likePost", true],
    ["좋아요 취소", "dislikePost", false],
  ] as const)(
    "%s Service 실패를 예외로 전파한다",
    async (_label, actionName, isLike) => {
      mocks.togglePostLike.mockResolvedValue({
        success: false,
        error: "좋아요 처리 실패",
      });
      const actions = await import("./likes");

      await expect(actions[actionName](91)).rejects.toThrow("좋아요 처리 실패");

      expect(mocks.togglePostLike).toHaveBeenCalledWith(11, 91, isLike);
    }
  );

  it("Service 성공 후 별도 상세 본문 cache 무효화 없이 완료한다", async () => {
    mocks.togglePostLike.mockResolvedValue({ success: true });
    const { likePost } = await import("./likes");

    await expect(likePost(91)).resolves.toBeUndefined();

    expect(mocks.togglePostLike).toHaveBeenCalledWith(11, 91, true);
  });
});
