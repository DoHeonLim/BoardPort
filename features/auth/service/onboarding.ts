/**
 * File Name : features/auth/service/onboarding.ts
 * Description : 인증 직후 온보딩 필요 여부와 복귀 경로를 판단하는 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   로그인 직후 최소 프로필/지역 설정 누락 여부를 기준으로 온보딩 진입 경로를 공통화
 * 2026.03.18  임도헌   Modified  인증 완료 후 /login·/create-account·/sms·/onboarding 자기 자신 복귀를 /profile로 정규화
 * 2026.03.25  임도헌   Modified  소셜 자동 생성 닉네임은 콜백에서 강제 닉네임 보완 플래그를 받아 온보딩에 반영
 */

import "server-only";

import db from "@/lib/db";
import {
  POST_AUTH_BLOCKED_PREFIXES,
  TEMP_USERNAME_REGEX,
} from "@/features/auth/constants";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import type { AuthOnboardingState } from "@/features/auth/types";

type AuthOnboardingOptions = {
  forceUsernameSetup?: boolean;
};

/**
 * 임시 SMS 닉네임처럼 사용자 보정이 필요한 기본 닉네임인지 판별
 */
export function isTemporaryOnboardingUsername(username: string) {
  return TEMP_USERNAME_REGEX.test(username);
}

/**
 * 인증 완료 후 다시 들어가면 안 되는 인증 페이지 경로 정규화
 */
function normalizePostAuthTarget(rawNext: unknown) {
  const next = sanitizeCallbackUrl(rawNext ?? "/profile");

  if (POST_AUTH_BLOCKED_PREFIXES.some((prefix) => next.startsWith(prefix))) {
    return "/profile";
  }

  return next;
}

/**
 * 현재 계정이 서비스 사용에 필요한 최소 정보(닉네임/지역)를 갖췄는지 계산
 * - 이메일은 권장 보완 항목으로만 유지하고, 강제 온보딩 조건에는 포함하지 않는다.
 */
export async function getAuthOnboardingState(
  userId: number,
  options: AuthOnboardingOptions = {}
): Promise<AuthOnboardingState | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      github_id: true,
      kakao_id: true,
      locationName: true,
      region1: true,
      region2: true,
      region3: true,
      latitude: true,
      longitude: true,
    },
  });

  if (!user) return null;

  const isSocialLikeAccount = !!user.github_id || !!user.kakao_id || !!user.phone;
  const needsUsernameSetup =
    !!options.forceUsernameSetup ||
    isTemporaryOnboardingUsername(user.username);
  const needsEmailSetup = isSocialLikeAccount && !user.email;
  const needsLocationSetup =
    !user.locationName ||
    !user.region1 ||
    !user.region2 ||
    user.latitude == null ||
    user.longitude == null;

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    locationName: user.locationName,
    region1: user.region1,
    region2: user.region2,
    region3: user.region3,
    latitude: user.latitude,
    longitude: user.longitude,
    needsUsernameSetup,
    needsEmailSetup,
    needsLocationSetup,
    needsOnboarding: needsUsernameSetup || needsLocationSetup,
  };
}

/**
 * 온보딩 페이지 href를 공통 규칙으로 생성
 */
export function buildOnboardingHref(rawNext: unknown) {
  const safeNext = normalizePostAuthTarget(rawNext);
  return `/onboarding?next=${encodeURIComponent(safeNext)}`;
}

/**
 * 인증 성공 직후 최종 이동 경로를 결정
 * - 최소 정보가 비어 있으면 온보딩
 * - 아니면 원래 callbackUrl
 */
export async function resolvePostAuthRedirectPath(
  userId: number,
  rawNext: unknown,
  options: AuthOnboardingOptions = {}
) {
  const safeNext = normalizePostAuthTarget(rawNext);
  const onboarding = await getAuthOnboardingState(userId, options);

  if (onboarding?.needsOnboarding) {
    const query = new URLSearchParams({
      next: safeNext,
    });

    if (options.forceUsernameSetup) {
      query.set("setupUsername", "1");
    }

    return `/onboarding?${query.toString()}`;
  }

  return safeNext;
}
