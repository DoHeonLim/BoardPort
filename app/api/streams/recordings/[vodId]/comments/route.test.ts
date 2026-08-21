/**
 * File Name : app/api/streams/recordings/[vodId]/comments/route.test.ts
 * Description : VOD 댓글 조회 Route Handler 접근 권한 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   비로그인·제한·미존재 VOD의 HTTP 거부 경계 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  class MockStreamAccessError extends Error {
    constructor(public readonly reason: string) {
      super(`STREAM_ACCESS_${reason}`);
    }
  }

  return {
    StreamAccessError: MockStreamAccessError,
    getSession: vi.fn(),
    getRecordingCommentsList: vi.fn(),
  };
});

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/comment", () => ({
  getRecordingCommentsList: mocks.getRecordingCommentsList,
}));
vi.mock("@/features/stream/service/access", () => ({
  StreamAccessError: mocks.StreamAccessError,
}));

function request() {
  return new NextRequest(
    "https://boardport.example/api/streams/recordings/91/comments?limit=10"
  );
}

describe("GET recording comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("세션이 없으면 service를 호출하지 않고 401을 반환한다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { GET } = await import("./route");

    const response = await GET(request(), { params: { vodId: "91" } });

    expect(response.status).toBe(401);
    expect(mocks.getRecordingCommentsList).not.toHaveBeenCalled();
  });

  it("제한 VOD 접근 거부는 403으로 변환한다", async () => {
    mocks.getSession.mockResolvedValue({ id: 11 });
    mocks.getRecordingCommentsList.mockRejectedValue(
      new mocks.StreamAccessError("PRIVATE")
    );
    const { GET } = await import("./route");

    const response = await GET(request(), { params: { vodId: "91" } });

    expect(response.status).toBe(403);
  });

  it("존재하지 않는 VOD는 404로 변환한다", async () => {
    mocks.getSession.mockResolvedValue({ id: 11 });
    mocks.getRecordingCommentsList.mockRejectedValue(
      new mocks.StreamAccessError("NOT_FOUND")
    );
    const { GET } = await import("./route");

    const response = await GET(request(), { params: { vodId: "91" } });

    expect(response.status).toBe(404);
  });
});
