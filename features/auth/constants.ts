/**
 * File Name : features/auth/constants.ts
 * Description : 인증 도메인 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   verifyEmailState.ts에서 constants.ts로 이동
 * 2026.01.24  임도헌   Modified  AUTH_ERRORS를 lib/constants에서 이관
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  카카오 로그인 관련 에러 메시지 추가
 * 2026.04.02  임도헌   Modified  이메일 인증/비밀번호 재설정/인증 후 복귀 정책 상수 추가
 * 2026.05.16  임도헌   Modified  타입 전용 import를 명시해 런타임 의존성 제거
 * 2026.06.27  임도헌   Modified  SMS 인증번호 TTL, 재전송 쿨다운, 인증 IP 제한 상수 추가
 */

import type { EmailVerifyState } from "@/features/auth/types";

/** 이메일 인증 폼 초기 상태 */
export const INITIAL_EMAIL_VERIFY_STATE: EmailVerifyState = {
  token: false,
  email: "",
  error: undefined,
  success: false,
  cooldownRemaining: undefined,
  sent: false,
};

/** 이메일 인증 정책값 */
/** 이메일 재발송 쿨다운(초) */
export const EMAIL_VERIFY_RESEND_COOLDOWN_SECONDS = 180;
/** 이메일 인증 토큰 유효 시간(ms) */
export const EMAIL_VERIFY_TOKEN_TTL_MS = 10 * 60 * 1000;

/** 비밀번호 재설정 정책값 */
/** 비밀번호 재설정 토큰 유효 시간(ms) */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
/** 비밀번호 재설정 재요청 쿨다운(ms) */
export const PASSWORD_RESET_COOLDOWN_MS = 3 * 60 * 1000;

/** 인증 완료 후 자기 자신으로 복귀시키지 않을 경로 */
export const POST_AUTH_BLOCKED_PREFIXES = [
  "/login",
  "/create-account",
  "/sms",
  "/onboarding",
] as const;

/** SMS 자동 생성 유저명처럼 보완이 필요한 임시 닉네임 패턴 */
export const TEMP_USERNAME_REGEX = /^user_[0-9a-f]{8}$/i;

/** SMS 인증 정책값 */
/** SMS 재전송 쿨다운(초) */
export const SMS_VERIFY_RESEND_COOLDOWN_SECONDS = 60;
/** SMS 인증 토큰 유효 시간(ms) */
export const SMS_VERIFY_TOKEN_TTL_MS = 10 * 60 * 1000;
/** 같은 IP에서 허용하는 SMS 발송 요청 수 */
export const SMS_SEND_IP_RATE_LIMIT_MAX = 10;
/** IP 기준 SMS 발송 요청 제한 시간 창(ms) */
export const SMS_SEND_IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** 회원가입 제출 rate limit 정책값 */
/** IP 기준 회원가입 제출 제한 시간 창(ms) */
export const SIGNUP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/** 같은 IP에서 허용하는 회원가입 제출 수 */
export const SIGNUP_RATE_LIMIT_MAX = 10;

/** 인증 관련 에러 메시지 모음 */
export const AUTH_ERRORS = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  INVALID_INPUT: "입력값이 올바르지 않습니다.",
  UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",

  // Login
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 잘못되었습니다.",
  INVALID_RESET_TOKEN: "재설정 링크가 만료되었거나 유효하지 않습니다.",

  // Register
  USERNAME_TAKEN: "이미 사용 중인 닉네임입니다.",
  EMAIL_TAKEN: "이미 가입된 이메일입니다.",
  EMAIL_TAKEN_BY_SOCIAL:
    "이미 소셜 로그인으로 가입된 이메일입니다. 기존 소셜 로그인을 이용해주세요.",
  PHONE_TAKEN: "이미 사용 중인 전화번호입니다.",

  // SMS
  SMS_SEND_FAILED: "SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
  SMS_VERIFY_FAILED: "인증번호가 일치하지 않거나 만료되었습니다.",
  SMS_RATE_LIMITED: "인증번호를 방금 발송했습니다. 잠시 후 다시 시도해주세요.",

  // Signup abuse control
  SIGNUP_RATE_LIMITED: "요청이 많습니다. 잠시 후 다시 시도해주세요.",

  // GitHub
  GITHUB_TOKEN_FAILED: "GitHub 인증 토큰을 받아오지 못했습니다.",
  GITHUB_PROFILE_FAILED: "GitHub 프로필 정보를 가져오지 못했습니다.",

  // Kakao
  KAKAO_TOKEN_FAILED: "카카오 인증 토큰을 받아오지 못했습니다.",
  KAKAO_PROFILE_FAILED: "카카오 프로필 정보를 가져오지 못했습니다.",
} as const;
