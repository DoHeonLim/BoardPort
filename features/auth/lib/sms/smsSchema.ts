/**
 * File Name : features/auth/lib/sms/smsSchema.ts
 * Description : 유저 SMS 로그인 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  기존 app/(auth)/sms/actions 에 있던 스키마 분리
 * 2025.06.07  임도헌   Modified  전화번호 11자리 숫자 검증으로 변경.
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */

import { z } from "zod";
import validator from "validator";

// 전화번호 형식 검증 (동기)
export const phoneSchema = z
  .string({ required_error: "전화번호를 입력해주세요." })
  .trim()
  .refine(
    (phone) =>
      validator.isMobilePhone(phone, "ko-KR") && /^[0-9]{11}$/.test(phone),
    {
      message: "전화번호는 11자리 숫자여야 합니다.",
    }
  );

// 인증번호 형식만 검증
export const tokenSchema = z.coerce
  .number({
    required_error: "인증번호를 입력해주세요.",
    invalid_type_error: "인증번호는 숫자여야 합니다.",
  })
  .min(100000, "인증번호는 6자리입니다.")
  .max(999999, "인증번호는 6자리입니다.");

export type PhoneSchema = z.infer<typeof phoneSchema>;
export type TokenSchema = z.infer<typeof tokenSchema>;
