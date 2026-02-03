/**
 * File Name : features/auth/schemas/register.ts
 * Description : 유저 회원가입 스키마
s * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  기존 app/(auth)/create-account/actions 에 있던 스키마 분리
 * 2025.06.07  임도헌   Modified  type 파스칼 케이스로 변경
 * 2025.12.09  임도헌   Modified  유효성 검사 에러 메시지 한글화 및 길이/패턴 검증 정리
 * 2025.12.10  임도헌   Modified  이메일 검증 로직 단순화(zod email 사용) 및 스키마 정리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved     lib/createAccountSchema -> schemas/register
 */

import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
} from "@/lib/constants";

// 유저 비밀번호 확인 함수
export const handleCheckPasswords = ({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) => password === confirmPassword;

export const createAccountSchema = z
  .object({
    username: z
      .string({
        invalid_type_error: "유저명은 문자여야 합니다.",
        required_error: "유저명을 입력해주세요.",
      })
      .trim()
      .min(3, { message: "유저명은 최소 3자 이상이어야 합니다." })
      .max(10, { message: "유저명은 최대 10자까지 입력할 수 있습니다." })
      .toLowerCase(),

    email: z
      .string({
        required_error: "이메일을 입력해주세요.",
        invalid_type_error: "이메일은 문자여야 합니다.",
      })
      .trim()
      .toLowerCase()
      .email({ message: "이메일 형식을 확인해주세요." }),

    password: z
      .string({
        required_error: "비밀번호를 입력해주세요.",
      })
      .trim()
      .min(PASSWORD_MIN_LENGTH, {
        message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      })
      .regex(PASSWORD_REGEX, {
        message: PASSWORD_REGEX_ERROR,
      }),

    confirmPassword: z
      .string({
        required_error: "비밀번호 확인을 입력해주세요.",
      })
      .trim()
      .min(PASSWORD_MIN_LENGTH, {
        message: `비밀번호 확인은 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      }),
  })
  .refine(handleCheckPasswords, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type CreateAccountSchema = z.infer<typeof createAccountSchema>;
