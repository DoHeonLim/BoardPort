/**
 * File Name : features/auth/schemas/login.ts
 * Description : 유저 로그인 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  기존 app/(auth)/login/actions 에 있던 스키마 분리
 * 2025.12.09  임도헌   Modified  이메일/비밀번호 검증 메시지 및 trim 처리 추가
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/schemas
 * 2026.01.21  임도헌   Moved     lib/loginSchema -> schemas/login
 * 2026.03.08  임도헌   Modified  requiredTrimmedString 공통 유틸 적용으로 빈 문자열/공백 입력 검증 통일
 */

import { z } from "zod";
import { requiredTrimmedString } from "@/lib/zod-helpers";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

/**
 * 로그인 폼 검증 스키마
 * - 공백 제거 후 이메일/비밀번호 필수값 검증
 */
export const loginSchema = z.object({
  email: requiredTrimmedString("이메일을 입력해주세요.")
    .trim()
    .toLowerCase()
    .email({ message: "이메일 형식을 확인해주세요." }),

  password: requiredTrimmedString("비밀번호를 입력해주세요.")
    .min(PASSWORD_MIN_LENGTH, {
      message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
