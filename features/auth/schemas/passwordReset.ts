/**
 * File Name : features/auth/schemas/passwordReset.ts
 * Description : 비밀번호 찾기/재설정 폼 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   비밀번호 재설정 요청/완료 폼 검증 스키마 추가
 */

import { z } from "zod";
import { requiredTrimmedString } from "@/lib/zod-helpers";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
} from "@/lib/constants";

/**
 * 비밀번호 찾기 메일 요청 폼 스키마
 * - 이메일 형식 검증
 */
export const passwordResetRequestSchema = z.object({
  email: requiredTrimmedString("이메일을 입력해주세요.")
    .toLowerCase()
    .email("이메일 형식을 확인해주세요."),
});

/**
 * 토큰 포함 비밀번호 재설정 스키마
 * - 서버 액션에서 token/password/confirmPassword를 함께 검증
 */
export const passwordResetSchema = z
  .object({
    token: requiredTrimmedString("재설정 토큰이 필요합니다."),
    password: requiredTrimmedString("비밀번호를 입력해주세요.")
      .min(PASSWORD_MIN_LENGTH, {
        message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      })
      .regex(PASSWORD_REGEX, {
        message: PASSWORD_REGEX_ERROR,
      }),
    confirmPassword: requiredTrimmedString("비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

/**
 * 클라이언트 비밀번호 재설정 폼 스키마
 * - token은 페이지 props로 받고, 사용자 입력 필드만 검증
 */
export const passwordResetFormSchema = z
  .object({
    password: requiredTrimmedString("비밀번호를 입력해주세요.")
      .min(PASSWORD_MIN_LENGTH, {
        message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      })
      .regex(PASSWORD_REGEX, {
        message: PASSWORD_REGEX_ERROR,
      }),
    confirmPassword: requiredTrimmedString("비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

/** 비밀번호 찾기 메일 요청 폼 타입 */
export type PasswordResetRequestSchema = z.infer<
  typeof passwordResetRequestSchema
>;
/** 토큰 포함 비밀번호 재설정 액션 타입 */
export type PasswordResetSchema = z.infer<typeof passwordResetSchema>;
/** 클라이언트 비밀번호 재설정 폼 타입 */
export type PasswordResetFormSchema = z.infer<typeof passwordResetFormSchema>;
