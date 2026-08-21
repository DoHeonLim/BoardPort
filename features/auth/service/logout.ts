/**
 * File Name : features/auth/service/logout.ts
 * Description : 로그아웃 (세션 파기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/action -> logout 분리
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved      lib/logOut -> service/logout
 * 2026.01.25  임도헌   Modified   주석 보강
 * 2026.03.06  임도헌   Modified   결과 반환형으로 변경하여 pending/toast 처리 지원
 * 2026.04.02  임도헌   Modified   로그아웃 서비스 JSDoc 보강
 * 2026.05.16  임도헌   Modified   서버 액션 래퍼를 actions/logout.ts로 분리하고 서비스는 세션 파기만 담당
 * 2026.08.13  임도헌   Modified   세션 파기 전 현재 기기의 Push 구독을 비활성화하도록 보강
 */

import "server-only";

import getSession from "@/lib/session";
import { unsubscribeDevice } from "@/features/notification/service/subscription";
import type { PushSubscriptionDTO } from "@/features/notification/types";

/**
 * 현재 기기의 Push 구독을 비활성화한 뒤 로그인 세션을 파기한다.
 *
 * DB 정리에 실패하면 세션을 유지해 이전 계정 알림이 공용 브라우저에
 * 남는 상태로 로그아웃되는 것을 막는다.
 *
 * @param deviceSubscription - 현재 브라우저의 검증된 Push 구독 정보
 * @returns {Promise<{ success: true } | { success: false; error: string }>} 로그아웃 처리 결과
 */
export const destroyAuthSession = async (
  deviceSubscription: PushSubscriptionDTO | null = null
) => {
  try {
    const session = await getSession();

    if (deviceSubscription) {
      await unsubscribeDevice(session?.id ?? null, deviceSubscription);
    }

    if (session?.destroy) session.destroy();
    return { success: true as const };
  } catch (error) {
    console.error("[logout] failed:", error);
    return {
      success: false as const,
      error: "로그아웃 처리 중 오류가 발생했습니다.",
    };
  }
};
