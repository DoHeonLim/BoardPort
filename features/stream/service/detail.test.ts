/**
 * File Name : features/stream/service/detail.test.ts
 * Description : 방송·녹화본 상세 조회의 미존재·DB 실패 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.07  임도헌   Created   실제 미존재와 DB 실패를 구분하고 방송 cache 밖 오류 전파를 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
