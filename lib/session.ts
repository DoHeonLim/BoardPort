/**
 * File Name : lib/session.ts
 * Description : 세션 추가
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
 */

import "server-only";
import { getIronSession } from "iron-session";
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

/**
 * 현재 요청의 세션을 가져옴
 * - `iron-session`을 사용하여 쿠키를 암호화/복호화
 * - Server Component, Route Handler, Server Action에서 사용 가능
 */
/** 로그인·비밀번호 변경 직후 최신 DB 상태로 쿠키를 재발급할 때만 사용한다. */
export function getSessionForUpdate() {
  return getIronSession<ISessionContent>(cookies(), {
    cookieName: "user",
    password: getCookiePassword(),
  });
}

export default async function getSession() {
  const session = await getSessionForUpdate();

  if (!session.id) return session;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { sessionVersion: true },
  });

  if (!user || session.sessionVersion !== user.sessionVersion) {
    session.destroy();
  }

  return session;
}
