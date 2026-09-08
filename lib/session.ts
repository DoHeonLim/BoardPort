/**
 * File Name : lib/session.ts
 * Description : 암호화 세션 조회와 DB 버전 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.06  임도헌   Created
 * 2024.10.06  임도헌   Modified  iron-session으로 쿠키 암호화
 * 2025.08.14  임도헌   Modified  unlockedStreamIds 추가
 * 2026.02.06  임도헌   Modified  세션에 역할 추가
 * 2026.05.19  임도헌   Modified  쿠키 기반 세션 헬퍼가 클라이언트 번들에 포함되지 않도록 server-only 가드 추가
 * 2026.08.23  임도헌   Modified  DB sessionVersion 불일치 세션을 요청 경계에서 폐기
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 cookies API 호환 반영
 * 2026.09.07  임도헌   Modified  RSC 무효 세션의 읽기 전용 권한 폐기와 쿠키 삭제 경계 분리
 */

import "server-only";
import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { getCookiePassword } from "@/lib/env";

/**
 * 세션에 저장될 데이터 구조
 */
export interface ISessionContent {
  /** 로그인한 유저의 DB ID */
  id?: number;
  /** 유저 역할 */
  role?: "USER" | "ADMIN";
  /** 정지 여부 */
  banned?: boolean;
  /** 세션 발급 당시 User.sessionVersion */
  sessionVersion?: number;
  /**
   * 현재 세션에서 비밀번호를 입력해 잠금 해제한 방송 ID 목록
   * Key: broadcastId (string), Value: true
   */
  unlockedBroadcastIds?: Record<string, true>;
}

/** 쿠키 쓰기가 허용된 Action·Route Handler에서 세션을 재발급할 때 사용 */
export async function getSessionForUpdate() {
  const cookieStore = await cookies();
  return getIronSession<ISessionContent>(cookieStore, {
    cookieName: "user",
    password: getCookiePassword(),
  });
}

/**
 * 암호화 세션 조회와 DB sessionVersion 검증
 * 무효 세션의 요청 내 권한만 제거하고 쿠키 삭제는 Route Handler에 위임
 * isInvalid는 쿠키에 저장되지 않는 요청 전용 상태
 */
export default async function getSession(): Promise<
  IronSession<ISessionContent> & { readonly isInvalid?: boolean }
> {
  const session = await getSessionForUpdate();

  if (!session.id) return session;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { sessionVersion: true },
  });

  if (!user || session.sessionVersion !== user.sessionVersion) {
    // RSC의 cookies는 읽기 전용이므로 응답 쿠키를 수정하지 않고 권한만 폐기
    delete session.id;
    delete session.role;
    delete session.banned;
    delete session.sessionVersion;
    delete session.unlockedBroadcastIds;
    Object.defineProperty(session, "isInvalid", { value: true });
  }

  return session;
}
