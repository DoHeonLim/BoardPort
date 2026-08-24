/**
 * File Name : lib/supabase.ts
 * Description : 세션 JWT로 private 채널만 구독하는 브라우저 Supabase 클라이언트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.19  임도헌   Created
 * 2024.12.19  임도헌   Modified  supabase 클라이언트 코드 분리
 * 2026.08.21  임도헌   Modified  단기 JWT 주입과 private 채널 구독 준비 경계 추가
 * 2026.08.22  임도헌   Modified  Realtime heartbeat의 반복 발급을 막는 만료 기반 JWT 캐시·무효화 추가
 */

"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

let pendingTokenRequest: Promise<string> | null = null;
let cachedAccessToken:
  | {
      token: string;
      expiresAtMs: number;
    }
  | undefined;
let tokenCacheGeneration = 0;

// heartbeat 갱신 중 만료되는 경계를 피하도록 서버 만료보다 30초 먼저 새 토큰을 받는다.
const REALTIME_TOKEN_REFRESH_BUFFER_MS = 30_000;

/** 계정·권한 변경 뒤 브라우저에 남은 Realtime JWT 캐시를 즉시 폐기한다. */
export function invalidateRealtimeAccessToken() {
  tokenCacheGeneration += 1;
  cachedAccessToken = undefined;
  pendingTokenRequest = null;
}

/** 만료 여유가 있는 JWT는 재사용하고 필요할 때만 발급 API를 다시 호출한다. */
async function requestRealtimeAccessToken() {
  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAtMs - Date.now() >
      REALTIME_TOKEN_REFRESH_BUFFER_MS
  ) {
    return cachedAccessToken.token;
  }

  if (!pendingTokenRequest) {
    const requestGeneration = tokenCacheGeneration;
    const tokenRequest = fetch("/api/auth/realtime-token", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      const body = (await response.json().catch(() => null)) as {
        token?: unknown;
        expiresAt?: unknown;
      } | null;
      const expiresAtMs =
        typeof body?.expiresAt === "string"
          ? Date.parse(body.expiresAt)
          : Number.NaN;
      if (
        !response.ok ||
        typeof body?.token !== "string" ||
        !Number.isFinite(expiresAtMs) ||
        expiresAtMs <= Date.now()
      ) {
        throw new Error(`Realtime token request failed (${response.status})`);
      }
      // 요청 도중 PRIVATE 언락 등으로 권한이 바뀌었다면 이전 claim을 캐시하지 않는다.
      if (requestGeneration === tokenCacheGeneration) {
        cachedAccessToken = { token: body.token, expiresAtMs };
      }
      return body.token;
    });
    pendingTokenRequest = tokenRequest;
    // 무효화 직후 새 요청이 시작됐다면 먼저 끝난 이전 요청이 새 pending 값을 지우지 않는다.
    void tokenRequest.then(
      () => {
        if (pendingTokenRequest === tokenRequest) pendingTokenRequest = null;
      },
      () => {
        if (pendingTokenRequest === tokenRequest) pendingTokenRequest = null;
      }
    );
  }

  return pendingTokenRequest;
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLIC_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: requestRealtimeAccessToken,
});

/**
 * 첫 private join 전에 BoardPort JWT를 명시적으로 주입한다.
 * accessToken callback은 heartbeat 갱신을 맡고, 이 함수는 최초 join의 anon-key 경합을 막는다.
 */
export async function subscribePrivateRealtimeChannel(
  channel: RealtimeChannel,
  signal?: AbortSignal,
  onStatus?: NonNullable<Parameters<RealtimeChannel["subscribe"]>[0]>
) {
  try {
    await supabase.realtime.setAuth();
    if (signal?.aborted) return false;
    channel.subscribe(onStatus);
    return true;
  } catch (error) {
    if (!signal?.aborted) {
      console.error(
        "[Realtime] Private channel authorization failed:",
        error instanceof Error ? error.message : "UnknownError"
      );
    }
    return false;
  }
}
