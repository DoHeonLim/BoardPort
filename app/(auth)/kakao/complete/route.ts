/**
 * File Name : app/(auth)/kakao/complete/route.ts
 * Description : 카카오 소셜 로그인 완료 처리 및 세션 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.24  임도헌   Created   카카오 콜백 처리, state 검증, Lazy Unban 및 세션 생성
 */

import { NextRequest, NextResponse } from "next/server";
import {
  findOrCreateKakaoUser,
  getKakaoAccessToken,
  getKakaoUserProfile,
} from "@/features/auth/service/kakao";
import { saveUserSession } from "@/features/auth/service/authSession";
import db from "@/lib/db";

/**
 * GET /kakao/complete
 *
 * 카카오 OAuth 인증 후 리다이렉트되는 엔드포인트
 * 1. Authorization Code와 State 검증
 * 2. Access Token 발급 및 카카오 프로필 정보 조회
 * 3. 유저 탐색 또는 신규 생성 (findOrCreateKakaoUser)
 * 4. 정지 상태 확인 (Check & Lazy Unban)
 * 5. 세션 생성 후 프로필 페이지로 이동
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("kakao_oauth_state")?.value;

  // 에러 발생 시 로그인 페이지로 리다이렉트하는 헬퍼 함수
  const returnToLogin = (errorType: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", errorType);
    const res = NextResponse.redirect(url);
    res.cookies.delete("kakao_oauth_state"); // 쿠키 정리
    return res;
  };

  // 1. 필수 파라미터 검증
  if (!code) return returnToLogin("kakao_code_missing");

  // 2. CSRF 공격 방지 (State 검증)
  if (!state || !storedState || state !== storedState) {
    return returnToLogin("kakao_state_mismatch");
  }

  try {
    // 3. Service 호출 (토큰 -> 프로필 -> 유저 DB 처리)
    const accessToken = await getKakaoAccessToken(code);
    const profile = await getKakaoUserProfile(accessToken);
    const userId = await findOrCreateKakaoUser(profile);

    // 4. 정지 체크 로직 (Lazy Unban 포함)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { bannedAt: true, bannedUntil: true },
    });

    if (user?.bannedAt) {
      const now = new Date();
      if (user.bannedUntil && now > user.bannedUntil) {
        // 기간 만료 -> 자동 해제
        await db.user.update({
          where: { id: userId },
          data: { bannedAt: null, bannedUntil: null },
        });
      } else {
        // 정지 유효 -> 로그인 실패 처리
        return returnToLogin("banned_user");
      }
    }

    // 5. 세션 저장 (로그인 처리)
    await saveUserSession(userId);

    // 6. 성공 리다이렉트 (/profile)
    const response = NextResponse.redirect(new URL("/profile", request.url));
    response.cookies.delete("kakao_oauth_state"); // 사용된 state 쿠키 삭제
    return response;
  } catch (error) {
    console.error("Kakao Login Error:", error);
    return returnToLogin("kakao_login_failed");
  }
}
