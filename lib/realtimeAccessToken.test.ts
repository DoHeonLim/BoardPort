/**
 * File Name : lib/realtimeAccessToken.test.ts
 * Description : 브라우저 Realtime JWT 활성화·캐시·무효화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   공개 화면 무요청과 private 구독 토큰 재사용·갱신 경계 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createTokenResponse(token: string, expiresAtMs: number) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      token,
      expiresAt: new Date(expiresAtMs).toISOString(),
    }),
  };
}

describe("Realtime access token cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("private 구독 활성화 전에는 토큰 API를 호출하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { provideRealtimeAccessToken } =
      await import("@/lib/realtimeAccessToken");

    await expect(provideRealtimeAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("활성화 후 서버 만료 30초 전까지 같은 토큰을 재사용한다", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          createTokenResponse("token", Date.now() + 5 * 60 * 1000)
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const { activateRealtimeAccessToken, provideRealtimeAccessToken } =
      await import("@/lib/realtimeAccessToken");

    activateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBe("token");
    vi.advanceTimersByTime(4 * 60 * 1000);
    await expect(provideRealtimeAccessToken()).resolves.toBe("token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("만료 여유가 30초 이하이면 새 토큰을 요청한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createTokenResponse("first-token", Date.now() + 5 * 60 * 1000)
      )
      .mockImplementation(() =>
        Promise.resolve(
          createTokenResponse("second-token", Date.now() + 5 * 60 * 1000)
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const { activateRealtimeAccessToken, provideRealtimeAccessToken } =
      await import("@/lib/realtimeAccessToken");

    activateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBe("first-token");
    vi.advanceTimersByTime(4 * 60 * 1000 + 31 * 1000);
    await expect(provideRealtimeAccessToken()).resolves.toBe("second-token");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("권한 변경으로 캐시를 폐기하면 활성 상태에서 새 토큰을 요청한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createTokenResponse("before-unlock", Date.now() + 5 * 60 * 1000)
      )
      .mockResolvedValueOnce(
        createTokenResponse("after-unlock", Date.now() + 5 * 60 * 1000)
      );
    vi.stubGlobal("fetch", fetchMock);
    const {
      activateRealtimeAccessToken,
      invalidateRealtimeAccessToken,
      provideRealtimeAccessToken,
    } = await import("@/lib/realtimeAccessToken");

    activateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBe("before-unlock");
    invalidateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBe("after-unlock");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("인증 종료 뒤에는 캐시와 후속 토큰 요청을 함께 비활성화한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createTokenResponse("token", Date.now() + 5 * 60 * 1000)
      );
    vi.stubGlobal("fetch", fetchMock);
    const {
      activateRealtimeAccessToken,
      deactivateRealtimeAccessToken,
      provideRealtimeAccessToken,
    } = await import("@/lib/realtimeAccessToken");

    activateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBe("token");
    deactivateRealtimeAccessToken();
    await expect(provideRealtimeAccessToken()).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
