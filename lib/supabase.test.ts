/**
 * File Name : lib/supabase.test.ts
 * Description : 브라우저 Realtime JWT 캐시·무효화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   만료 전 재사용·갱신 여유·권한 변경 무효화 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  setAuth: vi.fn(),
  accessToken: undefined as undefined | (() => Promise<string>),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

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

async function loadSupabaseModule() {
  mocks.createClient.mockImplementation((_url, _key, options) => {
    mocks.accessToken = options?.accessToken;
    return {
      realtime: { setAuth: mocks.setAuth },
    };
  });

  const supabaseModule = await import("@/lib/supabase");
  if (!mocks.accessToken) throw new Error("accessToken callback was not set");
  return { ...supabaseModule, accessToken: mocks.accessToken };
}

describe("Realtime access token cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T00:00:00.000Z"));
    mocks.accessToken = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("서버 만료 30초 전까지 같은 토큰을 재사용한다", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        createTokenResponse("token", Date.now() + 5 * 60 * 1000)
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { accessToken } = await loadSupabaseModule();

    await expect(accessToken()).resolves.toBe("token");
    vi.advanceTimersByTime(4 * 60 * 1000);
    await expect(accessToken()).resolves.toBe("token");

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
    const { accessToken } = await loadSupabaseModule();

    await expect(accessToken()).resolves.toBe("first-token");
    vi.advanceTimersByTime(4 * 60 * 1000 + 31 * 1000);
    await expect(accessToken()).resolves.toBe("second-token");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("PRIVATE 권한 변경으로 캐시를 폐기하면 즉시 새 토큰을 요청한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createTokenResponse("before-unlock", Date.now() + 5 * 60 * 1000)
      )
      .mockResolvedValueOnce(
        createTokenResponse("after-unlock", Date.now() + 5 * 60 * 1000)
      );
    vi.stubGlobal("fetch", fetchMock);
    const { accessToken, invalidateRealtimeAccessToken } =
      await loadSupabaseModule();

    await expect(accessToken()).resolves.toBe("before-unlock");
    invalidateRealtimeAccessToken();
    await expect(accessToken()).resolves.toBe("after-unlock");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
