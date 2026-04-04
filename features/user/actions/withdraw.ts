/**
 * File Name : features/user/actions/withdraw.ts
 * Description : 회원 탈퇴 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created   회원 탈퇴 기능 추가
 */
"use server";

import getSession from "@/lib/session";
import { redirect } from "next/navigation";
import { withdrawUser } from "@/features/user/service/withdraw";
import { USER_ERRORS } from "@/features/user/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 회원 탈퇴 액션
 */
export async function withdrawAction(): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };
  }

  // 탈퇴 service 위임
  const result = await withdrawUser(session.id);

  if (!result.success) {
    return result;
  }

  // 세션 파기
  session.destroy();

  // 홈 복귀
  redirect("/");
}
