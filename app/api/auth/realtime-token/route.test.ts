/**
 * File Name : app/api/auth/realtime-token/route.test.ts
 * Description : Realtime private 채널 JWT 발급 API 인증 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   비로그인·정지 사용자 거절과 해제 방송 claim 전달 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: {
    id: undefined as number | undefined,
    unlockedBroadcastIds: undefined as Record<string, true> | undefined,
    destroy: vi.fn(),
  },
  findUnique: vi.fn(),
  createRealtimeAccessToken: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  default: vi.fn(async () => mocks.session),
}));
vi.mock("@/lib/db", () => ({
  default: { user: { findUnique: mocks.findUnique } },
}));
vi.mock("@/features/realtime/service/token", () => ({
  createRealtimeAccessToken: mocks.createRealtimeAccessToken,
}));

import { POST } from "./route";

beforeEach(() => {
  mocks.session.id = undefined;
  mocks.session.unlockedBroadcastIds = undefined;
  mocks.session.destroy.mockReset();
  mocks.findUnique.mockReset();
  mocks.createRealtimeAccessToken.mockReset();
});

describe("POST /api/auth/realtime-token", () => {
  it("로그인 세션이 없으면 DB를 조회하지 않고 401을 반환한다", async () => {
    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("현재 이용 정지된 사용자는 토큰을 발급하지 않는다", async () => {
    mocks.session.id = 9;
    mocks.findUnique.mockResolvedValue({
      id: 9,
      bannedAt: new Date("2026-08-20T00:00:00.000Z"),
      bannedUntil: new Date("9999-12-31T23:59:59.000Z"),
    });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.createRealtimeAccessToken).not.toHaveBeenCalled();
  });

  it("유효 세션의 private 방송 해제 ID만 토큰 서비스에 전달한다", async () => {
    mocks.session.id = 9;
    mocks.session.unlockedBroadcastIds = {
      "12": true,
      invalid: true,
    };
    mocks.findUnique.mockResolvedValue({
      id: 9,
      bannedAt: null,
      bannedUntil: null,
    });
    mocks.createRealtimeAccessToken.mockReturnValue({
      token: "signed-token",
      expiresAt: "2026-08-21T12:05:00.000Z",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.createRealtimeAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        unlockedBroadcastIds: [12, Number.NaN],
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      token: "signed-token",
    });
  });
});
