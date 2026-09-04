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
 * 2026.03.07  임도헌   Modified  타겟 실존 여부 검증 및 정지 유저 신고 가드 추가
 * 2026.04.03  임도헌   Modified  신고 대상 타입 import를 report/types 공용 정의로 정리
 * 2026.09.04  임도헌   Modified  원본 삭제 후에도 식별 가능한 신고 대상·소유자·상위 문맥 스냅샷 저장
 */

import "server-only";
import db from "@/lib/db";
import { REPORT_ERRORS, REPORT_POLICY } from "@/features/report/constants";
import { CreateReportDTO } from "@/features/report/schemas";
import { validateUserStatus } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";
import type { ReportTargetType } from "@/features/report/types";

const REPORT_TARGET_PREVIEW_MAX_LENGTH = 240;

/** 관리자 목록과 감사 이력에 저장할 신고 대상 문구 정규화 */
function normalizeTargetPreview(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized
    ? normalized.slice(0, REPORT_TARGET_PREVIEW_MAX_LENGTH)
    : null;
}

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
    // 신고자 상태 확인
    const reporterStatus = await validateUserStatus(reporterId);
    if (!reporterStatus.success) {
      return { success: false, error: reporterStatus.error! };
    }

    // 대상 필드 매핑
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

    // 타깃 실존 여부 검증 준비
    let targetExists = false;

    // 셀프 신고 차단 준비
    // USER뿐 아니라 제품, 게시글, 댓글, 메시지 등 작성자 본인 대상 신고 차단
    let isSelfReport = false;
    let targetPreview: string | null = null;
    let targetOwnerId: number | null = null;
    let targetOwnerUsername: string | null = null;
    let targetParentId: number | null = null;
    let targetParentPreview: string | null = null;

    switch (data.targetType) {
      case "USER": {
        const user = await db.user.findUnique({
          where: { id: data.targetId },
          select: { id: true, username: true },
        });
        targetExists = !!user;
        isSelfReport = data.targetId === reporterId;
        targetPreview = normalizeTargetPreview(user?.username);
        targetOwnerId = user?.id ?? null;
        targetOwnerUsername = user?.username ?? null;
        break;
      }
      case "PRODUCT": {
        const prod = await db.product.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            title: true,
            user: { select: { username: true } },
          },
        });
        targetExists = !!prod;
        isSelfReport = prod?.userId === reporterId;
        targetPreview = normalizeTargetPreview(prod?.title);
        targetOwnerId = prod?.userId ?? null;
        targetOwnerUsername = prod?.user.username ?? null;
        break;
      }
      case "POST": {
        const post = await db.post.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            title: true,
            user: { select: { username: true } },
          },
        });
        targetExists = !!post;
        isSelfReport = post?.userId === reporterId;
        targetPreview = normalizeTargetPreview(post?.title);
        targetOwnerId = post?.userId ?? null;
        targetOwnerUsername = post?.user.username ?? null;
        break;
      }
      case "COMMENT": {
        const comment = await db.comment.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            payload: true,
            user: { select: { username: true } },
            post: { select: { id: true, title: true } },
          },
        });
        targetExists = !!comment;
        isSelfReport = comment?.userId === reporterId;
        targetPreview = normalizeTargetPreview(comment?.payload);
        targetOwnerId = comment?.userId ?? null;
        targetOwnerUsername = comment?.user.username ?? null;
        targetParentId = comment?.post.id ?? null;
        targetParentPreview = normalizeTargetPreview(comment?.post.title);
        break;
      }
      case "REVIEW": {
        const review = await db.review.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            payload: true,
            user: { select: { username: true } },
            product: { select: { id: true, title: true } },
          },
        });
        targetExists = !!review;
        isSelfReport = review?.userId === reporterId;
        targetPreview = normalizeTargetPreview(review?.payload);
        targetOwnerId = review?.userId ?? null;
        targetOwnerUsername = review?.user.username ?? null;
        targetParentId = review?.product.id ?? null;
        targetParentPreview = normalizeTargetPreview(review?.product.title);
        break;
      }
      case "STREAM": {
        const stream = await db.broadcast.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            title: true,
            liveInput: {
              select: {
                userId: true,
                user: { select: { username: true } },
              },
            },
          },
        });
        targetExists = !!stream;
        isSelfReport = stream?.liveInput?.userId === reporterId;
        targetPreview = normalizeTargetPreview(stream?.title);
        targetOwnerId = stream?.liveInput.userId ?? null;
        targetOwnerUsername = stream?.liveInput.user.username ?? null;
        break;
      }
      case "PRODUCT_MESSAGE": {
        const pMsg = await db.productMessage.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            payload: true,
            image: true,
            user: { select: { username: true } },
            room: {
              select: { product: { select: { id: true, title: true } } },
            },
          },
        });
        targetExists = !!pMsg;
        isSelfReport = pMsg?.userId === reporterId;
        targetPreview = normalizeTargetPreview(
          pMsg?.payload || (pMsg?.image ? "이미지 메시지" : null)
        );
        targetOwnerId = pMsg?.userId ?? null;
        targetOwnerUsername = pMsg?.user.username ?? null;
        targetParentId = pMsg?.room?.product.id ?? null;
        targetParentPreview = normalizeTargetPreview(pMsg?.room?.product.title);
        break;
      }
      case "STREAM_MESSAGE": {
        const sMsg = await db.streamMessage.findUnique({
          where: { id: data.targetId },
          select: {
            id: true,
            userId: true,
            payload: true,
            user: { select: { username: true } },
            stream_chat_room: {
              select: { broadcast: { select: { id: true, title: true } } },
            },
          },
        });
        targetExists = !!sMsg;
        isSelfReport = sMsg?.userId === reporterId;
        targetPreview = normalizeTargetPreview(sMsg?.payload);
        targetOwnerId = sMsg?.userId ?? null;
        targetOwnerUsername = sMsg?.user.username ?? null;
        targetParentId = sMsg?.stream_chat_room.broadcast.id ?? null;
        targetParentPreview = normalizeTargetPreview(
          sMsg?.stream_chat_room.broadcast.title
        );
        break;
      }
    }

    if (!targetExists) {
      return {
        success: false,
        error: "신고 대상이 존재하지 않습니다.",
      };
    }

    if (isSelfReport) {
      return { success: false, error: "자신의 컨텐츠는 신고할 수 없습니다." };
    }

    // 중복 신고 확인
    // 1인 1대상 1회 제한 기준
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

    // Rate limit 확인
    // 도배성 신고 방지 기준
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

    // 신고 레코드 저장
    await db.report.create({
      data: {
        reporterId,
        reason: data.reason,
        description: data.description,
        targetPreview,
        targetOwnerId,
        targetOwnerUsername,
        targetParentId,
        targetParentPreview,
        [targetField]: data.targetId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[createReport Service Error]:", error);
    return { success: false, error: REPORT_ERRORS.SERVER_ERROR };
  }
}
