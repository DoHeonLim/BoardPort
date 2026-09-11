/**
 * File Name : app/api/profile/likes/route.test.ts
 * Description : 찜한 게시글·다시보기 API 권한 및 분기 테스트
 * Author : 임도헌
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getLikedPostsPage: vi.fn(),
  getLikedRecordingsPage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/user/service/myLikes", () => ({
  getLikedPostsPage: mocks.getLikedPostsPage,
  getLikedRecordingsPage: mocks.getLikedRecordingsPage,
}));

describe("GET /api/profile/likes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("비로그인 요청은 개인 찜 목록을 반환하지 않는다", async () => {
    const { GET } = await import("./route");
    mocks.getSession.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/profile/likes?type=posts")
    );

    expect(response.status).toBe(401);
    expect(mocks.getLikedPostsPage).not.toHaveBeenCalled();
  });

  it("게시글 요청은 세션 사용자와 복합 커서를 서비스에 전달한다", async () => {
    const { GET } = await import("./route");
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getLikedPostsPage.mockResolvedValue({ posts: [], nextCursor: null });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/profile/likes?type=posts&cursorId=21&cursorAt=2026-09-11T10%3A00%3A00.000Z"
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.getLikedPostsPage).toHaveBeenCalledWith(7, {
      id: 21,
      likedAt: "2026-09-11T10:00:00.000Z",
    });
    expect(mocks.getLikedRecordingsPage).not.toHaveBeenCalled();
  });

  it("다시보기 요청은 세션 사용자 범위로만 조회한다", async () => {
    const { GET } = await import("./route");
    mocks.getSession.mockResolvedValue({ id: 9 });
    mocks.getLikedRecordingsPage.mockResolvedValue({
      recordings: [],
      nextCursor: null,
    });

    await GET(
      new NextRequest(
        "http://localhost/api/profile/likes?type=recordings&userId=100"
      )
    );

    expect(mocks.getLikedRecordingsPage).toHaveBeenCalledWith(9, null);
  });

  it("지원하지 않는 유형과 잘못된 커서를 거부한다", async () => {
    const { GET } = await import("./route");
    mocks.getSession.mockResolvedValue({ id: 7 });

    const badType = await GET(
      new NextRequest("http://localhost/api/profile/likes?type=products")
    );
    const badCursor = await GET(
      new NextRequest(
        "http://localhost/api/profile/likes?type=posts&cursorId=x&cursorAt=2026-09-11"
      )
    );
    const incompleteCursor = await GET(
      new NextRequest(
        "http://localhost/api/profile/likes?type=posts&cursorId=21"
      )
    );

    expect(badType.status).toBe(400);
    expect(badCursor.status).toBe(400);
    expect(incompleteCursor.status).toBe(400);
  });
});
