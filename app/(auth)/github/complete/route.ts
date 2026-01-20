/**
 * File Name : app/(auth)/github/complete/route
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
 */

import {
  getAccessToken,
  getGithubProfile,
} from "@/features/auth/lib/github/oauth";
import { saveUserSession } from "@/features/auth/lib/saveUserSession";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get("gh_oauth_state")?.value ?? null;

  // 공통 리다이렉트 헬퍼 (절대 URL + state 쿠키 삭제)
  const redirectWithStateClear = (pathWithQuery: string) => {
    const url = new URL(pathWithQuery, request.url); // 절대 URL로 변환
    const res = NextResponse.redirect(url);
    res.cookies.delete("gh_oauth_state");
    return res;
  };

  // code 없음 → GitHub에서 정상적으로 돌아온 요청이 아님
  if (!code) {
    return redirectWithStateClear("/login?error=github_code");
  }

  // state 불일치 또는 누락 → CSRF/잘못된 요청으로 간주
  if (!state || !stateCookie || state !== stateCookie) {
    return redirectWithStateClear("/login?error=github_state");
  }

  try {
    const accessToken = await getAccessToken(code);
    const { id, avatar_url, login } = await getGithubProfile(accessToken);

    const existingUser = await db.user.findUnique({
      where: { github_id: String(id) },
      select: { id: true },
    });

    let userId: number;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const newUser = await db.user.create({
        data: {
          username: `${login}-gh`,
          github_id: String(id),
          avatar: avatar_url,
        },
        select: { id: true },
      });
      userId = newUser.id;
    }

    await saveUserSession(userId);

    // 성공 시 /profile로 이동 (절대 URL)
    const profileUrl = new URL("/profile", request.url);
    const res = NextResponse.redirect(profileUrl);
    res.cookies.delete("gh_oauth_state");
    return res;
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return redirectWithStateClear("/login?error=github_oauth");
  }
}
