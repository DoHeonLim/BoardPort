/**
 * File Name : features/report/service/admin.ts
 * Description : 관리자 전용 신고 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   신고 목록 조회 및 처리 로직 구현
 * 2026.02.06  임도헌   Modified  adminComment 저장 로직 추가
 * 2026.02.07  임도헌   Refactor  AuditLog 연동 및 필터링 로직 강화
 * 2026.03.07  임도헌   Modified  신고 상태 전이 및 관리자 코멘트 서버 검증 추가
 * 2026.03.09  임도헌   Modified  신고 승인 시 경고/콘텐츠 삭제/정지 후속 조치 실행
 * 2026.03.09  임도헌   Modified  strike 누적을 AuditLog 기반으로 기록 및 합산
 * 2026.03.30  임도헌   Modified  관리자 신고 목록과 처리 모달이 직접 대상·부모 문맥·최근 strike를 함께 읽을 수 있도록 메타를 보강
 * 2026.04.03  임도헌   Modified  관리자 신고 목록 필터 타입을 report/types 공용 정의로 이동
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import { deleteProductByAdmin } from "@/features/product/service/admin";
import { deletePostByAdmin } from "@/features/post/service/admin";
import { deleteStreamByAdmin } from "@/features/stream/service/admin";
import { banUserByAdmin } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminReportInsights,
  AdminReportListResponse,
  AdminReportItem,
  ReportFilter,
  ReportResolutionInput,
} from "@/features/report/types";
import { Prisma } from "@/generated/prisma/client";
import {
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_ACTIONS,
  REPORT_STRIKE_POLICY,
} from "@/features/report/constants";

/**
 * 신고 관리 인사이트 조회
 *
 * [기능]
 * - 최근 14일 신고 추이, 사유 분포, 운영 병목 요약을 함께 계산
 * - 신고 관리 상단 인사이트 헤더가 전체 기준으로 같은 수치를 읽도록 집계
 */
export async function getReportInsights(
  now: Date = new Date()
): Promise<ServiceResult<AdminReportInsights>> {
  try {
    const { buildRecentGroupedDayBuckets, countItemsByKey } = await import(
      "@/features/report/utils/analytics"
    );

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const statusKeys = ["PENDING", "RESOLVED", "DISMISSED"] as const;
    const reasonKeys = [
      "SPAM",
      "INAPPROPRIATE",
      "ABUSIVE",
      "SCAM",
      "OTHER",
    ] as const;

    // 인사이트 헤더와 차트가 공통으로 쓰는 원본 데이터 집계
    const [recentReports, pendingCount, strikeLogs] = await Promise.all([
      db.report.findMany({
        where: { created_at: { gte: fourteenDaysAgo } },
        select: {
          created_at: true,
          status: true,
          reason: true,
          updated_at: true,
        },
      }),
      db.report.count({ where: { status: "PENDING" } }),
      db.auditLog.findMany({
        where: {
          action: "ADD_STRIKE",
          targetType: "USER",
          created_at: { gte: sevenDaysAgo },
        },
        select: { targetId: true },
      }),
    ]);

    // 상태별 신고 흐름을 같은 14일 버킷 기준으로 정규화
    const groupedStatusBuckets = buildRecentGroupedDayBuckets(
      recentReports.flatMap((item) =>
        statusKeys.includes(item.status as (typeof statusKeys)[number])
          ? [
              {
                created_at: item.created_at,
                key: item.status as (typeof statusKeys)[number],
              },
            ]
          : []
      ),
      14,
      statusKeys,
      now
    );

    // 사유 분포는 차트와 "최다 사유" 빠른 이동 링크가 함께 재사용
    const reasonCounts = countItemsByKey(
      recentReports.map((item) => item.reason),
      reasonKeys
    );

    const reasonItems = reasonKeys
      .map((reason) => ({
        label: REPORT_REASON_LABELS[reason],
        value: reasonCounts[reason],
        color:
          reason === "SCAM"
            ? "#b91c1c"
            : reason === "INAPPROPRIATE"
              ? "#7c3aed"
              : reason === "ABUSIVE"
                ? "#f97316"
                : reason === "SPAM"
                  ? "#2563eb"
                  : "#64748b",
      }))
      .sort((left, right) => right.value - left.value);

    // 처리 대기와 이미 조치된 신고를 분리해 운영 병목 요약 계산
    const processedReports = recentReports.filter(
      (report) => report.status !== "PENDING"
    );

    return {
      success: true,
      data: {
        labels: groupedStatusBuckets.labels,
        statusSeries: [
          {
            name: "대기",
            color: "#ef4444",
            values: groupedStatusBuckets.grouped.PENDING,
          },
          {
            name: "처리 완료",
            color: "#0f766e",
            values: groupedStatusBuckets.grouped.RESOLVED,
          },
          {
            name: "기각",
            color: "#64748b",
            values: groupedStatusBuckets.grouped.DISMISSED,
          },
        ],
        reasonItems,
        summary: {
          pendingCount,
          strikeTargetCount: new Set(strikeLogs.map((log) => log.targetId)).size,
          averageProcessingHours:
            processedReports.length > 0
              ? processedReports.reduce((acc, report) => {
                  const diffMs =
                    report.updated_at.getTime() - report.created_at.getTime();
                  return acc + diffMs / (1000 * 60 * 60);
                }, 0) / processedReports.length
              : 0,
          recentTotal: recentReports.length,
        },
      },
    };
  } catch (error) {
    console.error("[getReportInsights Error]:", error);
    return {
      success: false,
      error: "신고 인사이트를 불러오지 못했습니다.",
    };
  }
}

