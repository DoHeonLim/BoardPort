/**
 * File Name : features/report/service/create.ts
 * Description : 신고 생성 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   중복 체크 및 Rate Limit 로직 포함 생성 기능 구현
 * 2026.02.06  임도헌   Modified  리뷰 신고(targetReviewId) 매핑 로직 추가
 */

import "server-only";
import db from "@/lib/db";
import {
  REPORT_ERRORS,
  REPORT_POLICY,
  type ReportTargetType,
} from "@/features/report/constants";
import { CreateReportDTO } from "@/features/report/schemas";
import type { ServiceResult } from "@/lib/types";

/**
 * 신규 신고 접수 처리
 * - 본인 신고 차단, 중복 신고 검사, Rate Limit(도배 방지) 적용
 * - 검증 통과 시 DB에 신고 레코드 생성
 *
 * @param reporterId - 신고자 ID
 * @param data - 신고 데이터 DTO
 * @returns {Promise<ServiceResult>} 접수 결과
 */
export async function createReport(
  reporterId: number,
  data: CreateReportDTO
): Promise<ServiceResult> {
  try {
    // 1. 대상 필드 매핑
    const targetFieldMap: Record<ReportTargetType, string> = {
      USER: "targetUserId",
      PRODUCT: "targetProductId",
      POST: "targetPostId",
      COMMENT: "targetCommentId",
      STREAM: "targetStreamId",
      PRODUCT_MESSAGE: "targetProductMessageId",
      STREAM_MESSAGE: "targetStreamMessageId",
      REVIEW: "targetReviewId",
    } as const;

    const targetField = targetFieldMap[data.targetType];

    // 2. 본인 신고 체크 (USER 타입일 때만)
    if (data.targetType === "USER" && data.targetId === reporterId) {
      return { success: false, error: REPORT_ERRORS.SELF_REPORT };
    }

    // 3. 중복 신고 체크 (1인 1대상 1회 제한)
    const existing = await db.report.findFirst({
      where: {
        reporterId,
        [targetField]: data.targetId,
        status: "PENDING", // 처리 대기 중인 동일 신고가 있는지 확인
      },
    });

    if (existing) {
      return { success: false, error: REPORT_ERRORS.DUPLICATE_REPORT };
    }

    // 4. Rate Limit 체크 (도배 방지)
    const limitWindow = new Date(
      Date.now() - REPORT_POLICY.WINDOW_MINUTES * 60 * 1000
    );
    const recentCount = await db.report.count({
      where: {
        reporterId,
        created_at: { gte: limitWindow },
      },
    });

    if (recentCount >= REPORT_POLICY.MAX_REPORTS_PER_WINDOW) {
      return { success: false, error: REPORT_ERRORS.RATE_LIMIT };
    }

    // 5. DB 저장
    await db.report.create({
      data: {
        reporterId,
        reason: data.reason,
        description: data.description,
        [targetField]: data.targetId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[createReport Service Error]:", error);
    return { success: false, error: REPORT_ERRORS.SERVER_ERROR };
  }
}
