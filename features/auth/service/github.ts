/**
 * File Name : features/auth/service/github.ts
 * Description : GitHub OAuth 인증 및 유저 처리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  getAccessToken, getGithubProfile 함수로 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.20  임도헌   Renamed   oauth.ts -> service.ts
 * 2026.01.20  임도헌   Modified  GitHub OAuth 로직 통합 (Token/Profile/User DB)
 * 2026.01.21  임도헌   Moved  lib/github/service -> service/github
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import "server-only";
import { AUTH_ERRORS } from "@/features/auth/constants";
import db from "@/lib/db";
import type { GitHubProfile } from "@/features/auth/types";

/**
 * GitHub 인증 코드(code)로 액세스 토큰을 요청합니다.
 *
 * @param {string} code - GitHub Redirect URL에서 받은 code
 * @returns {Promise<string>} Access Token 문자열
 * @throws {Error} 토큰 발급 실패 시 에러 발생
 */
export async function getGitHubAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    client_secret: process.env.GITHUB_CLIENT_SECRET!,
    code,
  }).toString();

  const url = `https://github.com/login/oauth/access_token?${params}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  const { error, access_token } = await response.json();

  if (error || !access_token) {
    throw new Error(AUTH_ERRORS.GITHUB_TOKEN_FAILED);
  }

  return access_token;
}

/**
 * 액세스 토큰으로 GitHub 유저 프로필 정보를 조회합니다.
 *
 * @param {string} accessToken - GitHub Access Token
 * @returns {Promise<GitHubProfile>} 깃허브 프로필 객체
 * @throws {Error} 프로필 조회 실패 시 에러 발생
 */
export async function getGitHubUserProfile(
  accessToken: string
): Promise<GitHubProfile> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error(AUTH_ERRORS.GITHUB_PROFILE_FAILED);
  }

  return await response.json();
}

/**
 * GitHub 프로필 정보로 유저를 찾거나 새로 생성합니다.
 *
 * @param {GitHubProfile} profile - GitHub 프로필 정보
 * @returns {Promise<number>} 유저 ID
 */
export async function findOrCreateGitHubUser(
  profile: GitHubProfile
): Promise<number> {
  const githubIdStr = String(profile.id);

  // 1. 기존 유저 조회
  const existingUser = await db.user.findUnique({
    where: { github_id: githubIdStr },
    select: { id: true },
  });

  if (existingUser) return existingUser.id;

  // 2. 신규 유저 생성 (username 중복 방지 접미사 사용)
  const newUser = await db.user.create({
    data: {
      username: `${profile.login}-gh`,
      github_id: githubIdStr,
      avatar: profile.avatar_url,
    },
    select: { id: true },
  });

  return newUser.id;
}