/**
 * 관리자용 신고 목록 조회
 * - 상태·검색어 기준으로 신고 목록을 최신순 조회
 * - 신고자 식별자, 직접 대상 요약, 상위 콘텐츠 문맥, 최근 strike 요약까지 함께 반환
 *
 * @param filter - 필터 조건 객체
 * @returns {Promise<ServiceResult<AdminReportListResponse>>} 신고 목록 결과
 */
export async function getReportsAdmin(
  filter: ReportFilter
): Promise<ServiceResult<AdminReportListResponse>> {
  try {
    const { status, query, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;
    const trimmedQuery = query?.trim();
    const normalizedQuery = trimmedQuery?.toLowerCase();

    const where: Prisma.ReportWhereInput = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    // 신고자, 사유, 설명, 관리자 코멘트, 대상 ID를 하나의 검색 입력으로 결합
    if (trimmedQuery) {
      const parsedTargetId = /^\d+$/.test(trimmedQuery)
        ? Number(trimmedQuery)
        : null;
      const reasonMatches = Object.entries(REPORT_REASON_LABELS)
        .filter(
          ([key, label]) =>
            key.toLowerCase().includes(normalizedQuery ?? "") ||
            label.toLowerCase().includes(normalizedQuery ?? "")
        )
        .map(([key]) => key);

      where.AND = [
        {
          OR: [
            {
              reporter: {
                is: {
                  username: {
                    contains: trimmedQuery,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              description: {
                contains: trimmedQuery,
                mode: "insensitive",
              },
            },
            {
              adminComment: {
                contains: trimmedQuery,
                mode: "insensitive",
              },
            },
            ...(parsedTargetId !== null
              ? [
                  { id: parsedTargetId },
                  { targetUserId: parsedTargetId },
                  { targetProductId: parsedTargetId },
                  { targetPostId: parsedTargetId },
                  { targetCommentId: parsedTargetId },
                  { targetStreamId: parsedTargetId },
                  { targetProductMessageId: parsedTargetId },
                  { targetStreamMessageId: parsedTargetId },
                  { targetReviewId: parsedTargetId },
                ]
              : []),
            ...reasonMatches.map((reason) => ({ reason: reason as any })),
          ],
        },
      ];
    }

    // 페이지네이션 기준 count와 목록 결과를 함께 조회
    const [total, items] = await Promise.all([
      db.report.count({ where }),
      db.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, username: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // 최근 strike, 직접 대상, 부모 문맥을 카드/모달에서 바로 읽을 수 있게 후처리
    const reportItems = await attachStrikeSummary(items as AdminReportItem[]);

    return {
      success: true,
      data: {
        items: reportItems,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("[getReportsAdmin Error]:", error);
    return {
      success: false,
      error: "신고 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 신고 상태 변경 (처리/기각)
 * - 신고의 상태를 업데이트하고 관리자 코멘트를 저장
 * - 변경 이력을 Audit Log에 기록
 *
 * @param adminId - 처리 담당 관리자 ID
 * @param reportId - 대상 신고 ID
 * @param status - 변경할 상태
 * @param adminComment - 관리자 코멘트
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function updateReportStatus(
  adminId: number,
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
  resolution?: ReportResolutionInput
): Promise<ServiceResult> {
  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        reason: true,
        targetUserId: true,
        targetProductId: true,
        targetPostId: true,
        targetCommentId: true,
        targetStreamId: true,
        targetProductMessageId: true,
        targetStreamMessageId: true,
        targetReviewId: true,
      },
    });

    if (!report)
      return { success: false, error: "신고 내역을 찾을 수 없습니다." };

    const trimmedComment = resolution?.adminComment?.trim() ?? "";
    if (trimmedComment.length < 5) {
      return {
        success: false,
        error: "처리 사유는 5자 이상 입력해주세요.",
      };
    }

    if (report.status !== "PENDING") {
      return {
        success: false,
        error: "이미 처리된 신고입니다.",
      };
    }

    if (status === "RESOLVED" && !resolution) {
      return {
        success: false,
        error: "승인 시 조치 유형을 선택해주세요.",
      };
    }

    const targetUserId = await resolveReportTargetUserId(report);

    let finalAdminComment = trimmedComment;

    if (status === "RESOLVED" && resolution) {
      // strike 가산 이력은 별도 감사 로그로 남겨 최근 누적 계산 기준으로 재사용
      if (targetUserId && resolution.strike > 0) {
        await createAuditLog({
          adminId,
          action: "ADD_STRIKE",
          targetType: "USER",
          targetId: targetUserId,
          reason: buildStrikeAuditReason(
            trimmedComment,
            resolution.action,
            resolution.strike,
            resolution.durationDays
          ),
        });
      }

      // 조치 요약 문자열은 모달 확인, 사용자 알림, 감사 로그 문맥을 함께 맞추기 위한 기준
      const currentStrikeTotal = targetUserId
        ? await getRecentUserStrikeTotal(targetUserId)
        : 0;
      const strikeText =
        resolution.strike > 0
          ? `strike ${resolution.strike}회 / 누적 ${currentStrikeTotal}회`
          : targetUserId
            ? `strike 없음 / 누적 ${currentStrikeTotal}회`
            : "strike 없음";
      const durationText =
        resolution.action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN
          ? ` / 기간: ${resolution.durationDays ?? 0}일`
          : resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
            ? " / 기간: 영구"
            : "";

      // 삭제 조치는 콘텐츠 타입에 따라 각 도메인 관리자 서비스로 위임
      if (
        resolution.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT ||
        resolution.deleteContent
      ) {
        const deleteResult = await deleteReportTargetContent(
          adminId,
          report,
          trimmedComment
        );
        if (!deleteResult.success) return deleteResult;
      }

      // 경고는 콘텐츠 삭제 없이 사용자 알림과 운영 이력만 남기는 경로
      if (resolution.action === REPORT_RESOLUTION_ACTIONS.WARN && targetUserId) {
        await createAuditLog({
          adminId,
          action: "WARN_USER",
          targetType: "USER",
          targetId: targetUserId,
          reason: buildModerationActionReason(
            trimmedComment,
            resolution.action,
            resolution.strike,
            currentStrikeTotal
          ),
        });

        void sendAdminActionNotification({
          targetUserId,
          type: "WARN_USER",
          reason: `${trimmedComment} (${strikeText})`,
        });
      }

      // 정지는 유저 서비스 경로를 재사용해 알림과 실시간 강제 퇴장을 함께 처리
      if (
        (resolution.action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN ||
          resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN) &&
        targetUserId
      ) {
        const durationDays =
          resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
            ? 0
            : (resolution.durationDays ?? 3);

        const banResult = await banUserByAdmin(
          adminId,
          targetUserId,
          `${trimmedComment} (${strikeText})`,
          durationDays
        );
        if (!banResult.success) return banResult;
      }

      finalAdminComment = `${trimmedComment}\n[조치] ${resolution.action} / ${strikeText}${durationText}`;
    }

    // 신고 상태와 관리자 기록 선저장을 통한 이후 감사 로그/알림 기준 정렬
    await db.report.update({
      where: { id: reportId },
      data: {
        status,
        adminComment: finalAdminComment,
        updated_at: new Date(),
      },
    });

    // 실제 처리 결과의 별도 감사 로그 기록 및 운영 추적/strike 집계 가능 상태 유지
    const actionType =
      status === "RESOLVED" ? "RESOLVE_REPORT" : "DISMISS_REPORT";
    await createAuditLog({
      adminId,
      action: actionType,
      targetType: "REPORT",
      targetId: reportId,
      reason: finalAdminComment,
    });

    return { success: true };
  } catch (error) {
    console.error("[updateReportStatus Error]:", error);
    return {
      success: false,
      error: "신고 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * strike 감사 로그 사유 문자열 조립
 * 후속 strike 집계 파싱에 필요한 moderation 메타를 함께 포함
 */
function buildStrikeAuditReason(
  reason: string,
  action: string,
  strike: number,
  durationDays?: number
) {
  return `${reason}\n[moderation-meta] action=${action};strike=${strike};duration=${durationDays ?? 0}`;
}

/**
 * 경고/정지 보조 사유 문자열 조립
 * 운영 로그와 알림 문구에서 현재 조치 문맥을 함께 읽기 위한 포맷
 */
function buildModerationActionReason(
  reason: string,
  action: string,
  strike: number,
  total: number
) {
  return `${reason} (action: ${action}, strike: ${strike}, total: ${total})`;
}

/**
 * 최근 strike 누적 단건 조회
 * 신고 처리 모달의 "누적 strike" 요약 계산에 사용
 */
async function getRecentUserStrikeTotal(userId: number) {
  const strikeMap = await getRecentUserStrikeMap([userId]);
  return strikeMap.get(userId) ?? 0;
}

/**
 * 신고 목록 후처리
 * 직접 대상, 부모 문맥, 최근 strike 누적을 목록/모달 공용 필드로 확장
 */
async function attachStrikeSummary(reports: AdminReportItem[]) {
  if (reports.length === 0) return reports;

  const [
    userMetaMap,
    productMetaMap,
    postMetaMap,
    commentMetaMap,
    streamMetaMap,
    productMessageMetaMap,
    streamMessageMetaMap,
    reviewMetaMap,
  ] = await Promise.all([
    getUserMetaMap(reports),
    getProductOwnerMap(reports),
    getPostOwnerMap(reports),
    getCommentOwnerMap(reports),
    getStreamOwnerMap(reports),
    getProductMessageOwnerMap(reports),
    getStreamMessageOwnerMap(reports),
    getReviewOwnerMap(reports),
  ]);

  // 다양한 대상 타입을 최종 사용자 기준으로 환산해 최근 strike 누적을 붙임
  const strikeMap = await getRecentUserStrikeMap(
    reports
      .map((report) =>
        getResolvedTargetUserIdFromMaps(report, {
          userMetaMap,
          productMetaMap,
          postMetaMap,
          commentMetaMap,
          streamMetaMap,
          productMessageMetaMap,
          streamMessageMetaMap,
          reviewMetaMap,
        })
      )
      .filter((userId): userId is number => !!userId)
  );

  return reports.map((report) => {
    const targetResolvedUserId = getResolvedTargetUserIdFromMaps(report, {
      userMetaMap,
      productMetaMap,
      postMetaMap,
      commentMetaMap,
      streamMetaMap,
      productMessageMetaMap,
      streamMessageMetaMap,
      reviewMetaMap,
    });
    const targetPreview = getTargetPreviewFromMaps(report, {
      userMetaMap,
      productMetaMap,
      postMetaMap,
      commentMetaMap,
      streamMetaMap,
      productMessageMetaMap,
      streamMessageMetaMap,
      reviewMetaMap,
    });

    return {
      ...report,
      targetResolvedUserId,
      recentStrikeTotal: targetResolvedUserId
        ? (strikeMap.get(targetResolvedUserId) ?? 0)
        : 0,
      targetPreview,
      targetParentPostId: report.targetCommentId
        ? (commentMetaMap.get(report.targetCommentId)?.postId ?? null)
        : null,
      targetParentProductId: report.targetReviewId
        ? (reviewMetaMap.get(report.targetReviewId)?.productId ?? null)
        : report.targetProductMessageId
          ? (productMessageMetaMap.get(report.targetProductMessageId)?.productId ?? null)
          : null,
      targetParentStreamId: report.targetStreamMessageId
        ? (streamMessageMetaMap.get(report.targetStreamMessageId)?.broadcastId ?? null)
        : null,
      targetParentPreview: getTargetParentPreviewFromMaps(report, {
        productMetaMap,
        postMetaMap,
        commentMetaMap,
        streamMetaMap,
        productMessageMetaMap,
        streamMessageMetaMap,
        reviewMetaMap,
      }),
    };
  });
}

/**
 * 신고 대상에서 최종 사용자 식별자 추론
 * 댓글/리뷰/메시지처럼 간접 대상도 소유자 기준으로 환산
 */
function getResolvedTargetUserIdFromMaps(
  report: {
    targetUserId: number | null;
    targetProductId: number | null;
    targetPostId: number | null;
    targetCommentId: number | null;
    targetStreamId: number | null;
    targetProductMessageId: number | null;
    targetStreamMessageId: number | null;
    targetReviewId: number | null;
  },
  maps: {
    userMetaMap: Map<number, { username: string }>;
    productMetaMap: Map<number, { userId: number; title: string }>;
    postMetaMap: Map<number, { userId: number; title: string }>;
    commentMetaMap: Map<number, { userId: number; payload: string; postId: number }>;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<number, { userId: number; payload: string | null; productId: number | null }>;
    streamMessageMetaMap: Map<number, { userId: number; payload: string; broadcastId: number }>;
    reviewMetaMap: Map<number, { userId: number; payload: string; productId: number }>;
  }
) {
  if (report.targetUserId) return report.targetUserId;
  if (report.targetProductId)
    return maps.productMetaMap.get(report.targetProductId)?.userId ?? null;
  if (report.targetPostId) return maps.postMetaMap.get(report.targetPostId)?.userId ?? null;
  if (report.targetCommentId)
    return maps.commentMetaMap.get(report.targetCommentId)?.userId ?? null;
  if (report.targetStreamId)
    return maps.streamMetaMap.get(report.targetStreamId)?.userId ?? null;
  if (report.targetProductMessageId)
    return maps.productMessageMetaMap.get(report.targetProductMessageId)?.userId ?? null;
  if (report.targetStreamMessageId)
    return maps.streamMessageMetaMap.get(report.targetStreamMessageId)?.userId ?? null;
  if (report.targetReviewId)
    return maps.reviewMetaMap.get(report.targetReviewId)?.userId ?? null;
  return null;
}

function getTargetPreviewFromMaps(
  report: {
    targetUserId: number | null;
    targetProductId: number | null;
    targetPostId: number | null;
    targetCommentId: number | null;
    targetStreamId: number | null;
    targetProductMessageId: number | null;
    targetStreamMessageId: number | null;
    targetReviewId: number | null;
  },
  maps: {
    userMetaMap: Map<number, { username: string }>;
    productMetaMap: Map<number, { userId: number; title: string }>;
    postMetaMap: Map<number, { userId: number; title: string }>;
    commentMetaMap: Map<number, { userId: number; payload: string; postId: number }>;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<number, { userId: number; payload: string | null; productId: number | null }>;
    streamMessageMetaMap: Map<number, { userId: number; payload: string; broadcastId: number }>;
    reviewMetaMap: Map<number, { userId: number; payload: string; productId: number }>;
  }
) {
  if (report.targetUserId) {
    return maps.userMetaMap.get(report.targetUserId)?.username ?? `유저 #${report.targetUserId}`;
  }
  if (report.targetProductId) {
    return maps.productMetaMap.get(report.targetProductId)?.title ?? `상품 #${report.targetProductId}`;
  }
  if (report.targetPostId) {
    return maps.postMetaMap.get(report.targetPostId)?.title ?? `게시글 #${report.targetPostId}`;
  }
  if (report.targetCommentId) {
    return maps.commentMetaMap.get(report.targetCommentId)?.payload ?? `댓글 #${report.targetCommentId}`;
  }
  if (report.targetStreamId) {
    return maps.streamMetaMap.get(report.targetStreamId)?.title ?? `방송 #${report.targetStreamId}`;
  }
  if (report.targetProductMessageId) {
    return (
      maps.productMessageMetaMap.get(report.targetProductMessageId)?.payload ??
      `거래 메시지 #${report.targetProductMessageId}`
    );
  }
  if (report.targetStreamMessageId) {
    return (
      maps.streamMessageMetaMap.get(report.targetStreamMessageId)?.payload ??
      `방송 메시지 #${report.targetStreamMessageId}`
    );
  }
  if (report.targetReviewId) {
    return maps.reviewMetaMap.get(report.targetReviewId)?.payload ?? `리뷰 #${report.targetReviewId}`;
  }
  return null;
}

function getTargetParentPreviewFromMaps(
  report: {
    targetCommentId: number | null;
    targetProductMessageId: number | null;
    targetStreamMessageId: number | null;
    targetReviewId: number | null;
  },
  maps: {
    productMetaMap: Map<number, { userId: number; title: string }>;
    postMetaMap: Map<number, { userId: number; title: string }>;
    commentMetaMap: Map<number, { userId: number; payload: string; postId: number }>;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<number, { userId: number; payload: string | null; productId: number | null }>;
    streamMessageMetaMap: Map<number, { userId: number; payload: string; broadcastId: number }>;
    reviewMetaMap: Map<number, { userId: number; payload: string; productId: number }>;
  }
) {
  if (report.targetCommentId) {
    const parentPostId = maps.commentMetaMap.get(report.targetCommentId)?.postId;
    return parentPostId
      ? (maps.postMetaMap.get(parentPostId)?.title ?? `게시글 #${parentPostId}`)
      : null;
  }

  if (report.targetReviewId) {
    const parentProductId = maps.reviewMetaMap.get(report.targetReviewId)?.productId;
    return parentProductId
      ? (maps.productMetaMap.get(parentProductId)?.title ?? `상품 #${parentProductId}`)
      : null;
  }

  if (report.targetProductMessageId) {
    const parentProductId =
      maps.productMessageMetaMap.get(report.targetProductMessageId)?.productId;
    return parentProductId
      ? (maps.productMetaMap.get(parentProductId)?.title ?? `상품 #${parentProductId}`)
      : null;
  }

  if (report.targetStreamMessageId) {
    const parentStreamId =
      maps.streamMessageMetaMap.get(report.targetStreamMessageId)?.broadcastId;
    return parentStreamId
      ? (maps.streamMetaMap.get(parentStreamId)?.title ?? `방송 #${parentStreamId}`)
      : null;
  }

  return null;
}

async function getRecentUserStrikeMap(userIds: number[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return new Map<number, number>();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - REPORT_STRIKE_POLICY.WINDOW_DAYS);

  const strikeLogs = await db.auditLog.findMany({
    where: {
      action: "ADD_STRIKE",
      targetType: "USER",
      targetId: { in: uniqueUserIds },
      created_at: { gte: windowStart },
    },
    select: {
      targetId: true,
      reason: true,
    },
  });

  const strikeMap = new Map<number, number>();
  for (const log of strikeLogs) {
    const match = log.reason?.match(/strike=(\d+)/);
    const strike = Number(match?.[1] ?? 0);
    strikeMap.set(log.targetId, (strikeMap.get(log.targetId) ?? 0) + strike);
  }

  return strikeMap;
}

async function getUserMetaMap(reports: { targetUserId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetUserId)
    .filter((id): id is number => !!id);
  if (ids.length === 0) return new Map<number, { username: string }>();

  const rows = await db.user.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, username: true },
  });

  return new Map(rows.map((row) => [row.id, { username: row.username }]));
}

async function getProductOwnerMap(reports: { targetProductId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetProductId)
    .filter((id): id is number => !!id);
  if (ids.length === 0) return new Map<number, { userId: number; title: string }>();

  const rows = await db.product.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, title: true },
  });

  return new Map(rows.map((row) => [row.id, { userId: row.userId, title: row.title }]));
}

async function getPostOwnerMap(reports: { targetPostId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetPostId)
    .filter((id): id is number => !!id);
  if (ids.length === 0) return new Map<number, { userId: number; title: string }>();

  const rows = await db.post.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, title: true },
  });

  return new Map(rows.map((row) => [row.id, { userId: row.userId, title: row.title }]));
}

async function getCommentOwnerMap(reports: { targetCommentId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetCommentId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; payload: string; postId: number }>();

  const rows = await db.comment.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, payload: true, postId: true },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      { userId: row.userId, payload: row.payload, postId: row.postId },
    ])
  );
}

