/**
 * File Name : features/auth/lib/github/oauth
 * Description : github oauth 인증 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  getAccessToken, getGithubProfile 함수로 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */

// accessToken 요청 함수
export async function getAccessToken(code: string): Promise<string> {
  const accessTokenParams = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    client_secret: process.env.GITHUB_CLIENT_SECRET!,
    code,
  }).toString();

  const accessTokenURL = `https://github.com/login/oauth/access_token?${accessTokenParams}`;

  const accessTokenResponse = await fetch(accessTokenURL, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const { error, access_token } = await accessTokenResponse.json();
  if (error) {
    throw new Error("GitHub 인증 토큰을 받아오지 못했습니다.");
  }
  return access_token;
}

// gitHub 프로필 요청
export async function getGithubProfile(access_token: string): Promise<{
  id: number;
  avatar_url: string;
  login: string;
}> {
  const userProfileResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    cache: "no-cache",
  });

  if (!userProfileResponse.ok) {
    throw new Error("GitHub 프로필 정보를 가져오지 못했습니다.");
  }

  const { id, avatar_url, login } = await userProfileResponse.json();
  return { id, avatar_url, login };
}
