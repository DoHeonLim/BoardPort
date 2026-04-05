/**
 * File Name : features/auth/service/authSession.ts
 * Description : 유저 세션 저장 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.05  임도헌   Created   사용자 세션 저장 및 로그인 리디렉션 유틸 분리
 * 2025.06.07  임도헌   Modified  리디렉션 삭제
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved     lib/saveUserSession -> service/authSession
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.06  임도헌   Modified  유저 세션에 역할과 정지 여부 추가
 * 2026.03.30  임도헌   Modified  관리자 레이아웃 재사용을 위해 verifyAdminAccess가 기본 프로필 정보도 반환하도록 확장
 * 2026.04.02  임도헌   Modified  세션 서비스 JSDoc 포맷 보강
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
 *
 * @param {number} userId - 로그인 직후 세션을 저장할 유저 ID
 * @returns {Promise<void>} 반환값 없음
 */
export async function saveUserSession(userId: number) {
  const session = await getSession();

  // 최신 Role/Ban 상태 조회
  // 로그인 직후 세션에 stale 권한이 남지 않도록 DB 기준 최신 상태를 다시 읽어 저장
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
 *
 * [기능]
 * 1. 세션 존재 여부 확인
 * 2. DB 재조회로 최신 관리자 권한을 검증
 * 3. 관리자 셸과 액션에서 재사용할 기본 프로필 정보를 함께 반환
 *
 * @returns {Promise<{ success: boolean; adminId?: number; adminUser?: { username: string; avatar: string | null }; error?: string; }>} 관리자 접근 가능 여부와 기본 프로필 정보
 */
export async function verifyAdminAccess(): Promise<{
  success: boolean;
  adminId?: number;
  adminUser?: {
    username: string;
    avatar: string | null;
  };
  error?: string;
}> {
  const session = await getSession();

  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 최신 관리자 Role 재검증
  // 세션만 믿지 않고 DB를 다시 읽어 관리자 권한과 셸용 프로필 정보를 함께 검증
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true, username: true, avatar: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "관리자 권한이 없습니다." };
  }

  return {
    success: true,
    adminId: session.id,
    adminUser: {
      username: user.username,
      avatar: user.avatar,
    },
  };
}
