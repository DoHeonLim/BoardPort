/**
 * File Name : features/user/schemas.ts
 * Description : 유저 관련 Zod 스키마 (Profile Edit, Password Change)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   기존 lib/profile/*Schemas.ts 통합
 */

import { z } from "zod";
import validator from "validator";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
} from "@/lib/constants"; // Global constants (Auth와 공유)

// =============================================================================
// 1. Profile Edit Schema
// =============================================================================

export type ProfileEditSchemaOptions = {
  needsEmailSetup: boolean;
  needsPasswordSetup: boolean;
  hasVerifiedPhone: boolean;
};

/**
 * 프로필 수정 폼 스키마
 * - 상황(소셜 로그인 여부 등)에 따라 동적으로 검증 로직이 추가
 */
export const profileEditSchema = ({
  needsEmailSetup,
  needsPasswordSetup,
  hasVerifiedPhone,
}: ProfileEditSchemaOptions) =>
  z
    .object({
      username: z
        .string({
          invalid_type_error: "유저명은 문자여야 합니다.",
          required_error: "유저명을 입력해주세요.",
        })
        .toLowerCase()
        .trim()
        .min(3, "유저명은 최소 3자 이상이어야 합니다.")
        .max(10, "유저명은 최대 10자까지 가능합니다."),

      email: z
        .string()
        .trim()
        .max(255, "이메일은 255자 이하만 가능합니다.")
        .optional()
        .nullable()
        .transform((val) => (val === "" || val == null ? null : val)),

      avatar: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val === "" || val == null ? null : val)),

      phone: z
        .string()
        .trim()
        .optional()
        .nullable()
        .transform((val) => (val === "" || val == null ? null : val))
        .refine(
          (phone) =>
            !phone ||
            (validator.isMobilePhone(phone, "ko-KR") &&
              /^[0-9]{11}$/.test(phone)),
          { message: "전화번호는 11자리 숫자여야 합니다." }
        ),

      password: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val === "" || val == null ? null : val)),

      confirmPassword: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val === "" || val == null ? null : val)),
    })
    .superRefine((data, ctx) => {
      const { email, phone, password, confirmPassword } = data;

      // 이미 인증된 전화번호는 삭제 불가
      if (hasVerifiedPhone && !phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMS 인증된 전화번호는 삭제할 수 없습니다.",
          path: ["phone"],
        });
      }

      // 이메일 설정 필요 시 필수 검증
      if (needsEmailSetup) {
        if (!email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "이메일을 입력해주세요.",
            path: ["email"],
          });
        } else if (!validator.isEmail(email)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "이메일 형식을 확인해주세요.",
            path: ["email"],
          });
        }
      }

      // 비밀번호 설정 필요 시 필수 검증
      if (needsPasswordSetup) {
        if (!password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "비밀번호를 입력해주세요.",
            path: ["password"],
          });
        }
        if (!confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "비밀번호 확인을 입력해주세요.",
            path: ["confirmPassword"],
          });
        }
      }

      // 비밀번호 유효성 및 일치 여부 검증
      if (password) {
        if (password.length < PASSWORD_MIN_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
            path: ["password"],
          });
        }
        if (!PASSWORD_REGEX.test(password)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: PASSWORD_REGEX_ERROR,
            path: ["password"],
          });
        }
      }

      if ((password || confirmPassword) && password !== confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "비밀번호가 일치하지 않습니다.",
          path: ["confirmPassword"],
        });
      }
    });

export type ProfileEditDTO = z.infer<ReturnType<typeof profileEditSchema>>;

// =============================================================================
// 2. Password Change Schema
// =============================================================================

const checkPasswordsMatch = ({
  password,
  confirmPassword,
}: {
  password?: string | null;
  confirmPassword?: string | null;
}) => password && confirmPassword && password === confirmPassword;

/** 비밀번호 변경 폼 스키마 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
      )
      .regex(PASSWORD_REGEX, PASSWORD_REGEX_ERROR),
    confirmPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
      ),
  })
  .refine(checkPasswordsMatch, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type PasswordChangeDTO = z.infer<typeof passwordChangeSchema>;