async function getStreamOwnerMap(reports: { targetStreamId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetStreamId)
    .filter((id): id is number => !!id);
  if (ids.length === 0) return new Map<number, { userId: number; title: string }>();

  const rows = await db.broadcast.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, title: true, liveInput: { select: { userId: true } } },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      { userId: row.liveInput.userId, title: row.title },
    ])
  );
}

async function getProductMessageOwnerMap(
  reports: { targetProductMessageId: number | null }[]
) {
  const ids = reports
    .map((report) => report.targetProductMessageId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; payload: string | null; productId: number | null }>();

  const rows = await db.productMessage.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: {
      id: true,
      userId: true,
      payload: true,
      room: { select: { productId: true } },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        userId: row.userId,
        payload: row.payload,
        productId: row.room?.productId ?? null,
      },
    ])
  );
}

async function getStreamMessageOwnerMap(
  reports: { targetStreamMessageId: number | null }[]
) {
  const ids = reports
    .map((report) => report.targetStreamMessageId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; payload: string; broadcastId: number }>();

  const rows = await db.streamMessage.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: {
      id: true,
      userId: true,
      payload: true,
      stream_chat_room: { select: { broadcastId: true } },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        userId: row.userId,
        payload: row.payload,
        broadcastId: row.stream_chat_room.broadcastId,
      },
    ])
  );
}

