/**
 * File Name : features/stream/utils/session.ts
 * Description : PRIVATE 방송 언락 상태를 확인하는 세션 헬퍼
 * Author : 임도헌
 *
 * Key Points:
 * - "server-only" 유틸리티로, 클라이언트 번들에 포함되지 않도록 보장.
 * - 세션 객체를 인자로 받아 순수하게 검사만 수행 (I/O 없음).
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.03  임도헌   Created   isBroadcastUnlockedFromSession 분리(서버 액션 파일 혼합 export 에러 방지)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";

type UnlockSet = Record<string, true>;
const UNLOCK_SESSION_KEY = "unlockedBroadcastIds";

// 세션 객체에서 언락 목록 추출
function getUnlockSet(session: any): UnlockSet {
  return (session?.[UNLOCK_SESSION_KEY] ?? {}) as UnlockSet;
}

/**
 * 특정 방송이 현재 세션에서 언락(비밀번호 입력 완료)되었는지 확인
 */
export function isBroadcastUnlockedFromSession(
  session: any,
  broadcastId: number
): boolean {
  const unlocked = getUnlockSet(session);
  return !!unlocked[String(broadcastId)];
}
