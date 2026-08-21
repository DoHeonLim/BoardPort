/**
 * File Name : features/stream/service/playback.ts
 * Description : Cloudflare Stream 권한 기반 단기 재생 토큰 발급
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   원본 provider UID 대신 전달할 RS256 signed playback token 발급
 * 2026.08.21  임도헌   Modified  저장된 Cloudflare 원본 썸네일을 접근 범위에 따라 signed URL 또는 null로 정규화
 */

import "server-only";
import { createPrivateKey, sign, type JsonWebKey } from "node:crypto";

// Cloudflare 기본 signed token과 같은 1시간을 사용해 장시간 재생과 권한 회수 지연의 균형을 맞춘다.
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60;
const MAX_TOKEN_TTL_SECONDS = 60 * 60;

type JsonWebKeyWithPrivateRsa = JsonWebKey & {
  kty: "RSA";
  d: string;
};

let cachedSigningKey:
  | {
      fingerprint: string;
      keyId: string;
      privateKey: ReturnType<typeof createPrivateKey>;
    }
  | undefined;

export class StreamPlaybackConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamPlaybackConfigurationError";
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function readSigningKey(): {
  keyId: string;
  privateKey: ReturnType<typeof createPrivateKey>;
} {
  const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID?.trim();
  const encodedJwk =
    process.env.CLOUDFLARE_STREAM_SIGNING_KEY_JWK?.trim();

  if (!keyId || !encodedJwk) {
    throw new StreamPlaybackConfigurationError(
      "Cloudflare Stream signing key가 설정되지 않았습니다."
    );
  }

  const fingerprint = `${keyId}\u0000${encodedJwk}`;
  if (cachedSigningKey?.fingerprint === fingerprint) {
    return cachedSigningKey;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedJwk, "base64").toString("utf8")
    ) as Partial<JsonWebKeyWithPrivateRsa>;

    if (parsed.kty !== "RSA" || typeof parsed.d !== "string") {
      throw new Error("RSA private JWK가 아닙니다.");
    }

    cachedSigningKey = {
      fingerprint,
      keyId,
      privateKey: createPrivateKey({
        key: parsed as JsonWebKeyWithPrivateRsa,
        format: "jwk",
      }),
    };
    return cachedSigningKey;
  } catch (error) {
    throw new StreamPlaybackConfigurationError(
      `Cloudflare Stream signing JWK를 읽을 수 없습니다: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }
}

/**
 * 접근 판정이 끝난 provider ID에만 사용할 단기 JWT를 발급한다.
 * 환경변수나 private key가 잘못되면 원본 ID로 되돌아가지 않고 실패한다.
 */
export function createStreamPlaybackToken(
  providerId: string,
  options: { now?: Date; ttlSeconds?: number } = {}
): string {
  const normalizedProviderId = providerId.trim();
  if (!normalizedProviderId) {
    throw new StreamPlaybackConfigurationError(
      "Cloudflare Stream provider ID가 비어 있습니다."
    );
  }

  const requestedTtl = options.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  if (!Number.isSafeInteger(requestedTtl) || requestedTtl <= 0) {
    throw new StreamPlaybackConfigurationError(
      "Cloudflare Stream token TTL이 올바르지 않습니다."
    );
  }

  const ttlSeconds = Math.min(requestedTtl, MAX_TOKEN_TTL_SECONDS);
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const { keyId, privateKey } = readSigningKey();
  const header = encodeJson({ alg: "RS256", kid: keyId });
  const payload = encodeJson({
    sub: normalizedProviderId,
    kid: keyId,
    exp: nowSeconds + ttlSeconds,
  });
  const signingInput = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey);

  return `${signingInput}.${signature.toString("base64url")}`;
}

/** Cloudflare 기본 thumbnail 경로도 원본 ID 대신 signed token으로 구성한다. */
export function createStreamThumbnailUrl(providerId: string): string {
  const domain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN
    ?.trim()
    .replace(/\/+$/, "");
  if (!domain) {
    throw new StreamPlaybackConfigurationError(
      "Cloudflare Stream playback domain이 설정되지 않았습니다."
    );
  }

  return `${domain}/${createStreamPlaybackToken(providerId)}/thumbnails/thumbnail.jpg`;
}

function isCloudflareStreamAssetUrl(value: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }

  let configuredHostname: string | null = null;
  try {
    configuredHostname = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN
      ? new URL(process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN).hostname.toLowerCase()
      : null;
  } catch {
    // 알려진 Cloudflare 기본 host 판정은 환경변수 파싱 실패와 독립적으로 유지한다.
  }

  return (
    hostname === configuredHostname ||
    hostname === "cloudflarestream.com" ||
    hostname.endsWith(".cloudflarestream.com") ||
    hostname === "videodelivery.net" ||
    hostname.endsWith(".videodelivery.net")
  );
}

/**
 * DB에 저장된 썸네일이 Cloudflare Stream 원본 URL이면 UID가 포함된 URL을 그대로
 * 반환하지 않는다. 접근이 허용된 provider ID가 있으면 새 signed URL로 교체하고,
 * 없으면 null로 숨긴다. 사용자가 업로드한 일반 이미지 URL은 그대로 유지한다.
 */
export function resolveStreamThumbnailUrl(
  sourceUrl: string | null | undefined,
  authorizedProviderId: string | null
): string | null {
  if (!sourceUrl) return null;
  if (!isCloudflareStreamAssetUrl(sourceUrl)) return sourceUrl;
  if (!authorizedProviderId) return null;
  return createStreamThumbnailUrl(authorizedProviderId);
}
