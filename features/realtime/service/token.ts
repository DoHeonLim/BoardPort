/**
 * File Name : features/realtime/service/token.ts
 * Description : BoardPort 세션을 Supabase Realtime 단기 JWT로 변환
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   HS256 서명·짧은 만료·BoardPort 사용자 claim 발급
 * 2026.08.21  임도헌   Modified  Supabase 권장 ES256 private JWK 서명으로 전환
 */

import "server-only";
import {
  createHash,
  createPrivateKey,
  sign,
  type JsonWebKey,
} from "node:crypto";

const REALTIME_TOKEN_TTL_SECONDS = 5 * 60;

export interface RealtimeAccessClaims {
  iss: "boardport";
  aud: "authenticated";
  role: "authenticated";
  sub: string;
  boardport_user_id: number;
  unlocked_broadcast_ids: string[];
  iat: number;
  exp: number;
}

type PrivateEcJwk = JsonWebKey & {
  kty: "EC";
  crv: "P-256";
  kid: string;
  d: string;
  x: string;
  y: string;
};

let cachedSigningKey:
  | {
      fingerprint: string;
      keyId: string;
      privateKey: ReturnType<typeof createPrivateKey>;
    }
  | undefined;

/** 문자열을 JWT 규격의 base64url 값으로 인코딩한다. */
function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

/** BoardPort 사용자 ID로 Supabase Auth와 분리된 안정적인 UUID subject를 만든다. */
function createStableSubject(userId: number) {
  const hex = createHash("sha256")
    .update(`boardport-realtime:${userId}`)
    .digest("hex")
    .slice(0, 32)
    .split("");

  // Supabase Auth UUID와 연결하지 않는 별도 식별자지만 JWT sub 형식은 UUID로 유지한다.
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(
    12,
    16
  )}-${value.slice(16, 20)}-${value.slice(20)}`;
}

/** private 방송 해제 ID를 유효한 양의 정수 목록으로 정규화한다. */
function normalizeUnlockedBroadcastIds(ids: number[]) {
  return Array.from(
    new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))
  )
    .sort((a, b) => a - b)
    .map(String);
}

/** 환경변수의 ES256 private JWK를 검증하고 재사용 가능한 서명 키로 변환한다. */
function readSigningKey(encodedOrJsonJwk: string | undefined) {
  const configuredJwk = encodedOrJsonJwk?.trim();
  if (!configuredJwk) {
    throw new Error("SUPABASE_REALTIME_SIGNING_KEY_JWK is required");
  }
  if (cachedSigningKey?.fingerprint === configuredJwk) {
    return cachedSigningKey;
  }

  try {
    // Vercel에는 원문 JSON도 넣을 수 있지만, 로컬 .env와 GitHub Secrets에서는
    // 개행·따옴표 문제를 피하도록 base64 인코딩 값을 권장한다.
    const json = configuredJwk.startsWith("{")
      ? configuredJwk
      : Buffer.from(configuredJwk, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<PrivateEcJwk>;

    if (
      parsed.kty !== "EC" ||
      parsed.crv !== "P-256" ||
      typeof parsed.kid !== "string" ||
      !parsed.kid ||
      typeof parsed.d !== "string" ||
      typeof parsed.x !== "string" ||
      typeof parsed.y !== "string"
    ) {
      throw new Error("ES256 P-256 private JWK가 아닙니다.");
    }

    cachedSigningKey = {
      fingerprint: configuredJwk,
      keyId: parsed.kid,
      privateKey: createPrivateKey({
        key: parsed as PrivateEcJwk,
        format: "jwk",
      }),
    };
    return cachedSigningKey;
  } catch (error) {
    throw new Error(
      `SUPABASE_REALTIME_SIGNING_KEY_JWK를 읽을 수 없습니다: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

/** BoardPort 세션 권한을 5분 유효한 Supabase Realtime ES256 JWT로 변환한다. */
export function createRealtimeAccessToken({
  userId,
  unlockedBroadcastIds = [],
  now = new Date(),
  signingKeyJwk = process.env.SUPABASE_REALTIME_SIGNING_KEY_JWK,
}: {
  userId: number;
  unlockedBroadcastIds?: number[];
  now?: Date;
  signingKeyJwk?: string;
}) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("A valid BoardPort user ID is required");
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const claims: RealtimeAccessClaims = {
    iss: "boardport",
    aud: "authenticated",
    role: "authenticated",
    sub: createStableSubject(userId),
    boardport_user_id: userId,
    unlocked_broadcast_ids: normalizeUnlockedBroadcastIds(unlockedBroadcastIds),
    iat: issuedAt,
    exp: issuedAt + REALTIME_TOKEN_TTL_SECONDS,
  };
  const { keyId, privateKey } = readSigningKey(signingKeyJwk);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" } as const;
  const unsignedToken = `${encodeBase64Url(
    JSON.stringify(header)
  )}.${encodeBase64Url(JSON.stringify(claims))}`;
  // JWT ES256은 DER이 아닌 64-byte IEEE P1363(r || s) 서명 형식을 사용한다.
  const signature = sign("sha256", Buffer.from(unsignedToken), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    claims,
  };
}
