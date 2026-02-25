/**
 * File Name : features/user/actions/withdraw.ts
 * Description : 회원 탈퇴 Controller
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
 * 회원 탈퇴 Action
 * 1. 세션 확인
 * 2. Service 호출 (DB 삭제)
 * 3. 세션 파기 및 홈으로 리다이렉트
 */
export async function withdrawAction(): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };
  }

  // Service 호출
  const result = await withdrawUser(session.id);

  if (!result.success) {
    return result;
  }

  // 성공 시 세션 파기 (Action의 역할)
  session.destroy();

  // 리다이렉트
  redirect("/");
}
