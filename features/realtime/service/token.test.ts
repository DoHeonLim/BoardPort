/**
 * File Name : features/realtime/service/token.test.ts
 * Description : Supabase Realtime 단기 JWT 서명·claim 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   사용자 경계·5분 만료·해제 방송 정규화 검증
 * 2026.08.21  임도헌   Modified  ES256 JWK header·P1363 서명과 설정 오류 검증
 */

import { generateKeyPairSync, verify } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let createRealtimeAccessToken: typeof import("./token").createRealtimeAccessToken;

beforeAll(async () => {
  ({ createRealtimeAccessToken } = await import("./token"));
});

describe("createRealtimeAccessToken", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const privateJwk = {
    ...privateKey.export({ format: "jwk" }),
    kid: "boardport-test-es256-key",
  };
  const signingKeyJwk = Buffer.from(JSON.stringify(privateJwk)).toString(
    "base64"
  );
  const now = new Date("2026-08-21T12:00:00.000Z");

  it("ES256 서명과 5분 만료의 authenticated claim을 발급한다", () => {
    const result = createRealtimeAccessToken({
      userId: 42,
      unlockedBroadcastIds: [8, 3, 8, -1, Number.NaN],
      now,
      signingKeyJwk,
    });
    const [header, payload, signature] = result.token.split(".");

    expect(
      JSON.parse(Buffer.from(header, "base64url").toString("utf8"))
    ).toEqual({
      alg: "ES256",
      kid: "boardport-test-es256-key",
      typ: "JWT",
    });
    expect(
      verify(
        "sha256",
        Buffer.from(`${header}.${payload}`),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature, "base64url")
      )
    ).toBe(true);
    expect(result.claims).toMatchObject({
      role: "authenticated",
      aud: "authenticated",
      boardport_user_id: 42,
      unlocked_broadcast_ids: ["3", "8"],
    });
    expect(result.claims.exp - result.claims.iat).toBe(300);
    expect(result.claims.sub).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("사용자 ID와 ES256 private JWK가 올바르지 않으면 발급하지 않는다", () => {
    expect(() =>
      createRealtimeAccessToken({ userId: 0, now, signingKeyJwk })
    ).toThrow("valid BoardPort user ID");
    expect(() =>
      createRealtimeAccessToken({ userId: 1, now, signingKeyJwk: "invalid" })
    ).toThrow("SUPABASE_REALTIME_SIGNING_KEY_JWK");
  });
});
