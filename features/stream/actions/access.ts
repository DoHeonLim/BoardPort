/**
 * File Name : features/stream/actions/access.ts
 * Description : 방송 접근 권한 관리 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/streams/[id]/actions.ts (unlockPrivateBroadcastAction) -> features/stream/actions/access.ts
 */

"use server";

import getSession from "@/lib/session";
import { verifyBroadcastPassword } from "@/features/stream/service/access";

/**
 * PRIVATE 방송 잠금 해제 Action
 * - 비밀번호 검증 성공 시 세션에 언락 정보(`unlockedBroadcastIds`)를 저장합니다.
 */
export const unlockPrivateBroadcastAction = async (
  broadcastId: number,
  password: string
) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  // 1. 검증
  const result = await verifyBroadcastPassword(broadcastId, password);
  if (!result.success) return result;

  // 2. 세션 저장
  const unlocked = session.unlockedBroadcastIds ?? {};
  session.unlockedBroadcastIds = { ...unlocked, [String(broadcastId)]: true };
  await session.save();

  return { success: true };
};
