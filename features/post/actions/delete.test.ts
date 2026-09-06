/**
 * File Name : features/post/actions/delete.test.ts
 * Description : 게시글 삭제 Action의 세션 만료와 캐시 갱신 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.01  임도헌   Created   `notFound()` 제어 신호 없이 세션 만료 실패를 반환하는 동작 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deletePost: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/post/service/post", () => ({
  deletePost: mocks.deletePost,
}));
vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  revalidatePath: mocks.revalidatePath,
}));

describe("deletePostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.deletePost.mockResolvedValue({ success: true });
  });

  it("세션이 만료되면 notFound 제어 신호 대신 실패 결과를 반환한다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { deletePostAction } = await import("./delete");

    await expect(deletePostAction(31)).resolves.toEqual({
      success: false,
      error: "로그인이 필요합니다.",
    });
    expect(mocks.deletePost).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("삭제 성공 후 상세 cache와 목록 경로를 갱신한다", async () => {
    const { deletePostAction } = await import("./delete");

    await expect(deletePostAction(31)).resolves.toEqual({ success: true });
    expect(mocks.deletePost).toHaveBeenCalledWith(7, 31);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("post-detail-31", {
      expire: 0,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/posts");
  });
});
