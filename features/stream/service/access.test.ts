/**
 * File Name : features/stream/service/access.test.ts
 * Description : 방송·VOD 공용 접근 권한 서비스 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   차단·팔로우·PRIVATE 언락과 VOD 부모 정책 통합 판정 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    broadcast: { findUnique: vi.fn() },
    vodAsset: { findUnique: vi.fn() },
    follow: { findUnique: vi.fn() },
  },
  checkBlockRelation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/user/service/block", () => ({
  checkBlockRelation: mocks.checkBlockRelation,
}));

const broadcast = {
  id: 31,
  visibility: "PUBLIC" as const,
  liveInput: {
    provider_uid: "live-input-uid",
    userId: 7,
    user: { username: "captain" },
  },
};

const vod = {
  id: 91,
  provider_asset_id: "vod-asset-uid",
  broadcast,
};

describe("stream access authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.broadcast.findUnique.mockResolvedValue(broadcast);
    mocks.db.vodAsset.findUnique.mockResolvedValue(vod);
    mocks.db.follow.findUnique.mockResolvedValue(null);
    mocks.checkBlockRelation.mockResolvedValue(false);
  });

  it("PUBLIC 방송은 비로그인 방문자도 공개 정책상 허용한다", async () => {
    const { authorizeBroadcastAccess } = await import("./access");

    const result = await authorizeBroadcastAccess(broadcast.id, null);

    expect(result).toMatchObject({
      allowed: true,
      reason: null,
      role: "VISITOR",
      subject: { broadcastId: broadcast.id, ownerId: 7 },
    });
    expect(mocks.checkBlockRelation).not.toHaveBeenCalled();
  });

  it("FOLLOWERS 방송은 실제 팔로우 관계가 있는 조회자만 허용한다", async () => {
    mocks.db.broadcast.findUnique.mockResolvedValue({
      ...broadcast,
      visibility: "FOLLOWERS",
    });
    mocks.db.follow.findUnique.mockResolvedValue({ followerId: 11 });
    const { authorizeBroadcastAccess } = await import("./access");

    const result = await authorizeBroadcastAccess(broadcast.id, 11);

    expect(result).toMatchObject({ allowed: true, role: "FOLLOWER" });
  });

  it("PRIVATE VOD는 부모 방송 ID가 현재 세션에서 언락된 경우만 허용한다", async () => {
    mocks.db.vodAsset.findUnique.mockResolvedValue({
      ...vod,
      broadcast: { ...broadcast, visibility: "PRIVATE" },
    });
    const { authorizeVodAccess } = await import("./access");

    const denied = await authorizeVodAccess(vod.id, 11, {
      unlockedBroadcastIds: {},
    });
    const allowed = await authorizeVodAccess(vod.id, 11, {
      unlockedBroadcastIds: { [String(broadcast.id)]: true },
    });

    expect(denied).toMatchObject({ allowed: false, reason: "PRIVATE" });
    expect(allowed).toMatchObject({
      allowed: true,
      subject: { vodId: vod.id, providerAssetId: "vod-asset-uid" },
    });
  });

  it("공개 설정보다 양방향 차단을 우선해 접근을 거부한다", async () => {
    mocks.checkBlockRelation.mockResolvedValue(true);
    const { authorizeVodAccess } = await import("./access");

    const result = await authorizeVodAccess(vod.id, 11);

    expect(result).toMatchObject({ allowed: false, reason: "BLOCKED" });
  });

  it("소유자는 팔로우·차단 조회 없이 모든 공개 범위에 접근한다", async () => {
    mocks.db.broadcast.findUnique.mockResolvedValue({
      ...broadcast,
      visibility: "PRIVATE",
    });
    const { authorizeBroadcastAccess } = await import("./access");

    const result = await authorizeBroadcastAccess(broadcast.id, 7);

    expect(result).toMatchObject({ allowed: true, role: "OWNER" });
    expect(mocks.db.follow.findUnique).not.toHaveBeenCalled();
    expect(mocks.checkBlockRelation).not.toHaveBeenCalled();
  });

  it("존재하지 않는 ID는 subject를 노출하지 않고 NOT_FOUND로 거부한다", async () => {
    mocks.db.vodAsset.findUnique.mockResolvedValue(null);
    const { authorizeVodAccess } = await import("./access");

    const result = await authorizeVodAccess(999, 11);

    expect(result).toEqual({
      allowed: false,
      reason: "NOT_FOUND",
      role: "VISITOR",
      subject: null,
    });
  });
});
