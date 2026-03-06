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
 * 2026.01.25  임도헌   Modified   주석 보강
 * 2026.02.06  임도헌   Modified   유저 세션에 역할과 정지 여부 추가
 */
import "server-only";
import getSession from "@/lib/session";
import db from "@/lib/db";

/**
 * 로그인 성공 후 세션 생성
 *
 * 1. 유저 ID로 DB에서 최신 상태(Role, BannedAt)를 조회
 * 2. 조회된 정보를 바탕으로 세션 객체를 구성
 * 3. `iron-session`을 통해 암호화된 쿠키를 저장
 *
 * - id: 유저 PK
 * - role: "USER" | "ADMIN"
 * - banned: 정지 여부 (boolean)
 */
export async function saveUserSession(userId: number) {
  const session = await getSession();

  // DB에서 최신 Role/Ban 상태 조회
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, bannedAt: true },
  });

  if (!user) {
    throw new Error("User not found during session creation.");
  }

  session.id = userId;
  session.role = user.role; // "USER" | "ADMIN"
  session.banned = !!user.bannedAt; // 정지 여부 (Boolean 변환)

  await session.save();
}

/**
 * 관리자 권한 검증 가드 (Server Action용)
 * - 세션만 믿지 않고, 중요한 관리자 작업 수행 시에는 DB를 한 번 더 체크하는 것이 안전
 */
export async function verifyAdminAccess(): Promise<{
  success: boolean;
  adminId?: number;
  error?: string;
}> {
  const session = await getSession();

  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // Double Check: DB에서 최신 Role 확인
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "관리자 권한이 없습니다." };
  }

  return { success: true, adminId: session.id };
}
