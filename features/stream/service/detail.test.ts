/**
 * File Name : features/stream/service/detail.test.ts
 * Description : 방송·녹화본 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.07  임도헌   Created   실제 미존재와 DB 실패를 구분하고 방송 cache 밖 오류 전파를 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  broadcastFindUnique: vi.fn(),
  vodAssetFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    broadcast: { findUnique: mocks.broadcastFindUnique },
    vodAsset: { findUnique: mocks.vodAssetFindUnique },
  },
}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

describe("stream detail lookup boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("현재 계정의 Cloudflare Images 썸네일만 사용자 수정 대상으로 구분한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH", "account");
    mocks.broadcastFindUnique.mockResolvedValue({
      title: "라이브 방송",
      thumbnail: "https://imagedelivery.net/account/user-image",
      thumbnailAnimated: true,
      description: null,
      pinnedChatNotice: null,
      started_at: null,
      status: "DISCONNECTED",
      visibility: "PUBLIC",
      liveInput: {
        userId: 7,
        user: { id: 7, username: "captain", avatar: null },
      },
      category: null,
      tags: [],
      board_games: [],
    });
    const { getBroadcastDetail } = await import("./detail");

    const result = await getBroadcastDetail(10);

    expect(result).toMatchObject({
      thumbnail: "https://imagedelivery.net/account/user-image",
      customThumbnail: "https://imagedelivery.net/account/user-image",
      thumbnailAnimated: true,
    });
  });

  it("Cloudflare Stream 자동 썸네일은 사용자 수정 대상에서 제외한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH", "account");
    mocks.broadcastFindUnique.mockResolvedValue({
      title: "라이브 방송",
      thumbnail:
        "https://customer.example.com/provider-id/thumbnails/thumbnail.jpg",
      thumbnailAnimated: false,
      description: null,
      pinnedChatNotice: null,
      started_at: null,
      status: "CONNECTED",
      visibility: "PUBLIC",
      liveInput: {
        userId: 7,
        user: { id: 7, username: "captain", avatar: null },
      },
      category: null,
      tags: [],
      board_games: [],
    });
    const { getBroadcastDetail } = await import("./detail");

    const result = await getBroadcastDetail(10);

    expect(result?.customThumbnail).toBeNull();
    expect(result?.thumbnail).toContain("thumbnails/thumbnail.jpg");
  });

  it("실제로 존재하지 않는 방송만 null로 반환한다", async () => {
    mocks.broadcastFindUnique.mockResolvedValue(null);
    const { getBroadcastDetail } = await import("./detail");

    await expect(getBroadcastDetail(404)).resolves.toBeNull();
  });

  it("필수 liveInput 관계가 없는 방송을 미존재로 처리한다", async () => {
    mocks.broadcastFindUnique.mockResolvedValue({ liveInput: null });
    const { getBroadcastDetail } = await import("./detail");

    await expect(getBroadcastDetail(404)).resolves.toBeNull();
  });

  it("방송 DB 조회 실패를 cache 밖으로 전파한다", async () => {
    const databaseError = new Error("database unavailable");
    mocks.broadcastFindUnique.mockRejectedValue(databaseError);
    const { getCachedBroadcastDetail } = await import("./detail");

    await expect(getCachedBroadcastDetail(91)).rejects.toBe(databaseError);
  });

  it("녹화본 DB 조회 실패도 미존재로 변환하지 않는다", async () => {
    const databaseError = new Error("vod query failed");
    mocks.vodAssetFindUnique.mockRejectedValue(databaseError);
    const { getVodDetail } = await import("./detail");

    await expect(getVodDetail(91)).rejects.toBe(databaseError);
  });

  it("녹화본 사용자 제목과 썸네일을 부모 방송과 분리해 반환한다", async () => {
    mocks.vodAssetFindUnique.mockResolvedValue({
      id: 21,
      title: "사용자 지정 녹화본",
      custom_thumbnail_url: "https://imagedelivery.net/account/vod-image",
      thumbnailAnimated: true,
      duration_sec: 120,
      ready_at: new Date("2026-09-08T09:00:00.000Z"),
      created_at: new Date("2026-09-08T08:00:00.000Z"),
      views: 3,
      _count: { recordingLikes: 1, recordingComments: 2 },
      broadcast: {
        id: 10,
        title: "부모 방송 제목",
        visibility: "PUBLIC",
        liveInput: {
          user: { id: 7, username: "captain", avatar: null },
        },
        category: null,
        tags: [],
        board_games: [],
      },
    });
    const { getVodDetail } = await import("./detail");

    const result = await getVodDetail(21);

    expect(result).toMatchObject({
      title: "사용자 지정 녹화본",
      customThumbnail: "https://imagedelivery.net/account/vod-image",
      thumbnailAnimated: true,
      broadcast: { title: "부모 방송 제목" },
    });
  });
});
