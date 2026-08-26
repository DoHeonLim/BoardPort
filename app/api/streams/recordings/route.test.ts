/**
 * File Name : app/api/streams/recordings/route.test.ts
 * Description : 다시보기 목록 API 권한 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   URL viewerId를 신뢰하지 않는 세션 기준 조회 테스트 추가
 * 2026.08.26  임도헌   Modified  복합 커서 검증·전달·응답 회귀 테스트 추가
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import {
  decodeRecordingCursor,
  encodeRecordingCursor,
} from "@/features/stream/utils/recordingCursor";

vi.mock("server-only", () => ({}));

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
    const cursor = encodeRecordingCursor("latest", {
      vodId: 50,
      readyAt: new Date("2026-08-26T10:30:00.000Z"),
      viewCount: 12,
    });
    const request = new NextRequest(
      `http://localhost/api/streams/recordings?followingOnly=true&viewerId=123&cursor=${cursor}`
    );

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getRecordingsList.mockResolvedValue([]);

    await GET(request);

    expect(mocks.getRecordingsList).toHaveBeenCalledWith(
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
    expect(mocks.getRecordingsList).not.toHaveBeenCalled();
  });

  it("다음 페이지가 있으면 마지막 VOD의 정렬값을 커서로 반환한다", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/streams/recordings?sort=popular"
    );
    const recordings = Array.from(
      { length: STREAMS_PAGE_TAKE + 1 },
      (_, index) => ({
        vodId: 100 - index,
        readyAt: new Date(
          `2026-08-26T10:${String(59 - index).padStart(2, "0")}:00.000Z`
        ),
        viewCount: 200 - index,
      })
    );

    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.getRecordingsList.mockResolvedValue(recordings);

    const response = await GET(request);
    const body = await response.json();
    const tail = recordings[STREAMS_PAGE_TAKE - 1];

    expect(body.recordings).toHaveLength(STREAMS_PAGE_TAKE);
    expect(decodeRecordingCursor(body.nextCursor, "popular")).toEqual({
      sort: "popular",
      readyAt: tail.readyAt,
      id: tail.vodId,
      views: tail.viewCount,
    });
  });
});
