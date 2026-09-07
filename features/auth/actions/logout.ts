/**
 * File Name : features/auth/actions/logout.ts
 * Description : 로그아웃 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   service/logout.ts에서 클라이언트 호출용 서버 액션 분리
 * 2026.08.13  임도헌   Modified  현재 기기 Push 구독 검증 후 세션 파기하도록 보강
 */
"use server";

import { destroyAuthSession } from "@/features/auth/service/logout";
import { parsePushSubscriptionDTO } from "@/features/notification/utils/subscription";

/**
 * 현재 기기의 Push 구독을 정리한 뒤 로그인 세션을 파기하는 서버 액션
 *
 * @param deviceSubscription - 브라우저 PushSubscription 직렬화 값 또는 null
 * @returns {Promise<{ success: true } | { success: false; error: string }>} 로그아웃 처리 결과
 */
export const logOut = async (deviceSubscription: unknown = null) => {
  if (deviceSubscription === null) {
    return destroyAuthSession(null);
  }

  const parsedSubscription = parsePushSubscriptionDTO(deviceSubscription);
  if (!parsedSubscription) {
    return {
      success: false as const,
      error: "이 기기의 알림 연결 정보를 확인하지 못했습니다.",
    };
  }

  return destroyAuthSession(parsedSubscription);
};
