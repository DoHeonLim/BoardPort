/**
 * File Name : features/stream/service/list.test.ts
 * Description : 방송·다시보기 목록 조회 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   잠긴 방송의 원본 썸네일 비노출과 PUBLIC signed 변환 검증
 * 2026.08.26  임도헌   Modified  다시보기 최신·인기 복합 커서의 DB 조건 검증
 * 2026.09.09  임도헌   Modified  공용 목록 페이지 크기와 다음 커서 조립 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECORDINGS_PAGE_TAKE, STREAMS_PAGE_TAKE } from "@/lib/constants";
import { decodeRecordingCursor } from "@/features/stream/utils/recordingCursor";

const mocks = vi.hoisted(() => ({
  db: {
    broadcast: { findMany: vi.fn() },
    vodAsset: { findMany: vi.fn() },
    recordingLike: { findMany: vi.fn() },
  },
  getBlockedUserIds: vi.fn(),
  resolveStreamThumbnailUrl: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: mocks.getBlockedUserIds,
}));
vi.mock("@/features/stream/service/playback", () => ({
  resolveStreamThumbnailUrl: mocks.resolveStreamThumbnailUrl,
}));

const createBroadcast = (visibility: "PUBLIC" | "PRIVATE", id = 31) => ({
  id,
  title: "테스트 방송",
  description: null,
  thumbnail:
    "https://customer.example.cloudflarestream.com/raw-id/thumbnails/thumbnail.jpg",
  thumbnailAnimated: false,
  visibility,
  status: "CONNECTED",
  started_at: new Date("2026-08-21T00:00:00.000Z"),
  ended_at: null,
  liveInput: {
    provider_uid: "live-input-uid",
    userId: 7,
    user: {
      id: 7,
      username: "captain",
      avatar: null,
      followers: [],
    },
  },
  category: null,
  tags: [],
  board_games: [],
  vodAssets: [],
});

const createRecording = (id: number) => ({
  id,
  duration_sec: 90,
  ready_at: new Date(`2026-08-26T10:${String(id).padStart(2, "0")}:00.000Z`),
  views: 100 - id,
  _count: { recordingLikes: 1, recordingComments: 2 },
  provider_asset_id: `vod-${id}`,
  thumbnail_url: `https://example.com/vod-${id}.jpg`,
  title: `다시보기 ${id}`,
  custom_thumbnail_url: null,
  thumbnailAnimated: false,
  created_at: new Date("2026-08-26T00:00:00.000Z"),
  broadcastId: id,
  broadcast: {
    id,
    title: `방송 ${id}`,
    description: null,
    thumbnail: null,
    thumbnailAnimated: false,
    visibility: "PUBLIC" as const,
    category: null,
    tags: [],
    board_games: [],
    liveInput: {
      provider_uid: `live-${id}`,
      userId: 7,
      user: {
        id: 7,
        username: "captain",
        avatar: null,
        followers: [],
      },
    },
  },
});

describe("메인 방송 페이지 응답 조립", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.db.recordingLike.findMany.mockResolvedValue([]);
    mocks.resolveStreamThumbnailUrl.mockImplementation(
      (source: string | null) => source
    );
  });

  it("라이브 목록은 전용 페이지 크기로 자르고 다음 ID 커서를 반환한다", async () => {
    mocks.db.broadcast.findMany.mockResolvedValue(
      Array.from({ length: STREAMS_PAGE_TAKE + 1 }, (_, index) =>
        createBroadcast("PUBLIC", 100 - index)
      )
    );
    const { getStreamsPage } = await import("./list");

    const result = await getStreamsPage({
      scope: "all",
      viewerId: 11,
      cursor: null,
    });

    expect(result.streams).toHaveLength(STREAMS_PAGE_TAKE);
    expect(result.nextCursor).toBe(result.streams.at(-1)?.id);
  });

  it("다시보기 목록은 전용 페이지 크기로 자르고 복합 커서를 반환한다", async () => {
    mocks.db.vodAsset.findMany.mockResolvedValue(
      Array.from({ length: RECORDINGS_PAGE_TAKE + 1 }, (_, index) =>
        createRecording(index + 1)
      )
    );
    const { getRecordingsPage } = await import("./list");

    const result = await getRecordingsPage({
      sort: "latest",
      viewerId: 11,
      cursor: null,
    });
    const last = result.recordings.at(-1);
    const cursor = decodeRecordingCursor(result.nextCursor, "latest");

    expect(result.recordings).toHaveLength(RECORDINGS_PAGE_TAKE);
    expect(cursor?.id).toBe(last?.vodId);
    expect(cursor?.readyAt).toEqual(last?.readyAt);
  });
});

describe("getRecordingsList composite cursor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.db.vodAsset.findMany.mockResolvedValue([]);
  });

  it("최신순은 ready_at과 id 동률 해소 조건을 함께 적용한다", async () => {
    const readyAt = new Date("2026-08-26T10:30:00.000Z");
    const { getRecordingsList } = await import("./list");

    await getRecordingsList({
      sort: "latest",
      viewerId: 11,
      cursor: { sort: "latest", readyAt, id: 37, views: 125 },
      take: 13,
    });

    expect(mocks.db.vodAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              OR: [
                { ready_at: { lt: readyAt } },
                { ready_at: readyAt, id: { lt: 37 } },
              ],
            },
          ]),
        },
        orderBy: [{ ready_at: "desc" }, { id: "desc" }],
      })
    );
  });

  it("인기순은 views, ready_at, id 순서의 동률 해소 조건을 적용한다", async () => {
    const readyAt = new Date("2026-08-26T10:30:00.000Z");
    const { getRecordingsList } = await import("./list");

    await getRecordingsList({
      sort: "popular",
      viewerId: 11,
      cursor: { sort: "popular", readyAt, id: 37, views: 125 },
      take: 13,
    });

    expect(mocks.db.vodAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            {
              OR: [
                { views: { lt: 125 } },
                { views: 125, ready_at: { lt: readyAt } },
                { views: 125, ready_at: readyAt, id: { lt: 37 } },
              ],
            },
          ]),
        },
        orderBy: [{ views: "desc" }, { ready_at: "desc" }, { id: "desc" }],
      })
    );
  });
});

describe("getStreamsList thumbnail boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBlockedUserIds.mockResolvedValue([]);
    mocks.resolveStreamThumbnailUrl.mockImplementation(
      (source: string | null, providerId: string | null) =>
        providerId ? "signed-token-url" : source ? null : source
    );
  });

  it("PRIVATE 비소유자 목록은 provider 썸네일 발급 권한을 전달하지 않는다", async () => {
    mocks.db.broadcast.findMany.mockResolvedValue([createBroadcast("PRIVATE")]);
    const { getStreamsList } = await import("./list");

    const result = await getStreamsList({
      scope: "all",
      viewerId: 11,
      cursor: null,
      take: 13,
    });

    expect(mocks.resolveStreamThumbnailUrl).toHaveBeenCalledWith(
      expect.stringContaining("raw-id"),
      null
    );
    expect(result[0].thumbnail).toBeNull();
    expect(result[0]).not.toHaveProperty("provider_uid");
  });

  it("PUBLIC 목록은 Live Input ID를 서버 서명 입력으로만 사용한다", async () => {
    mocks.db.broadcast.findMany.mockResolvedValue([createBroadcast("PUBLIC")]);
    const { getStreamsList } = await import("./list");

    const result = await getStreamsList({
      scope: "all",
      viewerId: 11,
      cursor: null,
      take: 13,
    });

    expect(mocks.resolveStreamThumbnailUrl).toHaveBeenCalledWith(
      expect.stringContaining("raw-id"),
      "live-input-uid"
    );
    expect(result[0].thumbnail).toBe("signed-token-url");
    expect(JSON.stringify(result[0])).not.toContain("live-input-uid");
  });
});
