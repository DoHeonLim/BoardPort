/**
 * File Name : app/(public)/kakao/start/route.ts
 * Description : 카카오 소셜 로그인 인가 코드 요청
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.24  임도헌   Created   카카오 로그인 시작 및 CSRF state 쿠키 설정
 * 2026.03.08  임도헌   Modified  OAuth 시작 시 callbackUrl 쿠키 보존 추가
 * 2026.03.12  임도헌   Modified  callbackUrl 정규화와 state 생성 흐름을 GitHub OAuth 시작 라우트와 같은 기준으로 통일
 * 2026.03.14  임도헌   Modified  account_email scope를 명시해 동의한 카카오 계정 이메일을 프로필로 저장할 수 있도록 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/kakao/start/route.ts 에서 app/(public)/kakao/start/route.ts 로 변경 (라우트 그룹 개편)
*/

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 카카오 OAuth 시작 라우트
 *
 * 처리 흐름
 * - callbackUrl 쿼리를 내부 경로로 정규화
 * - CSRF 방지용 state 생성
 * - 카카오 인가 코드 요청 URL 구성
 * - state와 callbackUrl을 후속 콜백 검증용 쿠키로 저장
 *
 * @param {Request} request - 현재 요청 객체
 */
export function GET(request: Request) {
  const baseURL = "https://kauth.kakao.com/oauth/authorize";
  const requestUrl = new URL(request.url);
  const callbackUrl = sanitizeCallbackUrl(
    requestUrl.searchParams.get("callbackUrl")
  );

  // CSRF 방지용 state 생성
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_CLIENT_ID!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    response_type: "code",
    state,
    scope: "account_email",
  });

  const url = `${baseURL}?${params.toString()}`;
  const response = NextResponse.redirect(url);

  // 콜백 단계에서 재사용할 state/callbackUrl 쿠키 저장
  response.cookies.set("kakao_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분 유효
  });
  response.cookies.set("kakao_oauth_callback_url", callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}

