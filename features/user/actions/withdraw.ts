/**
 * File Name : features/user/actions/withdraw.ts
 * Description : 회원 탈퇴 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created   회원 탈퇴 기능 추가
 * 2026.08.13  임도헌   Modified  탈퇴 성공 후 클라이언트가 사용자 cache를 정리하도록 결과 반환
 */
"use server";

import getSession from "@/lib/session";
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

  // 클라이언트가 Query cache를 비운 뒤 홈으로 이동할 수 있도록 성공 결과 반환
  return { success: true };
}
