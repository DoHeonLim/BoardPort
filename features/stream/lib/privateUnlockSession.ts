/**
 * File Name : features/stream/lib/privateUnlockSession.ts
 * Description : PRIVATE 방송 언락 세션 헬퍼(조회 전용) — server-only 유틸
 * Author : 임도헌
 *
 * Key Points
 * - "use server"가 아닌 server-only 유틸로 분리하여
 *   서버 액션 파일에서 일반 export 혼합으로 발생하는 빌드 에러를 방지한다.
 * - 페이지에서 session을 이미 읽은 경우, session 주입형 헬퍼로 중복 조회를 피한다.
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.03  임도헌   Created   isBroadcastUnlockedFromSession 분리(서버 액션 파일 혼합 export 에러 방지)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";

type UnlockSet = Record<string, true>;

const UNLOCK_SESSION_KEY = "unlockedBroadcastIds";

/** 세션 객체에서 언락 Set을 읽는다. */
function getUnlockSet(session: any): UnlockSet {
  return (session?.[UNLOCK_SESSION_KEY] ?? {}) as UnlockSet;
}

/** 세션 기반 PRIVATE 언락 여부 조회 (session 주입형) */
export function isBroadcastUnlockedFromSession(
  session: any,
  broadcastId: number
): boolean {
  const unlocked = getUnlockSet(session);
  return !!unlocked[String(broadcastId)];
}
