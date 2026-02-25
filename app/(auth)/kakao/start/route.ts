/**
 * File Name : app/(auth)/kakao/start/route.ts
 * Description : 카카오 소셜 로그인 인가 코드 요청
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.24  임도헌   Created   카카오 로그인 시작 및 CSRF state 쿠키 설정
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 * GET /kakao/start
 *
 * 카카오 로그인을 시작하는 엔드포인트
 * 1. CSRF 방지용 state 난수 생성
 * 2. 카카오 인가 코드 요청 URL 생성
 * 3. state를 쿠키에 저장 후 카카오 인증 페이지로 리다이렉트
 */
export function GET() {
  const baseURL = "https://kauth.kakao.com/oauth/authorize";

  // CSRF 방지를 위한 랜덤 state 생성
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_CLIENT_ID!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    response_type: "code",
    state,
  });

  const url = `${baseURL}?${params.toString()}`;
  const response = NextResponse.redirect(url);

  // state를 쿠키에 저장 (httpOnly, secure)
  response.cookies.set("kakao_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분 유효
  });

  return response;
}
