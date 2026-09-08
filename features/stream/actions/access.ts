/**
 * File Name : features/stream/actions/access.ts
 * Description : 방송 접근 권한 관리 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/streams/[id]/actions.ts (unlockPrivateBroadcastAction) -> features/stream/actions/access.ts
 * 2026.04.02  임도헌   Modified  비공개 방송 잠금 해제 액션 JSDoc 보강
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  PRIVATE 방송 비밀번호 IP·방송별 실패 제한 추가
 */

"use server";

import { headers } from "next/headers";
import getSession from "@/lib/session";
import { verifyBroadcastPassword } from "@/features/stream/service/access";
import {
  checkAndRecordPrivateStreamPasswordAttempt,
  clearPrivateStreamPasswordAttempts,
  getClientIpFromHeaders,
} from "@/features/auth/service/rateLimit";

/**
 * PRIVATE 방송 잠금 해제 Action
 * - 비밀번호 검증 성공 시 세션에 언락 정보(`unlockedBroadcastIds`)를 저장
 *
 * @param {number} broadcastId - 잠금 해제할 방송 ID
 * @param {string} password - 사용자가 입력한 방송 비밀번호
 * @returns {Promise<{ success: true } | { success: false; error: "NOT_LOGGED_IN" | "NOT_FOUND" | "NOT_PRIVATE_STREAM" | "NO_PASSWORD_SET" | "INVALID_PASSWORD" | "BAD_REQUEST" | "MISSING_PASSWORD" | "INTERNAL_ERROR" }>} 잠금 해제 결과
 */
export const unlockPrivateBroadcastAction = async (
  broadcastId: number,
  password: string
) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  const clientIp = getClientIpFromHeaders(await headers());
  const limit = await checkAndRecordPrivateStreamPasswordAttempt(
    clientIp,
    broadcastId
  );
  if (!limit.allowed) {
    return { success: false, error: "RATE_LIMITED" as const };
  }

  // 1. 검증
  const result = await verifyBroadcastPassword(broadcastId, password);
  if (!result.success) return result;

  await clearPrivateStreamPasswordAttempts(clientIp, broadcastId);

  // 2. 세션 저장
  const unlocked = session.unlockedBroadcastIds ?? {};
  session.unlockedBroadcastIds = { ...unlocked, [String(broadcastId)]: true };
  await session.save();

  return { success: true };
};
