/**
 * File Name : features/chat/actions/badge.ts
 * Description : 채팅 뱃지 체크 서버 액션
 * Author : 임도헌
 *
 * History
 * 2025.07.21  임도헌   Created   app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.12.07  임도헌   Modified  badgeChecks.onChatResponse 사용으로 통일
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/chats/[id]/actions/badge.ts -> features/chat/actions/badge.ts
 * 2026.04.02  임도헌   Modified  뱃지 액션 JSDoc 반환 설명 보강
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 */
"use server";

import { badgeChecks } from "@/features/user/service/badge";

/**
 * '신속한 교신병' 뱃지 획득 조건을 체크하는 서버 액션
 * 클라이언트 컴포넌트(메시지 리스트)에서 전송 성공 후 호출
 * (web-push 의존성 격리를 위해 서버 액션으로 분리됨)
 *
 * @param {number} userId - 뱃지 체크 대상 유저 ID
 * @returns {Promise<{ success: boolean; error?: string }>} 뱃지 체크 성공 여부
 */
export async function checkQuickResponseBadgeAction(userId: number) {
  try {
    await badgeChecks.onChatResponse(userId);
    return { success: true };
  } catch (error) {
    console.error("뱃지 체크 중 오류:", error);
    return { success: false, error: "뱃지 체크 중 오류가 발생했습니다." };
  }
}
