/**
 * File Name : features/boardgame/schemas.ts
 * Description : 보드게임 카탈로그 관리자 입력 검증 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 import와 한국어 locale 저장 입력 검증 추가
 * 2026.04.28  임도헌   Modified  Kaggle CSV import 전환에 따라 BGG ID 입력 스키마 제거
 * 2026.04.29  임도헌   Modified  공개 상태 전환 시 짧은 설명 필수 검증 추가
 * 2026.05.05  임도헌   Modified  CSV import 확장 후 한국어 locale 검증 정책 점검
 */

import { z } from "zod";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";

const stringListSchema = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((items) => Array.from(new Set(items)));

export const boardGameKoreanLocaleSchema = z
  .object({
    title: z.string().trim().min(1, "한국어 제목을 입력해주세요.").max(80),
    aliases: stringListSchema,
    shortDescription: z
      .string()
      .trim()
      .max(240, "짧은 설명은 240자 이내로 입력해주세요.")
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    searchKeywords: stringListSchema,
    status: z
      .nativeEnum(BoardGameLocaleStatus)
      .optional()
      .default(BoardGameLocaleStatus.DRAFT),
  })
  .superRefine((value, ctx) => {
    if (
      value.status === BoardGameLocaleStatus.PUBLISHED &&
      !value.shortDescription
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shortDescription"],
        message: "공개 상태로 전환하려면 짧은 설명을 입력해주세요.",
      });
    }
  });

export type BoardGameKoreanLocaleFormValues = z.infer<
  typeof boardGameKoreanLocaleSchema
>;
