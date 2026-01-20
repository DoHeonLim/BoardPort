/**
 * File Name : features/user/lib/profile/passwordChangeSchema.ts
 * Description : 비밀번호 변경 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created    app/(tabs)/profile/edit에서 비밀번호 스키마 분리
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
} from "@/lib/constants";

/** 새/확인 비밀번호 동일성 검사 */
const handleCheckPasswords = ({
  password,
  confirmPassword,
}: {
  password?: string | null;
  confirmPassword?: string | null;
}) => password && confirmPassword && password === confirmPassword;

export const passwordChangeSchema = z
  .object({
    // 현재 비밀번호는 "입력 여부"만 확인 (패턴 검증 불필요)
    currentPassword: z.string().min(1, {
      message: "현재 비밀번호를 입력해주세요.",
    }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
      })
      .regex(PASSWORD_REGEX, { message: PASSWORD_REGEX_ERROR }),
    confirmPassword: z.string().min(PASSWORD_MIN_LENGTH, {
      message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    }),
  })
  .refine(handleCheckPasswords, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type PasswordUpdateType = z.infer<typeof passwordChangeSchema>;
