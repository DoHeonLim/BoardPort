/**
 * File Name : lib/utils/beacon.ts
 * Description : 언로드 시 신뢰도 높은 전송을 위한 유틸 (sendBeacon / fetch keepalive)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.23  임도헌   Created   sendBeacon 우선 + keepalive 폴백 유틸 추가(소용량/헤더 유연)
 */

export interface PostOnUnloadOptions {
  /** 최대 허용 바이트 수 (기본 60KB) */
  maxBytes?: number;
  /** Content-Type 헤더 */
  contentType?: string;
}

/**
 * 페이지가 닫히거나 이동할 때 데이터를 서버로 안전하게 전송
 * - 1순위: `navigator.sendBeacon` 사용 (비동기, 메인 스레드 비차단)
 * - 2순위: `fetch` + `keepalive` 옵션 사용 (폴백)
 *
 * @param url - 전송 대상 API 엔드포인트
 * @param payload - 전송할 데이터 객체
 * @param opts - 옵션
 */
export async function postOnUnload(
  url: string,
  payload?: unknown,
  opts: PostOnUnloadOptions = {}
): Promise<void> {
  const maxBytes = opts.maxBytes ?? 60 * 1024;
  let bodyStr = "";

  if (payload !== undefined && payload !== null) {
    try {
      bodyStr = JSON.stringify(payload);
    } catch {
      bodyStr = "";
    }
  }

  // 데이터 크기 제한 체크 (브라우저 비콘 큐 한계 방어)
  if (bodyStr.length > maxBytes) {
    bodyStr = "";
  }

  // 1) sendBeacon 시도
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      const blob = new Blob([bodyStr], { type: "text/plain" });
      if (navigator.sendBeacon(url, blob)) return;
    } catch {
      // ignore
    }
  }

  // 2) fetch keepalive 폴백
  try {
    await fetch(url, {
      method: "POST",
      body: bodyStr.length > 0 ? bodyStr : undefined,
      headers:
        bodyStr.length > 0
          ? { "Content-Type": opts.contentType ?? "application/json" }
          : undefined,
      keepalive: true,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // 실패 시 언로드 상황이므로 재시도 불가
  }
}
