/**
 * File Name : features/auth/actions/logout.ts
 * Description : 로그아웃 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   service/logout.ts에서 클라이언트 호출용 서버 액션 분리
 */
"use server";

import { destroyAuthSession } from "@/features/auth/service/logout";

/**
 * 현재 로그인 세션을 파기하는 클라이언트 호출용 서버 액션
 *
 * @returns {Promise<{ success: true } | { success: false; error: string }>} 로그아웃 처리 결과
 */
export const logOut = async () => destroyAuthSession();
