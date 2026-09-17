/**
 * File Name : app/api/streams/route.test.ts
 * Description : 라이브 방송 목록 API 권한 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   URL viewerId를 신뢰하지 않는 세션 기준 조회 테스트 추가
 * 2026.09.09  임도헌   Modified  공용 라이브 페이지 service 호출 기준으로 mock 갱신
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getStreamsPage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/stream/service/list", () => ({
  getStreamsPage: mocks.getStreamsPage,
}));

describe("GET /api/streams", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getStreamsPage.mockReset();
  });

  it("비로그인 요청의 viewerId query를 조회자 권한으로 사용하지 않는다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams?scope=following&viewerId=123"
    );

    mocks.getSession.mockResolvedValue(null);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ streams: [], nextCursor: null });
    expect(mocks.getStreamsPage).not.toHaveBeenCalled();
  });

  it("세션이 있으면 query viewerId보다 세션 ID를 우선한다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams?scope=following&viewerId=123&cursor=50"
    );

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getStreamsPage.mockResolvedValue({ streams: [], nextCursor: null });

    await GET(request);

    expect(mocks.getStreamsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "following",
        viewerId: 7,
        cursor: 50,
      })
    );
  });
});
