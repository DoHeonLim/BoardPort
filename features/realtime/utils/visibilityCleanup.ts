/**
 * File Name : features/realtime/utils/visibilityCleanup.ts
 * Description : 짧은 화면 전환과 장기 백그라운드를 구분하는 Realtime 정리 스케줄러
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.31  임도헌   Created   빠른 Alt+Tab에서는 연결을 유지하고 장기 hidden 상태에서만 정리
 */

export const REALTIME_HIDDEN_CLEANUP_DELAY_MS = 30_000;

/**
 * Realtime 채널 정리를 지연 예약하고 화면 복귀 시 취소할 수 있는 수명 주기 제어기를 만든다.
 * 실제 문서 이탈에서는 `flush`로 예약을 취소한 뒤 즉시 정리할 수 있다.
 *
 * @param cleanup - 지연 시간이 지난 뒤 실행할 채널 정리 함수
 * @param delayMs - hidden 상태를 연결 해제로 판단하기까지 기다릴 시간
 */
export function createRealtimeVisibilityCleanup(
  cleanup: () => void,
  delayMs = REALTIME_HIDDEN_CLEANUP_DELAY_MS
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  /** 중복 타이머 없이 채널 정리를 한 번 예약한다. */
  const schedule = () => {
    if (timeoutId !== null) return;

    timeoutId = setTimeout(() => {
      timeoutId = null;
      cleanup();
    }, delayMs);
  };

  /** 화면이 다시 보이면 아직 실행되지 않은 채널 정리를 취소한다. */
  const cancel = () => {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  /** 실제 문서 이탈에서는 지연 예약을 취소하고 채널을 즉시 정리한다. */
  const flush = () => {
    cancel();
    cleanup();
  };

  return { schedule, cancel, flush };
}