async function getReviewOwnerMap(reports: { targetReviewId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetReviewId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; payload: string; productId: number }>();

  const rows = await db.review.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, payload: true, productId: true },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      { userId: row.userId, payload: row.payload, productId: row.productId },
    ])
  );
}

async function resolveReportTargetUserId(report: {
  targetUserId: number | null;
  targetProductId: number | null;
  targetPostId: number | null;
  targetCommentId: number | null;
  targetStreamId: number | null;
  targetProductMessageId: number | null;
  targetStreamMessageId: number | null;
  targetReviewId: number | null;
}) {
  if (report.targetUserId) return report.targetUserId;

  if (report.targetProductId) {
    const product = await db.product.findUnique({
      where: { id: report.targetProductId },
      select: { userId: true },
    });
    return product?.userId ?? null;
  }

  if (report.targetPostId) {
    const post = await db.post.findUnique({
      where: { id: report.targetPostId },
      select: { userId: true },
    });
    return post?.userId ?? null;
  }

  if (report.targetCommentId) {
    const comment = await db.comment.findUnique({
      where: { id: report.targetCommentId },
      select: { userId: true },
    });
    return comment?.userId ?? null;
  }

  if (report.targetStreamId) {
    const broadcast = await db.broadcast.findUnique({
      where: { id: report.targetStreamId },
      select: { liveInput: { select: { userId: true } } },
    });
    return broadcast?.liveInput.userId ?? null;
  }

  if (report.targetProductMessageId) {
    const message = await db.productMessage.findUnique({
      where: { id: report.targetProductMessageId },
      select: { userId: true },
    });
    return message?.userId ?? null;
  }

  if (report.targetStreamMessageId) {
    const message = await db.streamMessage.findUnique({
      where: { id: report.targetStreamMessageId },
      select: { userId: true },
    });
    return message?.userId ?? null;
  }

  if (report.targetReviewId) {
    const review = await db.review.findUnique({
      where: { id: report.targetReviewId },
      select: { userId: true },
    });
    return review?.userId ?? null;
  }

  return null;
}

