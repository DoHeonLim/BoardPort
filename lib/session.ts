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
 */

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

/**
 * 세션에 저장될 데이터 구조
 */
interface ISessionContent {
  /** 로그인한 유저의 DB ID */
  id?: number;
  /**
   * 현재 세션에서 비밀번호를 입력해 잠금 해제한 방송 ID 목록
   * Key: broadcastId (string), Value: true
   */
  unlockedBroadcastIds?: Record<string, true>;
}

/**
 * 현재 요청의 세션을 가져옵니다.
 * - `iron-session`을 사용하여 쿠키를 암호화/복호화합니다.
 * - Server Component, Route Handler, Server Action에서 사용 가능합니다.
 */
export default function getSession() {
  return getIronSession<ISessionContent>(cookies(), {
    cookieName: "user",
    password: process.env.COOKIE_PASSWORD!,
  });
}
