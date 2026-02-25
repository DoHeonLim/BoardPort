/**
 * File Name : app/(auth)/github/start/route.ts
 * Description : 깃허브 소셜 로그인 기능
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.08  임도헌   Created
 * 2024.10.08  임도헌   Modified  깃허브 소셜 로그인 기능 추가
 * 2025.12.12  임도헌   Modified  OAuth state 쿠키 기반 검증 로직 추가
 * 2026.01.20  임도헌   Modified  코드 구조 확인 및 주석 수정
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";

export function GET() {
  const baseURL = "https://github.com/login/oauth/authorize";

  // CSRF 방지를 위한 랜덤 state 생성
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: "read:user user:email",
    allow_signup: "true",
    state,
  });

  const url = `${baseURL}?${params.toString()}`;
  const response = NextResponse.redirect(url);

  // state를 쿠키에 저장 (httpOnly, secure)
  response.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분 유효
  });

  return response;
}
