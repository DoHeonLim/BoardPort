/**
 * File Name : features/report/service/create.ts
 * Description : 신고 생성 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   중복 체크 및 Rate Limit 로직 포함 생성 기능 구현
 * 2026.02.06  임도헌   Modified  리뷰 신고(targetReviewId) 매핑 로직 추가
 * 2026.02.27  임도헌   Modified  본인 리뷰 신고 방지 추가
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

    // [핵심] 2. 셀프 신고(Self-Report) 원천 차단 로직 확장
    // USER뿐만 아니라 제품, 게시글, 댓글 등 내가 작성한 모든 데이터에 대해 신고를 차단
    let isSelfReport = false;

    switch (data.targetType) {
      case "USER":
        isSelfReport = data.targetId === reporterId;
        break;
      case "PRODUCT":
        const prod = await db.product.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = prod?.userId === reporterId;
        break;
      case "POST":
        const post = await db.post.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = post?.userId === reporterId;
        break;
      case "COMMENT":
        const comment = await db.comment.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = comment?.userId === reporterId;
        break;
      case "REVIEW":
        const review = await db.review.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = review?.userId === reporterId;
        break;
      case "STREAM":
        const stream = await db.broadcast.findUnique({
          where: { id: data.targetId },
          select: { liveInput: { select: { userId: true } } },
        });
        isSelfReport = stream?.liveInput?.userId === reporterId;
        break;
      case "PRODUCT_MESSAGE":
        const pMsg = await db.productMessage.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = pMsg?.userId === reporterId;
        break;
      case "STREAM_MESSAGE":
        const sMsg = await db.streamMessage.findUnique({
          where: { id: data.targetId },
          select: { userId: true },
        });
        isSelfReport = sMsg?.userId === reporterId;
        break;
    }

    if (isSelfReport) {
      return { success: false, error: "자신의 컨텐츠는 신고할 수 없습니다." };
    }

    // 3. 중복 신고 체크 (1인 1대상 1회 제한)
    const existing = await db.report.findFirst({
      where: {
        reporterId,
        [targetField]: data.targetId,
        status: "PENDING",
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
