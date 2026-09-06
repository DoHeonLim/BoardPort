/**
 * File Name : lib/realtimeAccessToken.ts
 * Description : 브라우저 Realtime JWT 요청 활성화·캐시 관리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   Supabase 클라이언트 생성과 토큰 요청 상태를 분리해 공개 화면의 비로그인 요청 차단
 */

"use client";

let tokenRequestsEnabled = false;
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

/** 실제 private 채널 구독이 시작된 뒤에만 Realtime JWT 발급을 허용한다. */
export function activateRealtimeAccessToken() {
  tokenRequestsEnabled = true;
}

/** 권한 변경 뒤 기존 JWT 캐시를 폐기하되 활성 private 채널의 갱신 경로는 유지한다. */
export function invalidateRealtimeAccessToken() {
  tokenCacheGeneration += 1;
  cachedAccessToken = undefined;
  pendingTokenRequest = null;
}

/** 인증 종료 또는 공개 화면 진입 시 JWT 캐시와 이후 토큰 요청을 함께 비활성화한다. */
export function deactivateRealtimeAccessToken() {
  tokenRequestsEnabled = false;
  invalidateRealtimeAccessToken();
}

/**
 * Supabase SDK에 제공할 Realtime JWT를 반환한다.
 *
 * 클라이언트 생성 직후 SDK가 이 함수를 호출해도 private 구독이 활성화되기
 * 전에는 null을 반환하므로 비로그인 공개 화면에서 토큰 API를 요청하지 않는다.
 */
export async function provideRealtimeAccessToken(): Promise<string | null> {
  if (!tokenRequestsEnabled) return null;

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
      // 요청 도중 권한이 바뀌었다면 이전 claim을 캐시에 남기지 않는다.
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
