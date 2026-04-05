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
 * 2026.03.08  임도헌   Modified  OAuth 시작 시 callbackUrl 쿠키 보존 추가
 * 2026.03.12  임도헌   Modified  callbackUrl 정규화와 state 생성 흐름을 현재 OAuth 시작 기준으로 명확화
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * GitHub OAuth 시작 라우트
 *
 * 처리 흐름
 * - callbackUrl 쿼리를 내부 경로로 정규화
 * - CSRF 방지용 state 생성
 * - GitHub 인가 URL로 리다이렉트
 * - state와 callbackUrl을 후속 콜백 검증용 쿠키로 저장
 *
 * @param {Request} request - 현재 요청 객체
 */
export function GET(request: Request) {
  const baseURL = "https://github.com/login/oauth/authorize";
  const requestUrl = new URL(request.url);
  const callbackUrl = sanitizeCallbackUrl(
    requestUrl.searchParams.get("callbackUrl")
  );

  // CSRF 방지용 state 생성
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: "read:user user:email",
    allow_signup: "true",
    state,
  });

  const url = `${baseURL}?${params.toString()}`;
  const response = NextResponse.redirect(url);

  // 콜백 단계에서 재사용할 state/callbackUrl 쿠키 저장
  response.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분 유효
  });
  response.cookies.set("gh_oauth_callback_url", callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
