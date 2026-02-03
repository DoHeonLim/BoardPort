/**
 * File Name : app/(auth)/github/complete/route.ts
 * Description : 깃허브 소셜 로그인 기능
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.08  임도헌   Created
 * 2024.10.08  임도헌   Modified  깃허브 소셜 로그인 기능 추가
 * 2025.06.05  임도헌   Modified  Token, Profile 관련 함수 모듈화
 * 2025.12.09  임도헌   Modified  OAuth state 검증 및 세션에 유저 ID 저장 로직 직접 처리
 * 2025.12.12  임도헌   Modified  state를 쿠키 기반으로 검증하고, 완료 후 쿠키 제거
 * 2025.12.12  임도헌   Modified  NextResponse.redirect에 절대 URL 사용하도록 수정
 * 2026.01.20  임도헌   Modified  Service 로직 분리, 에러 핸들링 강화, 리다이렉트 헬퍼 적용
 */

import { NextRequest, NextResponse } from "next/server";
import {
  findOrCreateGitHubUser,
  getGitHubAccessToken,
  getGitHubUserProfile,
} from "@/features/auth/service/github";
import { saveUserSession } from "@/features/auth/service/authSession";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("gh_oauth_state")?.value;

  // 에러 발생 시 로그인 페이지로 리다이렉트하는 헬퍼 함수
  const returnToLogin = (errorType: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", errorType);
    const res = NextResponse.redirect(url);
    res.cookies.delete("gh_oauth_state"); // 쿠키 정리
    return res;
  };

  // 1. 필수 파라미터 검증
  if (!code) return returnToLogin("github_code_missing");

  // 2. CSRF 공격 방지 (State 검증)
  if (!state || !storedState || state !== storedState) {
    return returnToLogin("github_state_mismatch");
  }

  try {
    // 3. Service 호출 (토큰 -> 프로필 -> 유저 DB 처리)
    const accessToken = await getGitHubAccessToken(code);
    const profile = await getGitHubUserProfile(accessToken);
    const userId = await findOrCreateGitHubUser(profile);

    // 4. 세션 저장 (로그인 처리)
    await saveUserSession(userId);

    // 5. 성공 리다이렉트 (/profile)
    const response = NextResponse.redirect(new URL("/profile", request.url));
    response.cookies.delete("gh_oauth_state"); // 사용된 state 쿠키 삭제
    return response;
  } catch (error) {
    console.error("GitHub Login Error:", error);
    return returnToLogin("github_login_failed");
  }
}
