/**
 * File Name : features/auth/service/authSession.ts
 * Description : 유저 세션 저장 서비스
 * Author: 임도헌
 *
 * History:
 * Date        Author   Status     Description
 * 2025.06.05  임도헌   Created    사용자 세션 저장 및 로그인 리디렉션 유틸 분리
 * 2025.06.07  임도헌   Modified   리디렉션 삭제
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved      lib/saveUserSession -> service/authSession
 * 2026.01.25  임도헌   Modified  주석 보강
 */
import "server-only";

import getSession from "@/lib/session";

/**
 * 로그인 성공 후 유저 세션을 저장합니다.
 * Iron Session 쿠키에 userId를 저장하고 암호화합니다.
 *
 * @param {number} userId - 세션에 저장할 유저 ID
 * @returns {Promise<void>}
 */
export async function saveUserSession(userId: number) {
  // 1. 세션 가져오기
  const session = await getSession();

  // 2. 세션 데이터 설정 및 저장
  session.id = userId;
  await session.save();
}
