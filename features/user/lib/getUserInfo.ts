/**
 * File Name : features/user/lib/getUserInfo.ts
 * Description : 유저 최소 프로필 조회 (current/byId 분리 + 하위호환)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   유저 프로필 조회 로직 분리
 * 2025.07.15  임도헌   Modified  userId 옵션 추가
 * 2026.01.03  임도헌   Modified  current/byId 분리로 중복 getSession 방지
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */

// Key Points
//  - 서버 페이지에서 이미 getSession()을 호출한 경우가 많다.
//    그 상태에서 getUserInfo()를 다시 호출하면 내부에서 getSession()을 또 타게 되어
//    불필요한 중복 I/O가 발생한다.
//  - 따라서 "byId" 조회를 분리하고, 페이지/컴포넌트 상황에 맞게 골라 쓰도록 한다.

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";

export type UserInfoLite = {
  id: number;
  username: string;
  avatar: string | null;
};

/**
 * userId 기반 최소 프로필 조회
 * - getSession()을 호출하지 않는다.
 * - "이미 session을 확보한 페이지"/"id만 알고 있는 클라이언트"에서 사용한다.
 */
export async function getUserInfoById(
  userId: number
): Promise<UserInfoLite | null> {
  if (!Number.isFinite(userId) || userId <= 0) return null;

  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  });
}

/**
 * 현재 로그인한 유저 최소 프로필 조회
 * - 필요한 경우에만 getSession()을 호출한다.
 */
export async function getCurrentUserInfo(): Promise<UserInfoLite | null> {
  const session = await getSession();
  const id = session?.id;
  if (!id) return null;
  return getUserInfoById(id);
}
