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
 */

"use server"; // 로그아웃은 보통 컴포넌트에서 바로 부르기도 하므로 use server 유지

import { redirect } from "next/navigation";
import getSession from "@/lib/session";

/**
 * 현재 세션을 파기하고 홈 화면으로 리다이렉트
 * Server Action 또는 Client Component에서 호출 가능
 *
 * @returns {Promise<void>}
 */
export const logOut = async () => {
  // 1. 세션 파기
  const session = await getSession();
  if (session?.destroy) session.destroy();

  // 2. 홈으로 이동
  redirect("/");
};
