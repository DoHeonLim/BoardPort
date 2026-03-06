/**
 * File Name : features/auth/types.ts
 * Description : 인증 도메인 전용 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   Auth 관련 공용 타입 정의
 * 2026.01.20  임도헌   Modified  Action/Form State 및 EmailVerifyState 추가
 * 2026.01.24  임도헌   Moved     root/types/auth.ts -> features/auth/types.ts
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  카카오 프로필 정보(KakaoProfile) 타입 추가
 * 2026.03.07  임도헌   Modified  타입 섹션 구조 정리
 */

// =============================================================================
// 1. Action / Form State Types
// =============================================================================

/** 서버 액션 공통 응답 (Form State) */
export type ActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// =============================================================================
// 2. OAuth Profile Types
// =============================================================================

/** GitHub 프로필 정보 */
export interface GitHubProfile {
  id: number;
  avatar_url: string;
  login: string;
  email?: string | null;
}

/**
 * 카카오 프로필 정보
 * - 사용자가 '선택 동의'를 하지 않은 경우 kakao_account 내부 필드가 없을 수 있음
 */
export interface KakaoProfile {
  id: number; // 카카오 고유 식별자
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      is_default_image?: boolean;
    };
  };
}

// =============================================================================
// 3. Auth Flow State Types
// =============================================================================

/** 이메일 인증 상태 (useFormState용) */
export interface EmailVerifyState {
  token: boolean; // 토큰 발송 단계 여부
  email?: string;
  error?: { formErrors?: string[] };
  success?: boolean;
  cooldownRemaining?: number; // 남은 쿨다운(초)
  sent?: boolean; // 이번 요청에서 실제 메일 발송 여부
}
