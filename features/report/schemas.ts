/**
 * File Name : features/report/schemas.ts
 * Description : 신고 생성을 위한 데이터 검증 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   Zod 스키마 정의
 * 2026.02.06  임도헌   Modified  'REVIEW' 타겟 추가 및 'OTHER' 사유 선택 시 상세 내용 필수 검증 로직 추가
 */

import { z } from "zod";
import { ReportReason } from "@/generated/prisma/client";

/**
 * 신고 생성 요청 데이터 검증 스키마
 * - 타겟 ID/Type, 신고 사유 검증
 * - 'OTHER(기타)' 사유 선택 시 상세 내용 입력을 강제
 */
export const createReportSchema = z
  .object({
    targetId: z.number().int().positive("대상 식별자가 올바르지 않습니다."),
    targetType: z.enum([
      "USER",
      "PRODUCT",
      "POST",
      "COMMENT",
      "STREAM",
      "PRODUCT_MESSAGE",
      "STREAM_MESSAGE",
      "REVIEW",
    ]),
    reason: z.nativeEnum(ReportReason, {
      errorMap: () => ({ message: "신고 사유를 선택해주세요." }),
    }),
    description: z
      .string()
      .trim()
      .max(500, "상세 내용은 최대 500자까지 입력 가능합니다.")
      .optional(),
  })
  .refine(
    (data) => {
      if (
        data.reason === "OTHER" &&
        (!data.description || data.description.length < 5)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "기타 사유 선택 시 상세 내용을 5자 이상 입력해주세요.",
      path: ["description"],
    }
  );

export type CreateReportDTO = z.infer<typeof createReportSchema>;
