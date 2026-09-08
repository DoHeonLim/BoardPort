/**
 * File Name : lib/supabase.test.ts
 * Description : 브라우저 Supabase 클라이언트의 지연 Realtime 인증 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   만료 전 재사용·갱신 여유·권한 변경 무효화 검증
 * 2026.08.30  임도헌   Modified  공개 import 무요청과 private 구독 시점 인증 활성화 검증으로 분리
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  setAuth: vi.fn(),
  accessToken: undefined as undefined | (() => Promise<string | null>),
  initialAuth: undefined as undefined | Promise<void>,
  authTokens: [] as Array<string | null>,
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
    if (!mocks.accessToken) throw new Error("accessToken callback was not set");

    mocks.setAuth.mockImplementation(async (...args: [string?]) => {
      const token =
        args.length > 0 ? (args[0] ?? null) : await mocks.accessToken?.();
      mocks.authTokens.push(token ?? null);
    });

    // Supabase JS가 accessToken 옵션을 받으면 클라이언트 생성 직후 실행하는 인증을 재현한다.
    mocks.initialAuth = Promise.resolve(mocks.accessToken()).then((token) =>
      mocks.setAuth(token ?? undefined)
    );

    return {
      realtime: { setAuth: mocks.setAuth },
    };
  });

  const supabaseModule = await import("@/lib/supabase");
  await mocks.initialAuth;
  return supabaseModule;
}

describe("Supabase Realtime authorization boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T00:00:00.000Z"));
    mocks.accessToken = undefined;
    mocks.initialAuth = undefined;
    mocks.authTokens = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("공개 화면에서 모듈만 불러오면 Realtime 토큰을 요청하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await loadSupabaseModule();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.authTokens).toEqual([null]);
  });

  it("private 채널 구독 직전에 토큰을 발급하고 채널을 연결한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createTokenResponse("private-token", Date.now() + 5 * 60 * 1000)
      );
    vi.stubGlobal("fetch", fetchMock);
    const { subscribePrivateRealtimeChannel } = await loadSupabaseModule();
    const channel = { subscribe: vi.fn() };

    await expect(
      subscribePrivateRealtimeChannel(channel as never)
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.authTokens).toEqual([null, "private-token"]);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it("여러 private 채널은 만료 여유가 있는 토큰을 함께 재사용한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createTokenResponse("shared-token", Date.now() + 5 * 60 * 1000)
      );
    vi.stubGlobal("fetch", fetchMock);
    const { subscribePrivateRealtimeChannel } = await loadSupabaseModule();

    await subscribePrivateRealtimeChannel({ subscribe: vi.fn() } as never);
    await subscribePrivateRealtimeChannel({ subscribe: vi.fn() } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.authTokens).toEqual([null, "shared-token", "shared-token"]);
  });
});