async function deleteReportTargetContent(
  adminId: number,
  report: {
    targetProductId: number | null;
    targetPostId: number | null;
    targetCommentId: number | null;
    targetStreamId: number | null;
    targetProductMessageId: number | null;
    targetStreamMessageId: number | null;
    targetReviewId: number | null;
  },
  reason: string
): Promise<ServiceResult> {
  if (report.targetProductId) {
    const result = await deleteProductByAdmin(adminId, report.targetProductId, reason);
    return result.success ? { success: true } : result;
  }

  if (report.targetPostId) {
    return await deletePostByAdmin(adminId, report.targetPostId, reason);
  }

  if (report.targetStreamId) {
    return await deleteStreamByAdmin(adminId, report.targetStreamId, reason);
  }

  if (report.targetCommentId) {
    const comment = await db.comment.findUnique({
      where: { id: report.targetCommentId },
      select: { id: true, userId: true },
    });
    if (!comment) return { success: false, error: "이미 삭제된 댓글입니다." };

    await db.comment.delete({ where: { id: comment.id } });
    await createAuditLog({
      adminId,
      action: "DELETE_COMMENT",
      targetType: "COMMENT",
      targetId: comment.id,
      reason,
    });
    void sendAdminActionNotification({
      targetUserId: comment.userId,
      type: "DELETE_COMMENT",
      reason,
    });
    return { success: true };
  }

  if (report.targetReviewId) {
    const review = await db.review.findUnique({
      where: { id: report.targetReviewId },
      select: { id: true, userId: true },
    });
    if (!review) return { success: false, error: "이미 삭제된 리뷰입니다." };

    await db.review.delete({ where: { id: review.id } });
    await createAuditLog({
      adminId,
      action: "DELETE_REVIEW",
      targetType: "REVIEW",
      targetId: review.id,
      reason,
    });
    void sendAdminActionNotification({
      targetUserId: review.userId,
      type: "DELETE_REVIEW",
      reason,
    });
    return { success: true };
  }

  if (report.targetProductMessageId) {
    const message = await db.productMessage.findUnique({
      where: { id: report.targetProductMessageId },
      select: { id: true, userId: true },
    });
    if (!message) return { success: false, error: "이미 삭제된 메시지입니다." };

    await db.productMessage.delete({ where: { id: message.id } });
    await createAuditLog({
      adminId,
      action: "DELETE_MESSAGE",
      targetType: "MESSAGE",
      targetId: message.id,
      reason,
    });
    void sendAdminActionNotification({
      targetUserId: message.userId,
      type: "DELETE_MESSAGE",
      reason,
    });
    return { success: true };
  }

  if (report.targetStreamMessageId) {
    const message = await db.streamMessage.findUnique({
      where: { id: report.targetStreamMessageId },
      select: { id: true, userId: true },
    });
    if (!message) return { success: false, error: "이미 삭제된 메시지입니다." };

    await db.streamMessage.delete({ where: { id: message.id } });
    await createAuditLog({
      adminId,
      action: "DELETE_MESSAGE",
      targetType: "MESSAGE",
      targetId: message.id,
      reason,
    });
    void sendAdminActionNotification({
      targetUserId: message.userId,
      type: "DELETE_MESSAGE",
      reason,
    });
    return { success: true };
  }

  return { success: false, error: "이 신고 대상은 삭제 조치를 지원하지 않습니다." };
}
