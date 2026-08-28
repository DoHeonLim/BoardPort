/**
 * File Name : features/notification/utils/pushDisplayGuard.ts
 * Description : Push 표시 보호 기능이 적용된 Service Worker 확인
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   구 Service Worker 활성 상태에서 구독 복구 차단
 * 2026.08.28  임도헌   Modified  표시 보호 handshake 완료 함수 JSDoc 보강
 */

export const PUSH_DISPLAY_GUARD_VERSION = 1 as const;

export const PUSH_DISPLAY_GUARD_VERSION_REQUEST =
  "BOARDPORT_PUSH_DISPLAY_GUARD_VERSION_REQUEST";
export const PUSH_DISPLAY_GUARD_VERSION_RESPONSE =
  "BOARDPORT_PUSH_DISPLAY_GUARD_VERSION_RESPONSE";

const PROBE_TIMEOUT_MS = 100;
const RETRY_INTERVAL_MS = 25;

/** 표시 보호 handshake 재시도 사이의 비동기 대기 시간을 만든다. */
function delay(timeoutMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}

/**
 * 특정 Service Worker가 현재 Push 표시 보호 프로토콜을 지원하는지 묻는다.
 */
export function probePushDisplayGuard(
  worker: ServiceWorker,
  timeoutMs = PROBE_TIMEOUT_MS
): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    /**
     * 첫 handshake 결과만 확정하고 타이머와 메시지 포트를 정리한다.
     *
     * @param supported - Worker의 현재 표시 보호 프로토콜 지원 여부
     */
    const finish = (supported: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      channel.port1.close();
      resolve(supported);
    };

    const timeoutId = setTimeout(() => finish(false), timeoutMs);

    channel.port1.onmessage = (event) => {
      const data = event.data as Record<string, unknown> | null;
      finish(
        data?.type === PUSH_DISPLAY_GUARD_VERSION_RESPONSE &&
          data.version === PUSH_DISPLAY_GUARD_VERSION
      );
    };
    channel.port1.onmessageerror = () => finish(false);

    try {
      worker.postMessage({ type: PUSH_DISPLAY_GUARD_VERSION_REQUEST }, [
        channel.port2,
      ]);
    } catch {
      finish(false);
    }
  });
}

/**
 * 새 Worker 설치·활성화가 끝나고 표시 보호 버전 응답이 확인될 때까지 기다린다.
 * 타임아웃/설치 실패는 구독을 활성화하지 않는 fail-closed 오류로 처리한다.
 */
export async function waitForPushDisplayGuard(
  registration: ServiceWorkerRegistration,
  timeoutMs = 10_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const activeWorker = registration.active;

    if (
      activeWorker &&
      (await probePushDisplayGuard(
        activeWorker,
        Math.min(PROBE_TIMEOUT_MS, remaining)
      ))
    ) {
      return;
    }

    const retryDelay = Math.min(RETRY_INTERVAL_MS, deadline - Date.now());
    if (retryDelay > 0) await delay(retryDelay);
  }

  throw new Error("PUSH_DISPLAY_GUARD_NOT_READY");
}
