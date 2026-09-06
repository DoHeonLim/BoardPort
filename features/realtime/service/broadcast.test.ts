/**
 * File Name : features/realtime/service/broadcast.test.ts
 * Description : Supabase Realtime 서버 private Broadcast 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   secret 인증·private 강제·비치명적 실패 검증
 * 2026.08.21  임도헌   Modified  Broadcast REST 공식 apikey 전용 인증 검증
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let sendPrivateRealtimeBroadcast: typeof import("./broadcast").sendPrivateRealtimeBroadcast;

beforeAll(async () => {
  ({ sendPrivateRealtimeBroadcast } = await import("./broadcast"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendPrivateRealtimeBroadcast", () => {
  it("server secret으로 REST endpoint에 private 메시지만 전송한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));

    await expect(
      sendPrivateRealtimeBroadcast("user:4:notifications", {
        type: "broadcast",
        event: "notification",
        payload: { id: 10 },
      })
    ).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://project.supabase.co/realtime/v1/api/broadcast"
    );
    expect(init?.headers).toEqual({
      apikey: "sb_secret_test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      messages: [
        {
          topic: "user:4:notifications",
          event: "notification",
          payload: { id: 10 },
          private: true,
        },
      ],
    });
  });

  it("설정 누락이나 HTTP 실패를 핵심 DB 작업에 전파하지 않는다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(
      sendPrivateRealtimeBroadcast("stream:status", {
        type: "broadcast",
        event: "status",
        payload: { broadcastId: 1 },
      })
    ).resolves.toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 })
    );
    await expect(
      sendPrivateRealtimeBroadcast("stream:status", {
        type: "broadcast",
        event: "status",
        payload: { broadcastId: 1 },
      })
    ).resolves.toBe(false);
  });
});
