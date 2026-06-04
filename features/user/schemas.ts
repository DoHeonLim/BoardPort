/**
 * File Name : features/user/schemas.ts
 * Description : 유저 관련 Zod 스키마 (Profile Edit, Password Change)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   기존 lib/profile/*Schemas.ts 통합
 * 2026.03.08  임도헌   Modified  normalizeNullableString/requiredTrimmedString 공통 유틸 적용으로 선택 입력과 필수값 처리 통일
 * 2026.03.12  임도헌   Modified  프로필 이미지 애니메이션 메타 저장용 avatarAnimated 필드 추가
 * 2026.03.21  임도헌   Modified  방송국 소개 전용 channelDescriptionSchema 추가
 * 2026.06.04  임도헌   Modified  프로필 유저명 최대 길이를 인증 스키마와 공용 상수로 통일
 */

import { z } from "zod";
import validator from "validator";
import {
  normalizeNullableString,
  requiredTrimmedString,
} from "@/lib/zod-helpers";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
  USERNAME_MAX_LENGTH,
} from "@/lib/constants";

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
 * - 선택 입력값은 normalizeNullableString으로 null 정규화
 */
export const profileEditSchema = ({
  needsEmailSetup,
  needsPasswordSetup,
  hasVerifiedPhone,
}: ProfileEditSchemaOptions) =>
  z
    .object({
      username: requiredTrimmedString("유저명을 입력해주세요.")
        .toLowerCase()
        .min(3, "유저명은 최소 3자 이상이어야 합니다.")
        .max(
          USERNAME_MAX_LENGTH,
          `유저명은 최대 ${USERNAME_MAX_LENGTH}자까지 가능합니다.`
        ),

      email: normalizeNullableString(
        z.string().trim().max(255, "이메일은 255자 이하만 가능합니다.")
      ),

      avatar: normalizeNullableString(),

      avatarAnimated: z.boolean().optional().default(false),

      phone: normalizeNullableString()
        .refine(
          (phone) =>
            !phone ||
            (validator.isMobilePhone(phone, "ko-KR") &&
              /^[0-9]{11}$/.test(phone)),
          { message: "전화번호는 11자리 숫자여야 합니다." }
        ),

      password: normalizeNullableString(),

      confirmPassword: normalizeNullableString(),
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

export const channelDescriptionSchema = z.object({
  channelDescription: normalizeNullableString(
    z.string().trim().max(160, "채널 소개는 160자 이하만 가능합니다.")
  ),
});

export type ChannelDescriptionDTO = z.infer<typeof channelDescriptionSchema>;

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

/**
 * 비밀번호 변경 폼 스키마
 * - 현재 비밀번호/새 비밀번호/확인 필드 검증
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: requiredTrimmedString("현재 비밀번호를 입력해주세요."),
    password: requiredTrimmedString("비밀번호를 입력해주세요.")
      .min(
        PASSWORD_MIN_LENGTH,
        `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
      )
      .regex(PASSWORD_REGEX, PASSWORD_REGEX_ERROR),
    confirmPassword: requiredTrimmedString("비밀번호 확인을 입력해주세요.")
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
