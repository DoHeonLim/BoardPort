/**
 * File Name : middleware.ts
 * Description : 미들웨어
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.08  임도헌   Created
 * 2024.10.08  임도헌   Modified  인증 미들웨어 추가
 * 2025.12.23  임도헌   Modified  비로그인 리다이렉트 파라미터 통일(/login?callbackUrl=...)
 * 2026.02.06  임도헌   Modified  관리자 경로 보호 및 정지 유저 접근 제한 로직 추가
 * 2026.03.06  임도헌   Modified  /offline 등 공용 경로 허용과 게스트 전용 경로 분리를 통해 오프라인/PWA 리다이렉트 충돌을 정리
 */

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

interface IRoutes {
  [key: string]: boolean;
}

// 로그인 여부와 무관하게 항상 접근 가능해야 하는 유틸리티 경로
const alwaysAccessibleUrls: IRoutes = {
  "/offline": true,
  "/403": true,
  "/manifest.webmanifest": true,
};

// 비로그인 전용 경로
const authGuestOnlyUrls: IRoutes = {
  "/": true,
  "/login": true,
  "/sms": true,
  "/create-account": true,
  "/github/start": true,
  "/github/complete": true,
  "/kakao/start": true,
  "/kakao/complete": true,
};

/**
 * 글로벌 미들웨어
 *
 * 1. 세션 쿠키를 복호화하여 로그인 여부, 역할(Role), 정지(Ban) 상태를 확인
 * 2. `session.banned`가 true인 유저가 Public 경로 외의 페이지에 접근 시
 *    `/403?reason=BANNED` 페이지로 강제 리다이렉트
 * 3. `/admin` 경로는 `ADMIN` 역할이 아닌 경우 접근을 차단
 * 4. 비로그인 유저가 보호된 경로 접근 시 로그인 페이지로 리다이렉트 (CallbackUrl 보존)
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionResponse = NextResponse.next();

  // 1. 세션 복호화 (Edge Runtime 지원)
  const session = await getIronSession<{
    id?: number;
    role?: string;
    banned?: boolean;
  }>(request, sessionResponse, {
    cookieName: "user",
    password: process.env.COOKIE_PASSWORD!,
  });

  const isLoggedIn = !!session.id;
  const isAdmin = session.role === "ADMIN";
  const isBanned = !!session.banned; // 세션에 저장된 정지 여부
  const isAlwaysAccessible = !!alwaysAccessibleUrls[pathname];
  const isGuestOnly = !!authGuestOnlyUrls[pathname];
  const isPublicPath = isAlwaysAccessible || isGuestOnly;

  // 2. 이용 정지(Banned) 유저 가드
  // 정지된 유저가 public 경로(로그아웃 등)가 아닌 곳을 다니려 하면 403으로 강제 이동
  if (isLoggedIn && isBanned && !isPublicPath) {
    return NextResponse.redirect(new URL("/403?reason=BANNED", request.url));
  }

  // 3. 관리자 페이지 보호 (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn || !isAdmin) {
      // 권한 없으면 홈으로 튕김
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 4. 비로그인 + 보호된 페이지 처리
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const next = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("callbackUrl", next);
    return NextResponse.redirect(loginUrl);
  }

  // 5. 로그인 + 로그인/가입 페이지 접근 시 처리
  if (isLoggedIn && isGuestOnly) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|workbox-*.js|pwa-push.js|images).*)",
  ],
};
