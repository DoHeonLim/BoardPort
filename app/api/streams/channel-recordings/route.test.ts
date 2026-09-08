/**
 * File Name : app/api/streams/channel-recordings/route.test.ts
 * Description : 채널 다시보기 목록 API 세션 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   비로그인·차단 요청 차단과 세션 viewerId 전달 검증
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getViewerRole: vi.fn(),
  getChannelVods: vi.fn(),
  checkBlockRelation: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/access", () => ({
  getViewerRole: mocks.getViewerRole,
}));
vi.mock("@/features/stream/service/list", () => ({
  getChannelVods: mocks.getChannelVods,
}));
vi.mock("@/features/user/service/block", () => ({
  checkBlockRelation: mocks.checkBlockRelation,
}));
vi.mock("@/features/stream/utils/session", () => ({
  isBroadcastUnlockedFromSession: vi.fn(() => false),
}));

describe("GET /api/streams/channel-recordings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkBlockRelation.mockResolvedValue(false);
  });

  it("비로그인 요청은 목록과 signed thumbnail 조회를 시작하지 않는다", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { GET } = await import("./route");
    const request = new NextRequest(
      "https://boardport.example/api/streams/channel-recordings?ownerId=7"
    );

    const response = await GET(request);

    expect(await response.json()).toEqual({
      recordings: [],
      nextCursor: null,
    });
    expect(mocks.getViewerRole).not.toHaveBeenCalled();
    expect(mocks.getChannelVods).not.toHaveBeenCalled();
  });

  it("차단 관계 요청은 signed thumbnail 조회를 시작하지 않는다", async () => {
    mocks.getSession.mockResolvedValue({ id: 11 });
    mocks.checkBlockRelation.mockResolvedValue(true);
    const { GET } = await import("./route");
    const request = new NextRequest(
      "https://boardport.example/api/streams/channel-recordings?ownerId=7"
    );

    const response = await GET(request);

    expect(await response.json()).toEqual({
      recordings: [],
      nextCursor: null,
    });
    expect(mocks.checkBlockRelation).toHaveBeenCalledWith(11, 7);
    expect(mocks.getViewerRole).not.toHaveBeenCalled();
    expect(mocks.getChannelVods).not.toHaveBeenCalled();
  });

  it("로그인 요청은 세션 ID만 viewerId로 사용한다", async () => {
    mocks.getSession.mockResolvedValue({ id: 11 });
    mocks.getViewerRole.mockResolvedValue("VISITOR");
    mocks.getChannelVods.mockResolvedValue([]);
    const { GET } = await import("./route");
    const request = new NextRequest(
      "https://boardport.example/api/streams/channel-recordings?ownerId=7&viewerId=999"
    );

    await GET(request);

    expect(mocks.getChannelVods).toHaveBeenCalledWith(7, 13, null, 11);
  });
});
