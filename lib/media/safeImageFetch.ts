/**
 * File Name : lib/media/safeImageFetch.ts
 * Description : OG 이미지 생성용 제한된 원격 이미지 조회 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   HTTPS/host/DNS/redirect/timeout/byte/content-type 제한 추가
 */
import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const FETCH_TIMEOUT_MS = 3_000;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version !== 6) return true;

  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.slice("::ffff:".length));
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

function configuredStreamHostname(): string | null {
  const value = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isAllowedOgImageHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "imagedelivery.net" ||
    normalized === configuredStreamHostname()
  );
}

async function validateRemoteUrl(input: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !isAllowedOgImageHostname(url.hostname)
  ) {
    return null;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (
      addresses.length === 0 ||
      addresses.some((entry) => isPrivateIpAddress(entry.address))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return url;
}

/** 안전 조건을 하나라도 만족하지 않으면 예외 대신 null로 폴백한다. */
export async function fetchSafeOgImage(
  src: string | null | undefined
): Promise<Buffer | null> {
  if (!src) return null;
  let current = src;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const url = await validateRemoteUrl(current);
    if (!url) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirectCount === MAX_REDIRECTS) return null;
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok || !response.body) return null;

      const contentType = response.headers.get("content-type")?.split(";", 1)[0];
      if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
        return null;
      }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) return null;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks, total);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

export const SAFE_OG_IMAGE_MAX_PIXELS = 20_000_000;
