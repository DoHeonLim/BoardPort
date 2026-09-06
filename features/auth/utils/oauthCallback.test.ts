/**
 * File Name : features/auth/utils/oauthCallback.test.ts
 * Description : OAuth 시작 라우트의 인증 후 복귀 경로 보존 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   기본 프로필 경로와 사용자 지정 callbackUrl 쿠키 저장 검증
 */

import { describe, expect, it } from "vitest";
import { GET as startGitHubOAuth } from "@/app/(public)/github/start/route";
import { GET as startKakaoOAuth } from "@/app/(public)/kakao/start/route";

describe.each([
  ["카카오", startKakaoOAuth, "kakao_oauth_callback_url"],
  ["GitHub", startGitHubOAuth, "gh_oauth_callback_url"],
])("%s OAuth callbackUrl", (_provider, startOAuth, cookieName) => {
  it("쿼리가 없으면 기본 프로필 경로를 저장한다", () => {
    const response = startOAuth(new Request("http://localhost/oauth/start"));

    expect(response.cookies.get(cookieName)?.value).toBe("/profile");
  });

  it("사용자가 진입한 내부 경로를 저장한다", () => {
    const callbackUrl = "/products/12?tab=chat";
    const requestUrl = new URL("http://localhost/oauth/start");
    requestUrl.searchParams.set("callbackUrl", callbackUrl);

    const response = startOAuth(new Request(requestUrl));

    expect(response.cookies.get(cookieName)?.value).toBe(callbackUrl);
  });
});
