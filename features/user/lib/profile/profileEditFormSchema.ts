/**
 * File Name : features/user/lib/profile/profileEditFormSchema.ts
 * Description : 프로필 수정 스키마 (이메일 변경 불가, 최초 세팅만 허용 + SMS 인증 phone 삭제 방지)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.26  임도헌   Created
 * 2025.10.05  임도헌   Moved     app/(tabs)/profile/schema → lib/profile/form
 * 2025.12.12  임도헌   Modified  avatar/phone/password null변환 + needsPasswordSetup 분기 강화
 * 2025.12.13  임도헌   Modified  needsEmailSetup/needsPasswordSetup 분리 + 이메일 형식 검증 버그 수정
 * 2025.12.13  임도헌   Modified  SMS 인증된 phone 삭제 불가(hasVerifiedPhone) 추가
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

import { z } from "zod";
import validator from "validator";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REGEX_ERROR,
} from "@/lib/constants";

export type ProfileEditSchemaOptions = {
  needsEmailSetup: boolean;
  needsPasswordSetup: boolean;

  /** DB에 phone이 이미 있는 경우(SMS 인증 완료 상태) → 삭제 금지 */
  hasVerifiedPhone: boolean;
};

export const profileEditFormSchema = ({
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

      // "" → null
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

      // "" → null, 있으면 11자리 휴대폰 번호 + 형식 검증
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

      // "" → null
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

      // SMS 인증된 전화번호는 삭제 불가
      if (hasVerifiedPhone && !phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMS 인증된 전화번호는 삭제할 수 없습니다.",
          path: ["phone"],
        });
      }

      // 이메일은 "최초 세팅 필요"일 때만 필수 + 형식 검증
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

      // 비밀번호는 "최초 세팅 필요"일 때만 필수
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

      // 비밀번호가 입력된 경우 규칙 검증(값이 오면 검증)
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

      // 비밀번호/확인 중 하나라도 있으면 둘 다 같아야 함
      if ((password || confirmPassword) && password !== confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "비밀번호가 일치하지 않습니다.",
          path: ["confirmPassword"],
        });
      }
    });

export type ProfileEditType = z.infer<ReturnType<typeof profileEditFormSchema>>;
