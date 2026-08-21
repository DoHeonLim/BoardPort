/**
 * File Name : features/stream/service/playback.test.ts
 * Description : Cloudflare Stream 단기 재생 토큰 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   서명·만료 상한과 환경변수 누락 시 fail-closed 동작 검증
 * 2026.08.21  임도헌   Modified  저장된 provider 썸네일의 signed 변환·접근 거부·일반 이미지 유지 검증
 */

import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function decodePart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

describe("createStreamPlaybackToken", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_STREAM_SIGNING_KEY_ID", "test-key-id");
    vi.stubEnv(
      "NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN",
      "https://customer.example.cloudflarestream.com/"
    );
    vi.stubEnv(
      "CLOUDFLARE_STREAM_SIGNING_KEY_JWK",
      Buffer.from(
        JSON.stringify(privateKey.export({ format: "jwk" })),
        "utf8"
      ).toString("base64")
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("provider ID와 만료 시각을 담은 RS256 JWT를 발급한다", async () => {
    const { createStreamPlaybackToken } = await import("./playback");
    const token = createStreamPlaybackToken("provider-uid", {
      now: new Date("2026-08-21T00:00:00.000Z"),
      ttlSeconds: 600,
    });
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

    expect(decodePart(encodedHeader)).toEqual({
      alg: "RS256",
      kid: "test-key-id",
    });
    expect(decodePart(encodedPayload)).toEqual({
      sub: "provider-uid",
      kid: "test-key-id",
      exp: 1_787_271_000,
    });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${encodedHeader}.${encodedPayload}`),
        publicKey,
        Buffer.from(encodedSignature, "base64url")
      )
    ).toBe(true);
  });

  it("요청 TTL이 길어도 한 시간으로 제한한다", async () => {
    const { createStreamPlaybackToken } = await import("./playback");
    const token = createStreamPlaybackToken("provider-uid", {
      now: new Date(0),
      ttlSeconds: 86_400,
    });
    const payload = decodePart<{ exp: number }>(token.split(".")[1]);

    expect(payload.exp).toBe(3_600);
  });

  it("signing key가 없으면 원본 ID를 반환하지 않고 실패한다", async () => {
    vi.stubEnv("CLOUDFLARE_STREAM_SIGNING_KEY_ID", "");
    vi.stubEnv("CLOUDFLARE_STREAM_SIGNING_KEY_JWK", "");
    const {
      createStreamPlaybackToken,
      StreamPlaybackConfigurationError,
    } = await import("./playback");

    expect(() => createStreamPlaybackToken("provider-uid")).toThrow(
      StreamPlaybackConfigurationError
    );
  });

  it("thumbnail URL에도 원본 ID 대신 signed token을 사용한다", async () => {
    const { createStreamThumbnailUrl } = await import("./playback");

    const url = createStreamThumbnailUrl("provider-uid");

    expect(url).toMatch(
      /^https:\/\/customer\.example\.cloudflarestream\.com\/[^/]+\/thumbnails\/thumbnail\.jpg$/
    );
    expect(url).not.toContain("/provider-uid/");
  });

  it("저장된 Cloudflare 원본 썸네일을 새 signed URL로 교체한다", async () => {
    const { resolveStreamThumbnailUrl } = await import("./playback");

    const url = resolveStreamThumbnailUrl(
      "https://customer.example.cloudflarestream.com/raw-asset-id/thumbnails/thumbnail.jpg",
      "authorized-provider-id"
    );

    expect(url).toMatch(
      /^https:\/\/customer\.example\.cloudflarestream\.com\/[^/]+\/thumbnails\/thumbnail\.jpg$/
    );
    expect(url).not.toContain("raw-asset-id");
    expect(url).not.toContain("authorized-provider-id");
  });

  it("provider 썸네일은 접근 가능한 provider ID가 없으면 숨긴다", async () => {
    const { resolveStreamThumbnailUrl } = await import("./playback");

    expect(
      resolveStreamThumbnailUrl(
        "https://videodelivery.net/raw-asset-id/thumbnails/thumbnail.jpg",
        null
      )
    ).toBeNull();
  });

  it("playback domain 환경변수가 잘못돼도 알려진 provider 원본 URL은 노출하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN", "not-a-url");
    const { resolveStreamThumbnailUrl } = await import("./playback");

    expect(
      resolveStreamThumbnailUrl(
        "https://customer.example.cloudflarestream.com/raw-asset-id/thumbnails/thumbnail.jpg",
        null
      )
    ).toBeNull();
  });

  it("Cloudflare Images 등 일반 썸네일 URL은 그대로 유지한다", async () => {
    const { resolveStreamThumbnailUrl } = await import("./playback");
    const imageUrl = "https://imagedelivery.net/account/image/public";

    expect(resolveStreamThumbnailUrl(imageUrl, null)).toBe(imageUrl);
  });
});
