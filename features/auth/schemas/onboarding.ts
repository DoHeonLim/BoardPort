/**
 * File Name : features/auth/schemas/onboarding.ts
 * Description : 인증 직후 온보딩 폼 검증 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   닉네임/이메일/지역 최소 설정용 동적 Zod 스키마 추가
 * 2026.04.02  임도헌   Modified  온보딩 스키마 JSDoc 보강
 */

import { z } from "zod";
import validator from "validator";
import { requiredTrimmedString } from "@/lib/zod-helpers";

type OnboardingSchemaOptions = {
  needsUsernameSetup: boolean;
  needsLocationSetup: boolean;
};

/**
 * hidden 좌표 필드의 빈 문자열/NaN 입력을 optional number로 정규화
 */
const optionalCoordinate = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return value;
}, z.number().optional());

/**
 * 현재 계정 상태에 따라 필요한 항목만 강제하는 동적 온보딩 스키마
 *
 * @param needsUsernameSetup - 유저명 보완 필요 여부
 * @param needsLocationSetup - 활동 지역 보완 필요 여부
 * @returns {ReturnType<typeof z.object>} 온보딩 검증 스키마
 */
export const onboardingSchema = ({
  needsUsernameSetup,
  needsLocationSetup,
}: OnboardingSchemaOptions) =>
  z
    .object({
      username: z.string().optional(),
      email: z.string().optional(),
      locationName: z.string().optional(),
      region1: z.string().optional(),
      region2: z.string().optional(),
      region3: z.string().optional(),
      latitude: optionalCoordinate,
      longitude: optionalCoordinate,
    })
    .superRefine((data, ctx) => {
      if (needsUsernameSetup) {
        const username = requiredTrimmedString("유저명을 입력해주세요.")
          .toLowerCase()
          .min(3, "유저명은 최소 3자 이상이어야 합니다.")
          .max(10, "유저명은 최대 10자까지 가능합니다.")
          .safeParse(data.username);

        if (!username.success) {
          username.error.errors.forEach((issue) => {
            ctx.addIssue({ ...issue, path: ["username"] });
          });
        }
      }

      const email = (data.email ?? "").trim();
      if (email && !validator.isEmail(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "이메일 형식을 확인해주세요.",
        });
      }

      if (needsLocationSetup) {
        if (!(data.locationName ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["locationName"],
            message: "활동 지역을 선택해주세요.",
          });
        }
        if (!(data.region1 ?? "").trim() || !(data.region2 ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["locationName"],
            message: "활동 지역 정보를 다시 선택해주세요.",
          });
        }
        if (
          typeof data.latitude !== "number" ||
          Number.isNaN(data.latitude) ||
          typeof data.longitude !== "number" ||
          Number.isNaN(data.longitude)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["locationName"],
            message: "활동 지역 좌표를 확인해주세요.",
          });
        }
      }
    });

/** 인증 직후 온보딩 폼 값 타입 */
export type OnboardingSchema = z.infer<ReturnType<typeof onboardingSchema>>;
