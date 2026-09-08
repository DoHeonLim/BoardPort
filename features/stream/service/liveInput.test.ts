/**
 * File Name : features/stream/service/liveInput.test.ts
 * Description : Cloudflare Live Input signed playback 생성 정책 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   신규 Live Input의 원격·DB signed URL 필수 설정 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    liveInput: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  fetch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/lib/errors", () => ({
  isUniqueConstraintError: vi.fn(() => false),
}));

describe("ensureLiveInput signed playback policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "account-id");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token");
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.db.liveInput.findUnique.mockResolvedValue(null);
    mocks.db.liveInput.create.mockResolvedValue({
      id: 3,
      provider_uid: "live-input-uid",
      stream_key: "stream-key",
    });
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            uid: "live-input-uid",
            rtmps: {
              url: "rtmps://live.cloudflare.com:443/live/",
              streamKey: "stream-key",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("Cloudflare 요청과 DB row 모두 requireSignedURLs=true로 생성한다", async () => {
    const { ensureLiveInput } = await import("./liveInput");

    await ensureLiveInput(7, "captain");

    const request = mocks.fetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      recording: { mode: "automatic", requireSignedURLs: true },
    });
    expect(mocks.db.liveInput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requireSignedURLs: true }),
      })
    );
  });
});
