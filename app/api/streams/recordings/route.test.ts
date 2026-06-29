/**
 * File Name : app/api/streams/recordings/route.test.ts
 * Description : 다시보기 목록 API 권한 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   URL viewerId를 신뢰하지 않는 세션 기준 조회 테스트 추가
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getRecordingsList: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/stream/service/list", () => ({
  getRecordingsList: mocks.getRecordingsList,
}));

describe("GET /api/streams/recordings", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getRecordingsList.mockReset();
  });

  it("비로그인 요청의 viewerId query를 조회자 권한으로 사용하지 않는다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams/recordings?followingOnly=true&viewerId=123"
    );

    mocks.getSession.mockResolvedValue(null);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      recordings: [],
      nextCursor: null,
    });
    expect(mocks.getRecordingsList).not.toHaveBeenCalled();
  });

  it("세션이 있으면 query viewerId보다 세션 ID를 우선한다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams/recordings?followingOnly=true&viewerId=123&cursor=50"
    );

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getRecordingsList.mockResolvedValue([]);

    await GET(request);

    expect(mocks.getRecordingsList).toHaveBeenCalledWith(
      expect.objectContaining({
        followingOnly: true,
        viewerId: 7,
        cursor: 50,
      })
    );
  });
});
