/**
 * File Name : features/auth/service/kakao.ts
 * Description : Kakao OAuth 인증 및 유저 처리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.24  임도헌   Created   카카오 로그인 토큰 발급, 프로필 조회, 유저 생성 로직 구현
 */

import "server-only";
import crypto from "node:crypto";
import { AUTH_ERRORS } from "@/features/auth/constants";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import type { KakaoProfile } from "@/features/auth/types";

/**
 * 카카오 인증 코드(code)로 액세스 토큰을 요청
 *
 * - 카카오 REST API는 `x-www-form-urlencoded` 형식을 요구함
 * - POST 요청을 통해 Access Token을 발급받음
 *
 * @param code - 카카오 Redirect URI에서 전달받은 인가 코드
 * @returns Access Token 문자열
 * @throws {Error} 토큰 발급 실패 시 에러 발생
 */
export async function getKakaoAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    code,
  }).toString();

  const url = "https://kauth.kakao.com/oauth/token";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: params,
    cache: "no-store",
  });

  const data = await response.json();

  if (data.error || !data.access_token) {
    console.error("Kakao Token Error:", data);
    throw new Error(AUTH_ERRORS.KAKAO_TOKEN_FAILED);
  }

  return data.access_token;
}

/**
 * 액세스 토큰으로 카카오 유저 프로필 정보를 조회
 *
 * @param accessToken - 카카오 Access Token
 * @returns 카카오 프로필 객체 (KakaoProfile)
 * @throws {Error} 프로필 조회 실패 시 에러 발생
 */
export async function getKakaoUserProfile(
  accessToken: string
): Promise<KakaoProfile> {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(AUTH_ERRORS.KAKAO_PROFILE_FAILED);
  }

  return await response.json();
}

/**
 * 카카오 프로필 정보로 유저를 찾거나 새로 생성
 *
 * [로직]
 * 1. `kakao_id`로 기존 유저가 있는지 확인하고 있으면 ID 반환
 * 2. 신규 유저일 경우 닉네임, 이메일, 아바타 정보를 파싱 (선택 동의 대비 Optional 처리)
 * 3. `username` 뒤에 `-kk` 접미사를 붙여 생성 시도
 * 4. P2002(Unique 중복) 에러 발생 시 방어 로직 실행:
 *    - 이메일 중복 시: 이메일을 제외하고 가입 시도
 *    - 닉네임 중복 시: 닉네임 뒤에 난수를 붙여 재시도
 *
 * @param profile - 카카오 프로필 정보
 * @returns 유저 ID
 */
export async function findOrCreateKakaoUser(
  profile: KakaoProfile
): Promise<number> {
  const kakaoIdStr = String(profile.id);

  // 1. 기존 유저 조회
  const existingUser = await db.user.findUnique({
    where: { kakao_id: kakaoIdStr },
    select: { id: true },
  });

  if (existingUser) return existingUser.id;

  // 2. 신규 유저 데이터 파싱 (선택 동의 항목은 기본값 처리)
  const account = profile.kakao_account;
  const nickname = account?.profile?.nickname || "kakao";

  // 카카오 기본 프로필 이미지이거나 제공 동의를 안 한 경우 null 처리
  const avatar = account?.profile?.is_default_image
    ? null
    : account?.profile?.profile_image_url || null;

  // 이메일 제공 동의를 안 한 경우 null 처리
  const email = account?.email || null;

  // 닉네임 + '-kk' 접미사 (최대 10자 보장)
  let baseUsername = `${nickname}-kk`.toLowerCase();
  if (baseUsername.length > 10) {
    baseUsername = baseUsername.slice(0, 10);
  }

  // 내부 재사용 헬퍼 함수
  const attemptCreateUser = async (
    usernameData: string,
    emailData: string | null
  ) => {
    return await db.user.create({
      data: {
        username: usernameData,
        kakao_id: kakaoIdStr,
        avatar,
        email: emailData,
      },
      select: { id: true },
    });
  };

  try {
    // 3. 1차 생성 시도
    const newUser = await attemptCreateUser(baseUsername, email);
    return newUser.id;
  } catch (error) {
    // 4. 중복 에러(P2002) 방어 로직
    if (isUniqueConstraintError(error)) {
      const isEmailTaken = isUniqueConstraintError(error, ["email"]);
      const isUsernameTaken = isUniqueConstraintError(error, ["username"]);

      // 이메일이 이미 존재하면 이메일 정보 없이 가입 시도
      const safeEmail = isEmailTaken ? null : email;
      // 닉네임이 존재하면 뒤에 난수 4자리 부착
      const safeUsername = isUsernameTaken
        ? `${baseUsername.slice(0, 5)}_${crypto.randomBytes(2).toString("hex")}`
        : baseUsername;

      try {
        const fallbackUser = await attemptCreateUser(safeUsername, safeEmail);
        return fallbackUser.id;
      } catch (fallbackError) {
        // 극한의 확률로 난수 닉네임까지 또 겹쳤을 경우 최후의 방어
        if (isUniqueConstraintError(fallbackError, ["username"])) {
          const finalUsername = `kk_${crypto.randomBytes(3).toString("hex")}`;
          const finalUser = await attemptCreateUser(finalUsername, safeEmail);
          return finalUser.id;
        }
        throw fallbackError;
      }
    }
    throw error; // P2002가 아닌 시스템 에러는 상위로 전파
  }
}
