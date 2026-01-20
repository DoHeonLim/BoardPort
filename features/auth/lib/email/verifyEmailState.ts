/**
 * File Name : features/auth/lib/email/verifyEmailState.ts
 * Description : 이메일 인증 서버액션 상태 타입/초기값 (클라/서버 공용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.12  임도헌   Created   "use server" 파일 export 제약으로 상태/타입 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */

export interface IActionState {
  token: boolean;
  email?: string;
  error?: { formErrors?: string[] };
  success?: boolean;
  cooldownRemaining?: number; // 남은 쿨다운(초)
  sent?: boolean; // 이번 요청에서 실제 메일 발송 여부
}

export const initialEmailVerifyState: IActionState = {
  token: false,
  email: "",
  error: undefined,
  success: false,
  cooldownRemaining: undefined,
  sent: false,
};
