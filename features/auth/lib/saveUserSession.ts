/**
 * File Name: features/auth/lib/saveUserSession.ts
 * Description: 사용자 ID를 기반으로 세션을 설정
 * Author: 임도헌
 *
 * History:
 * Date        Author   Status     Description
 * 2025.06.05  임도헌   Created    사용자 세션 저장 및 로그인 리디렉션 유틸 분리
 * 2025.06.07  임도헌   Modified   리디렉션 삭제
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 */
import getSession from "@/lib/session";

export async function saveUserSession(userId: number) {
  const session = await getSession();
  session.id = userId;
  await session.save();
}
