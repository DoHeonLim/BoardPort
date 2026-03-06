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
 */

"use server"; // 로그아웃은 보통 컴포넌트에서 바로 부르기도 하므로 use server 유지

import getSession from "@/lib/session";

/**
 * 현재 세션을 파기
 */
export const logOut = async () => {
  try {
    const session = await getSession();
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
