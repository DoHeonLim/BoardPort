/**
 * File Name : app/api/streams/recordings/route.test.ts
 * Description : 다시보기 목록 API 권한 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   URL viewerId를 신뢰하지 않는 세션 기준 조회 테스트 추가
 * 2026.08.26  임도헌   Modified  복합 커서 검증·전달·응답 회귀 테스트 추가
 * 2026.09.05  임도헌   Modified  다시보기 전용 페이지 크기 기준 응답 개수와 다음 커서 검증
 * 2026.09.09  임도헌   Modified  공용 다시보기 페이지 service 호출 기준으로 mock 갱신
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeRecordingCursor } from "@/features/stream/utils/recordingCursor";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getRecordingsPage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/stream/service/list", () => ({
  getRecordingsPage: mocks.getRecordingsPage,
}));

describe("GET /api/streams/recordings", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getRecordingsPage.mockReset();
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
    expect(mocks.getRecordingsPage).not.toHaveBeenCalled();
  });

  it("세션이 있으면 query viewerId보다 세션 ID를 우선한다", async () => {
    const { GET } = await import("./route");
    const cursor = encodeRecordingCursor("latest", {
      vodId: 50,
      readyAt: new Date("2026-08-26T10:30:00.000Z"),
      viewCount: 12,
    });
    const request = new NextRequest(
      `http://localhost/api/streams/recordings?followingOnly=true&viewerId=123&cursor=${cursor}`
    );

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getRecordingsPage.mockResolvedValue({
      recordings: [],
      nextCursor: null,
    });

    await GET(request);

    expect(mocks.getRecordingsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        followingOnly: true,
        viewerId: 7,
        cursor: {
          sort: "latest",
          readyAt: new Date("2026-08-26T10:30:00.000Z"),
          id: 50,
          views: 12,
        },
      })
    );
  });

  it("현재 정렬과 맞지 않는 커서는 400으로 거부한다", async () => {
    const { GET } = await import("./route");
    const cursor = encodeRecordingCursor("popular", {
      vodId: 50,
      readyAt: new Date("2026-08-26T10:30:00.000Z"),
      viewCount: 12,
    });
    const request = new NextRequest(
      `http://localhost/api/streams/recordings?sort=latest&cursor=${cursor}`
    );

    mocks.getSession.mockResolvedValue({ id: 7 });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(mocks.getRecordingsPage).not.toHaveBeenCalled();
  });

  it("공용 service의 다시보기 페이지 응답을 그대로 반환한다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams/recordings?sort=popular"
    );
    const page = {
      recordings: [{ vodId: 100, title: "다시보기" }],
      nextCursor: "next-recording-cursor",
    };

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getRecordingsPage.mockResolvedValue(page);

    const response = await GET(request);

    expect(await response.json()).toEqual(page);
  });
});
