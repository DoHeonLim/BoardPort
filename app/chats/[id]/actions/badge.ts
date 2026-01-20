/**
 * File Name : app/chats/[id]/actions/badge
 * Description : 채팅 메시지 뱃지 체크
 * Author : 임도헌
 *
 * History
 * 2025.07.21  임도헌   Created   app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.12.07  임도헌   Modified  badgeChecks.onChatResponse 사용으로 통일
 */
"use server";

import { badgeChecks } from "@/features/user/lib/badges";

/**
 * web-push 라이브러리는 Node.js 환경에서만 동작
 * chat-messages-list는 클라이언트 컴포넌트인데 여기서 배지 체크를 직접 호출하면
 * web-push 의존성 때문에 에러가 나므로, 서버 액션으로 한 번 감싼다.
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
