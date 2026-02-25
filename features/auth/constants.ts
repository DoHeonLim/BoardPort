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
 */

import { EmailVerifyState } from "@/features/auth/types";

/** 이메일 인증 폼 초기 상태 */
export const INITIAL_EMAIL_VERIFY_STATE: EmailVerifyState = {
  token: false,
  email: "",
  error: undefined,
  success: false,
  cooldownRemaining: undefined,
  sent: false,
};

/** 인증 관련 에러 메시지 모음 */
export const AUTH_ERRORS = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  INVALID_INPUT: "입력값이 올바르지 않습니다.",
  UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",

  // Login
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 잘못되었습니다.",

  // Register
  USERNAME_TAKEN: "이미 사용 중인 닉네임입니다.",
  EMAIL_TAKEN: "이미 가입된 이메일입니다.",
  PHONE_TAKEN: "이미 사용 중인 전화번호입니다.",

  // SMS
  SMS_SEND_FAILED: "SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
  SMS_VERIFY_FAILED: "인증번호가 일치하지 않거나 만료되었습니다.",

  // GitHub
  GITHUB_TOKEN_FAILED: "GitHub 인증 토큰을 받아오지 못했습니다.",
  GITHUB_PROFILE_FAILED: "GitHub 프로필 정보를 가져오지 못했습니다.",

  // Kakao
  KAKAO_TOKEN_FAILED: "카카오 인증 토큰을 받아오지 못했습니다.",
  KAKAO_PROFILE_FAILED: "카카오 프로필 정보를 가져오지 못했습니다.",
} as const;
