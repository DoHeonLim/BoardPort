/**
 * File Name : features/stream/lib/getRealtimeClientToken.ts
 * Description : 브라우저 탭(세션) 단위 고정 토큰 생성/조회 유틸
 * Author : 임도헌
 *
 * History
 * 2025.09.14  임도헌   Created   세션 스토리지 기반 토큰 생성(crypto → random 폴백)
 * 2026.01.19  임도헌   Moved      lib/stream -> features/stream/lib
 * 사용 목적
 * - 동일 탭에서 내가 브로드캐스트한 이벤트는 무시(ignoreSelf)하기 위한 식별자
 * - 가능하면 sessionStorage에 저장해 탭 리로드 간에도 일관성 유지
 * - sessionStorage 접근이 불가한 환경(프라이빗/제약)에서는 모듈 스코프 변수로 대체
 */

let moduleScopedToken: string | null = null;

/** 난수 문자열 생성 (crypto → Math.random 순서로 시도) */
function createRandomToken(): string {
  // crypto.getRandomValues 가용 시
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(36)).join("");
  }
  // 폴백: Math.random (충분히 길게)
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

/**
 * getRealtimeClientToken
 * - 브라우저 탭(세션) 단위로 고정된 토큰을 반환.
 * - sessionStorage를 최우선 사용, 실패 시 모듈 스코프 변수로 대체.
 * - 서버(SSR)에서는 "server" 문자열을 반환하므로 클라이언트 전용 사용을 권장.
 */
export function getRealtimeClientToken(): string {
  // SSR/서버 환경 보호
  if (typeof window === "undefined") return "server";

  const KEY = "__ls_client_token__";

  // 1) sessionStorage 시도
  try {
    const t = window.sessionStorage.getItem(KEY);
    if (t) return t;

    const fresh = createRandomToken();
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // 2) sessionStorage 불가 시: 모듈 스코프 변수 사용(탭 내 일관성 유지)
    if (!moduleScopedToken) {
      moduleScopedToken = createRandomToken();
    }
    return moduleScopedToken;
  }
}
