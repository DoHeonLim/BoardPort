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
 * 2026.04.27  임도헌   Modified  신고 기각 코멘트 payload와 승인 조치 payload를 구분해 서버 검증 흐름 보강
 * 2026.04.28  임도헌   Modified  신고 처리 모달이 실제 조치 대상 유저명을 표시할 수 있도록 대상 유저 메타 조회 추가
 * 2026.05.16  임도헌   Modified  신고 사유 검색 조건과 목록 후처리 타입 단언 축소
 * 2026.08.26  임도헌   Modified  신고 claim·DB 조치·감사 로그를 단일 transaction으로 묶고 outbox 멱등 재시도 적용
 */

import "server-only";
import db from "@/lib/db";
import { hardDeleteProductTx } from "@/features/product/service/delete";
import { hardDeletePostTx } from "@/features/post/service/post";
import { deleteBroadcastTx } from "@/features/stream/service/delete";
import {
  enqueueModerationOutboxJobs,
  processModerationOutboxBatch,
  type ModerationOutboxJob,
} from "@/features/report/service/moderationOutbox";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminReportInsights,
  AdminReportListResponse,
  AdminReportItem,
  ReportFilter,
  ReportResolutionInput,
  ReportResolutionResult,
  ReportStatusInput,
} from "@/features/report/types";
import type { Prisma, ReportReason } from "@/generated/prisma/client";
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
    const { buildRecentGroupedDayBuckets, countItemsByKey } =
      await import("@/features/report/utils/analytics");

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
          strikeTargetCount: new Set(strikeLogs.map((log) => log.targetId))
            .size,
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
      const reasonMatches = (
        Object.entries(REPORT_REASON_LABELS) as Array<[ReportReason, string]>
      )
        .filter(
          ([reason, label]) =>
            reason.toLowerCase().includes(normalizedQuery ?? "") ||
            label.toLowerCase().includes(normalizedQuery ?? "")
        )
        .map(([reason]) => reason);

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
            ...reasonMatches.map((reason) => ({ reason })),
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
    const reportItems = await attachStrikeSummary(items);

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
 * 신고 승인·기각을 원자적이고 멱등하게 처리한다.
 * - PENDING 신고를 PROCESSING으로 조건부 선점해 단일 처리자만 허용
 * - 신고 상태, strike, DB 제재·삭제, 감사 로그, outbox enqueue를 하나의 transaction으로 처리
 * - 동일 `(reportId, status, action)` 재시도는 완료된 감사 로그를 기준으로 성공에 수렴
 * - commit 뒤 outbox를 즉시 처리하고 실패 작업은 운영 cron 재시도 대상으로 유지
 *
 * @param adminId - 처리 담당 관리자 ID
 * @param reportId - 대상 신고 ID
 * @param status - 변경할 상태
 * @param resolution - 승인 조치 payload 또는 기각 코멘트 payload
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function updateReportStatus(
  adminId: number,
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
  resolution?: ReportStatusInput
): Promise<ServiceResult<ReportResolutionResult>> {
  const trimmedComment = resolution?.adminComment?.trim() ?? "";
  if (trimmedComment.length < 5) {
    return { success: false, error: "처리 사유는 5자 이상 입력해주세요." };
  }
  if (
    status === "RESOLVED" &&
    (!resolution || !isReportResolutionInput(resolution))
  ) {
    return { success: false, error: "승인 시 조치 유형을 선택해주세요." };
  }
  if (
    status === "RESOLVED" &&
    isReportResolutionInput(resolution) &&
    (!Number.isInteger(resolution.strike) || resolution.strike < 0)
  ) {
    return { success: false, error: "strike 값이 올바르지 않습니다." };
  }

  const actionKey = buildReportActionIdempotencyKey(
    reportId,
    status,
    resolution
  );

  try {
    const result = await db.$transaction(
      async (tx) => {
        const [completedAction, report] = await Promise.all([
          tx.auditLog.findUnique({
            where: { idempotencyKey: actionKey },
            select: { id: true },
          }),
          tx.report.findUnique({
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
          }),
        ]);
        if (!report)
          throw new ReportModerationError("신고 내역을 찾을 수 없습니다.");
        if (completedAction) {
          const revalidation = buildIdempotentRevalidationMeta(report);
          return {
            reportId,
            status,
            action:
              status === "RESOLVED" && isReportResolutionInput(resolution)
                ? resolution.action
                : undefined,
            idempotent: true,
            ...revalidation,
          } satisfies ReportResolutionResult;
        }
        if (report.status !== "PENDING") {
          throw new ReportModerationError(
            "이미 다른 조치로 처리된 신고입니다."
          );
        }

        // 하나의 transaction 안에서 PENDING 행을 선점해 동시 실행자 중 한 명만 조치한다.
        const claim = await tx.report.updateMany({
          where: { id: reportId, status: "PENDING" },
          data: { status: "PROCESSING" },
        });
        if (claim.count !== 1) {
          throw new ReportModerationError(
            "다른 관리자가 신고를 처리하고 있습니다."
          );
        }

        const targetUserId = await resolveReportTargetUserId(tx, report);
        const outboxJobs: ModerationOutboxJob[] = [];
        const revalidationPaths = new Set<string>(["/admin/reports"]);
        let productDetailId: number | undefined;
        let finalAdminComment = trimmedComment;
        let strikeTotal = 0;

        if (status === "RESOLVED" && isReportResolutionInput(resolution)) {
          if (
            !targetUserId &&
            (resolution.strike > 0 ||
              resolution.action === REPORT_RESOLUTION_ACTIONS.WARN ||
              resolution.action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN ||
              resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN)
          ) {
            throw new ReportModerationError(
              "신고 대상의 조치 유저를 찾을 수 없습니다."
            );
          }
          if (targetUserId && resolution.strike > 0) {
            await tx.auditLog.create({
              data: {
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
              },
            });
          }

          strikeTotal = targetUserId
            ? await getRecentUserStrikeTotalTx(tx, targetUserId)
            : 0;
          const strikeText =
            resolution.strike > 0
              ? `strike ${resolution.strike}회 / 누적 ${strikeTotal}회`
              : targetUserId
                ? `strike 없음 / 누적 ${strikeTotal}회`
                : "strike 없음";
          const durationText =
            resolution.action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN
              ? ` / 기간: ${resolution.durationDays ?? 0}일`
              : resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
                ? " / 기간: 영구"
                : "";

          if (
            resolution.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT ||
            resolution.deleteContent
          ) {
            const deletion = await deleteReportTargetContentTx(
              tx,
              adminId,
              report,
              trimmedComment,
              actionKey
            );
            deletion.outboxJobs.forEach((job) => outboxJobs.push(job));
            deletion.revalidationPaths.forEach((path) =>
              revalidationPaths.add(path)
            );
            productDetailId = deletion.productDetailId;
          }

          if (
            resolution.action === REPORT_RESOLUTION_ACTIONS.WARN &&
            targetUserId
          ) {
            await tx.auditLog.create({
              data: {
                adminId,
                action: "WARN_USER",
                targetType: "USER",
                targetId: targetUserId,
                reason: buildModerationActionReason(
                  trimmedComment,
                  resolution.action,
                  resolution.strike,
                  strikeTotal
                ),
              },
            });
            outboxJobs.push(
              buildAdminNotificationJob(actionKey, "warn", {
                targetUserId,
                type: "WARN_USER",
                reason: `${trimmedComment} (${strikeText})`,
              })
            );
          }

          if (
            (resolution.action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN ||
              resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN) &&
            targetUserId
          ) {
            const durationDays =
              resolution.action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
                ? 0
                : (resolution.durationDays ?? 3);
            const bannedUntil = await banReportTargetUserTx(
              tx,
              adminId,
              targetUserId,
              `${trimmedComment} (${strikeText})`,
              durationDays
            );
            outboxJobs.push(
              buildAdminNotificationJob(actionKey, "ban", {
                targetUserId,
                type: "BAN_USER",
                reason: `${trimmedComment} (${strikeText})`,
                link: "/profile",
              }),
              {
                dedupeKey: `${actionKey}:ban-realtime`,
                kind: "BAN_REALTIME",
                payload: {
                  targetUserId,
                  reason: trimmedComment,
                  until: bannedUntil.toISOString(),
                },
              }
            );
          }

          finalAdminComment = `${trimmedComment}\n[조치] ${resolution.action} / ${strikeText}${durationText}`;
        }

        await tx.report.update({
          where: { id: reportId },
          data: { status, adminComment: finalAdminComment },
        });
        await tx.auditLog.create({
          data: {
            adminId,
            action: status === "RESOLVED" ? "RESOLVE_REPORT" : "DISMISS_REPORT",
            targetType: "REPORT",
            targetId: reportId,
            reason: finalAdminComment,
            idempotencyKey: actionKey,
          },
        });
        await enqueueModerationOutboxJobs(tx, outboxJobs);

        return {
          reportId,
          status,
          action:
            status === "RESOLVED" && isReportResolutionInput(resolution)
              ? resolution.action
              : undefined,
          targetUserId,
          strike: strikeTotal,
          durationDays:
            status === "RESOLVED" && isReportResolutionInput(resolution)
              ? resolution.durationDays
              : undefined,
          revalidationPaths: [...revalidationPaths],
          productDetailId,
        } satisfies ReportResolutionResult;
      },
      { isolationLevel: "Serializable" }
    );

    // commit된 외부 효과를 즉시 한 번 처리하고 실패 건은 cron 재시도 대상으로 남긴다.
    await processModerationOutboxBatch().catch((error) => {
      console.error("[updateReportStatus Outbox Error]:", error);
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[updateReportStatus Error]:", error);
    return {
      success: false,
      error:
        error instanceof ReportModerationError
          ? error.message
          : "신고 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/** 사용자에게 그대로 전달할 수 있는 신고 처리 도메인 오류. */
class ReportModerationError extends Error {}

/** commit 후 응답이 끊긴 조치 재시도에서도 관련 목록·상세 cache를 다시 정리한다. */
function buildIdempotentRevalidationMeta(report: {
  targetProductId: number | null;
  targetPostId: number | null;
  targetCommentId: number | null;
  targetStreamId: number | null;
  targetProductMessageId: number | null;
  targetStreamMessageId: number | null;
  targetReviewId: number | null;
}): Pick<ReportResolutionResult, "revalidationPaths" | "productDetailId"> {
  const paths = new Set<string>(["/admin/reports"]);
  let productDetailId: number | undefined;

  if (report.targetProductId) {
    paths.add("/products");
    paths.add(`/products/view/${report.targetProductId}`);
    paths.add("/profile");
    paths.add("/chat");
    productDetailId = report.targetProductId;
  }
  if (report.targetPostId || report.targetCommentId) {
    paths.add("/posts");
    if (report.targetPostId) paths.add(`/posts/${report.targetPostId}`);
  }
  if (report.targetStreamId || report.targetStreamMessageId) {
    paths.add("/streams");
    if (report.targetStreamId) paths.add(`/streams/${report.targetStreamId}`);
  }
  if (report.targetProductMessageId) paths.add("/chat");
  if (report.targetReviewId) paths.add("/products");

  return { revalidationPaths: [...paths], productDetailId };
}

/** 같은 신고와 조치 조합이 항상 같은 멱등 키를 사용하도록 정규화한다. */
export function buildReportActionIdempotencyKey(
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
  resolution?: ReportStatusInput
): string {
  const action =
    status === "RESOLVED" && isReportResolutionInput(resolution)
      ? resolution.action
      : "DISMISS";
  return `report:${reportId}:${status}:${action}`;
}

/** 승인 조치 payload와 기각 사유 payload를 구분한다. */
function isReportResolutionInput(
  input: ReportStatusInput | undefined
): input is ReportResolutionInput {
  return !!input && "action" in input;
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

/** 신고 처리 transaction이 방금 추가한 strike까지 포함해 최근 누적을 계산한다. */
async function getRecentUserStrikeTotalTx(
  tx: Prisma.TransactionClient,
  userId: number
): Promise<number> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - REPORT_STRIKE_POLICY.WINDOW_DAYS);
  const logs = await tx.auditLog.findMany({
    where: {
      action: "ADD_STRIKE",
      targetType: "USER",
      targetId: userId,
      created_at: { gte: windowStart },
    },
    select: { reason: true },
  });
  return logs.reduce((total, log) => {
    const strike = Number(log.reason?.match(/strike=(\d+)/)?.[1] ?? 0);
    return total + strike;
  }, 0);
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

  // 다양한 대상 타입을 최종 사용자 기준으로 환산해 최근 strike 누적과 유저명을 붙임
  const resolvedTargetUserIds = reports
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
    .filter((userId): userId is number => !!userId);
  const [strikeMap, targetUserNameMap] = await Promise.all([
    getRecentUserStrikeMap(resolvedTargetUserIds),
    getUserNameMap(resolvedTargetUserIds),
  ]);

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
      targetResolvedUsername: targetResolvedUserId
        ? (targetUserNameMap.get(targetResolvedUserId) ?? null)
        : null,
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
          ? (productMessageMetaMap.get(report.targetProductMessageId)
              ?.productId ?? null)
          : null,
      targetParentStreamId: report.targetStreamMessageId
        ? (streamMessageMetaMap.get(report.targetStreamMessageId)
            ?.broadcastId ?? null)
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
    commentMetaMap: Map<
      number,
      { userId: number; payload: string; postId: number }
    >;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<
      number,
      { userId: number; payload: string | null; productId: number | null }
    >;
    streamMessageMetaMap: Map<
      number,
      { userId: number; payload: string; broadcastId: number }
    >;
    reviewMetaMap: Map<
      number,
      { userId: number; payload: string; productId: number }
    >;
  }
) {
  if (report.targetUserId) return report.targetUserId;
  if (report.targetProductId)
    return maps.productMetaMap.get(report.targetProductId)?.userId ?? null;
  if (report.targetPostId)
    return maps.postMetaMap.get(report.targetPostId)?.userId ?? null;
  if (report.targetCommentId)
    return maps.commentMetaMap.get(report.targetCommentId)?.userId ?? null;
  if (report.targetStreamId)
    return maps.streamMetaMap.get(report.targetStreamId)?.userId ?? null;
  if (report.targetProductMessageId)
    return (
      maps.productMessageMetaMap.get(report.targetProductMessageId)?.userId ??
      null
    );
  if (report.targetStreamMessageId)
    return (
      maps.streamMessageMetaMap.get(report.targetStreamMessageId)?.userId ??
      null
    );
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
    commentMetaMap: Map<
      number,
      { userId: number; payload: string; postId: number }
    >;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<
      number,
      { userId: number; payload: string | null; productId: number | null }
    >;
    streamMessageMetaMap: Map<
      number,
      { userId: number; payload: string; broadcastId: number }
    >;
    reviewMetaMap: Map<
      number,
      { userId: number; payload: string; productId: number }
    >;
  }
) {
  if (report.targetUserId) {
    return (
      maps.userMetaMap.get(report.targetUserId)?.username ??
      `유저 #${report.targetUserId}`
    );
  }
  if (report.targetProductId) {
    return (
      maps.productMetaMap.get(report.targetProductId)?.title ??
      `상품 #${report.targetProductId}`
    );
  }
  if (report.targetPostId) {
    return (
      maps.postMetaMap.get(report.targetPostId)?.title ??
      `게시글 #${report.targetPostId}`
    );
  }
  if (report.targetCommentId) {
    return (
      maps.commentMetaMap.get(report.targetCommentId)?.payload ??
      `댓글 #${report.targetCommentId}`
    );
  }
  if (report.targetStreamId) {
    return (
      maps.streamMetaMap.get(report.targetStreamId)?.title ??
      `방송 #${report.targetStreamId}`
    );
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
    return (
      maps.reviewMetaMap.get(report.targetReviewId)?.payload ??
      `리뷰 #${report.targetReviewId}`
    );
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
    commentMetaMap: Map<
      number,
      { userId: number; payload: string; postId: number }
    >;
    streamMetaMap: Map<number, { userId: number; title: string }>;
    productMessageMetaMap: Map<
      number,
      { userId: number; payload: string | null; productId: number | null }
    >;
    streamMessageMetaMap: Map<
      number,
      { userId: number; payload: string; broadcastId: number }
    >;
    reviewMetaMap: Map<
      number,
      { userId: number; payload: string; productId: number }
    >;
  }
) {
  if (report.targetCommentId) {
    const parentPostId = maps.commentMetaMap.get(
      report.targetCommentId
    )?.postId;
    return parentPostId
      ? (maps.postMetaMap.get(parentPostId)?.title ?? `게시글 #${parentPostId}`)
      : null;
  }

  if (report.targetReviewId) {
    const parentProductId = maps.reviewMetaMap.get(
      report.targetReviewId
    )?.productId;
    return parentProductId
      ? (maps.productMetaMap.get(parentProductId)?.title ??
          `상품 #${parentProductId}`)
      : null;
  }

  if (report.targetProductMessageId) {
    const parentProductId = maps.productMessageMetaMap.get(
      report.targetProductMessageId
    )?.productId;
    return parentProductId
      ? (maps.productMetaMap.get(parentProductId)?.title ??
          `상품 #${parentProductId}`)
      : null;
  }

  if (report.targetStreamMessageId) {
    const parentStreamId = maps.streamMessageMetaMap.get(
      report.targetStreamMessageId
    )?.broadcastId;
    return parentStreamId
      ? (maps.streamMetaMap.get(parentStreamId)?.title ??
          `방송 #${parentStreamId}`)
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

/**
 * 조치 대상 유저명 조회
 * 간접 신고도 모달에서 실제 제재 대상 유저를 확인할 수 있도록 표시 메타만 분리 조회
 */
async function getUserNameMap(userIds: number[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return new Map<number, string>();

  const rows = await db.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, username: true },
  });

  return new Map(rows.map((row) => [row.id, row.username]));
}

async function getProductOwnerMap(
  reports: { targetProductId: number | null }[]
) {
  const ids = reports
    .map((report) => report.targetProductId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; title: string }>();

  const rows = await db.product.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, title: true },
  });

  return new Map(
    rows.map((row) => [row.id, { userId: row.userId, title: row.title }])
  );
}

async function getPostOwnerMap(reports: { targetPostId: number | null }[]) {
  const ids = reports
    .map((report) => report.targetPostId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<number, { userId: number; title: string }>();

  const rows = await db.post.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, userId: true, title: true },
  });

  return new Map(
    rows.map((row) => [row.id, { userId: row.userId, title: row.title }])
  );
}

async function getCommentOwnerMap(
  reports: { targetCommentId: number | null }[]
) {
  const ids = reports
    .map((report) => report.targetCommentId)
    .filter((id): id is number => !!id);
  if (ids.length === 0)
    return new Map<
      number,
      { userId: number; payload: string; postId: number }
    >();

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
  if (ids.length === 0)
    return new Map<number, { userId: number; title: string }>();

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
    return new Map<
      number,
      { userId: number; payload: string | null; productId: number | null }
    >();

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
    return new Map<
      number,
      { userId: number; payload: string; broadcastId: number }
    >();

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
    return new Map<
      number,
      { userId: number; payload: string; productId: number }
    >();

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

/** 직접·간접 신고 대상에서 실제 제재 대상 유저 ID를 transaction 안에서 조회한다. */
async function resolveReportTargetUserId(
  tx: Prisma.TransactionClient,
  report: {
    targetUserId: number | null;
    targetProductId: number | null;
    targetPostId: number | null;
    targetCommentId: number | null;
    targetStreamId: number | null;
    targetProductMessageId: number | null;
    targetStreamMessageId: number | null;
    targetReviewId: number | null;
  }
) {
  if (report.targetUserId) return report.targetUserId;

  if (report.targetProductId) {
    const product = await tx.product.findUnique({
      where: { id: report.targetProductId },
      select: { userId: true },
    });
    return product?.userId ?? null;
  }

  if (report.targetPostId) {
    const post = await tx.post.findUnique({
      where: { id: report.targetPostId },
      select: { userId: true },
    });
    return post?.userId ?? null;
  }

  if (report.targetCommentId) {
    const comment = await tx.comment.findUnique({
      where: { id: report.targetCommentId },
      select: { userId: true },
    });
    return comment?.userId ?? null;
  }

  if (report.targetStreamId) {
    const broadcast = await tx.broadcast.findUnique({
      where: { id: report.targetStreamId },
      select: { liveInput: { select: { userId: true } } },
    });
    return broadcast?.liveInput.userId ?? null;
  }

  if (report.targetProductMessageId) {
    const message = await tx.productMessage.findUnique({
      where: { id: report.targetProductMessageId },
      select: { userId: true },
    });
    return message?.userId ?? null;
  }

  if (report.targetStreamMessageId) {
    const message = await tx.streamMessage.findUnique({
      where: { id: report.targetStreamMessageId },
      select: { userId: true },
    });
    return message?.userId ?? null;
  }

  if (report.targetReviewId) {
    const review = await tx.review.findUnique({
      where: { id: report.targetReviewId },
      select: { userId: true },
    });
    return review?.userId ?? null;
  }

  return null;
}

type AdminNotificationJobPayload = Extract<
  ModerationOutboxJob,
  { kind: "ADMIN_NOTIFICATION" }
>["payload"];

/** 관리자 조치 알림에 outbox와 Notification이 공유할 고유 전달 키를 부여한다. */
function buildAdminNotificationJob(
  actionKey: string,
  suffix: string,
  payload: Omit<AdminNotificationJobPayload, "deliveryKey">
): ModerationOutboxJob {
  const dedupeKey = `${actionKey}:notification:${suffix}`;
  return {
    dedupeKey,
    kind: "ADMIN_NOTIFICATION",
    payload: { ...payload, deliveryKey: dedupeKey },
  };
}

/** 신고 승인에 따른 계정 정지 DB 변경과 감사 로그를 같은 transaction에 기록한다. */
async function banReportTargetUserTx(
  tx: Prisma.TransactionClient,
  adminId: number,
  targetUserId: number,
  reason: string,
  durationDays: number
): Promise<Date> {
  const user = await tx.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  if (!user)
    throw new ReportModerationError("조치 대상 유저를 찾을 수 없습니다.");
  if (user.role === "ADMIN") {
    throw new ReportModerationError("관리자는 정지할 수 없습니다.");
  }

  const bannedUntil =
    durationDays === 0
      ? new Date("9999-12-31T23:59:59.999Z")
      : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  await tx.user.update({
    where: { id: targetUserId },
    data: { bannedAt: new Date(), bannedUntil },
  });
  await tx.auditLog.create({
    data: {
      adminId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: targetUserId,
      reason: `${reason} (${durationDays === 0 ? "영구 정지" : `${durationDays}일 정지`})`,
    },
  });
  return bannedUntil;
}

interface ReportContentDeletionResult {
  outboxJobs: ModerationOutboxJob[];
  revalidationPaths: string[];
  productDetailId?: number;
}

/** 신고 대상 콘텐츠의 DB 삭제·감사 로그를 transaction 안에서 처리한다. */
async function deleteReportTargetContentTx(
  tx: Prisma.TransactionClient,
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
  reason: string,
  actionKey: string
): Promise<ReportContentDeletionResult> {
  if (report.targetProductId) {
    const product = await tx.product.findUnique({
      where: { id: report.targetProductId },
      select: {
        id: true,
        title: true,
        userId: true,
        search_tags: { select: { name: true } },
        images: { select: { url: true } },
        chat_rooms: { select: { id: true } },
      },
    });
    if (!product) throw new ReportModerationError("이미 삭제된 상품입니다.");
    const imageAssetIds = await hardDeleteProductTx(tx, product);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_PRODUCT",
        targetType: "PRODUCT",
        targetId: product.id,
        reason: `Title: ${product.title} / OwnerID: ${product.userId} / Reason: ${reason}`,
      },
    });
    const outboxJobs: ModerationOutboxJob[] = [
      buildAdminNotificationJob(actionKey, "delete-product", {
        targetUserId: product.userId,
        type: "DELETE_PRODUCT",
        title: product.title,
        reason,
        link: "/profile/my-sales",
      }),
    ];
    if (imageAssetIds.length) {
      outboxJobs.push({
        dedupeKey: `${actionKey}:delete-product-images`,
        kind: "DELETE_IMAGE_ASSETS",
        payload: { providerAssetIds: imageAssetIds },
      });
    }
    return {
      outboxJobs,
      revalidationPaths: [
        "/products",
        "/profile",
        `/products/view/${product.id}`,
        "/chat",
      ],
      productDetailId: product.id,
    };
  }

  if (report.targetPostId) {
    const post = await tx.post.findUnique({
      where: { id: report.targetPostId },
      select: {
        id: true,
        title: true,
        userId: true,
        user: { select: { username: true } },
        tags: { select: { name: true } },
        video: { select: { providerAssetId: true, uploadUid: true } },
      },
    });
    if (!post) throw new ReportModerationError("이미 삭제된 게시글입니다.");
    const cleanup = await hardDeletePostTx(tx, post);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_POST",
        targetType: "POST",
        targetId: post.id,
        reason: `Title: ${post.title} / OwnerID: ${post.userId} / Reason: ${reason}`,
      },
    });
    const outboxJobs: ModerationOutboxJob[] = [
      buildAdminNotificationJob(actionKey, "delete-post", {
        targetUserId: post.userId,
        type: "DELETE_POST",
        title: post.title,
        reason,
        link: "/profile",
      }),
    ];
    if (cleanup.imageAssetIds.length) {
      outboxJobs.push({
        dedupeKey: `${actionKey}:delete-post-images`,
        kind: "DELETE_IMAGE_ASSETS",
        payload: { providerAssetIds: cleanup.imageAssetIds },
      });
    }
    if (cleanup.assetUid) {
      outboxJobs.push({
        dedupeKey: `${actionKey}:delete-post-video`,
        kind: "DELETE_POST_VIDEO",
        payload: { providerAssetId: cleanup.assetUid },
      });
    }
    return {
      outboxJobs,
      revalidationPaths: [
        "/posts",
        `/posts/${post.id}`,
        `/profile/${post.user.username}`,
      ],
    };
  }

  if (report.targetStreamId) {
    const broadcast = await tx.broadcast.findUnique({
      where: { id: report.targetStreamId },
      select: {
        id: true,
        title: true,
        liveInput: {
          select: { userId: true, user: { select: { username: true } } },
        },
      },
    });
    if (!broadcast) throw new ReportModerationError("이미 종료된 방송입니다.");
    const deleted = await deleteBroadcastTx(tx, broadcast.id);
    if (!deleted.success) throw new ReportModerationError(deleted.error);
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_STREAM",
        targetType: "STREAM",
        targetId: broadcast.id,
        reason: `Force ended stream: ${broadcast.title} / Owner: ${broadcast.liveInput.userId} / Reason: ${reason}`,
      },
    });
    const outboxJobs: ModerationOutboxJob[] = [
      buildAdminNotificationJob(actionKey, "delete-stream", {
        targetUserId: broadcast.liveInput.userId,
        type: "DELETE_STREAM",
        title: broadcast.title,
        reason,
        link: `/profile/${broadcast.liveInput.user.username}/channel`,
      }),
    ];
    if (deleted.cleanup) {
      outboxJobs.push({
        dedupeKey: `${actionKey}:delete-stream-assets`,
        kind: "DELETE_BROADCAST_ASSETS",
        payload: deleted.cleanup,
      });
    }
    return {
      outboxJobs,
      revalidationPaths: [
        "/streams",
        `/streams/${broadcast.id}`,
        `/profile/${broadcast.liveInput.user.username}/channel`,
      ],
    };
  }

  if (report.targetCommentId) {
    const comment = await tx.comment.findUnique({
      where: { id: report.targetCommentId },
      select: { id: true, userId: true, postId: true },
    });
    if (!comment) throw new ReportModerationError("이미 삭제된 댓글입니다.");
    await tx.comment.delete({ where: { id: comment.id } });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_COMMENT",
        targetType: "COMMENT",
        targetId: comment.id,
        reason,
      },
    });
    return {
      outboxJobs: [
        buildAdminNotificationJob(actionKey, "delete-comment", {
          targetUserId: comment.userId,
          type: "DELETE_COMMENT",
          reason,
        }),
      ],
      revalidationPaths: ["/posts", `/posts/${comment.postId}`],
    };
  }

  if (report.targetReviewId) {
    const review = await tx.review.findUnique({
      where: { id: report.targetReviewId },
      select: { id: true, userId: true, productId: true },
    });
    if (!review) throw new ReportModerationError("이미 삭제된 리뷰입니다.");
    await tx.review.delete({ where: { id: review.id } });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_REVIEW",
        targetType: "REVIEW",
        targetId: review.id,
        reason,
      },
    });
    return {
      outboxJobs: [
        buildAdminNotificationJob(actionKey, "delete-review", {
          targetUserId: review.userId,
          type: "DELETE_REVIEW",
          reason,
        }),
      ],
      revalidationPaths: ["/products", `/products/view/${review.productId}`],
      productDetailId: review.productId,
    };
  }

  if (report.targetProductMessageId) {
    const message = await tx.productMessage.findUnique({
      where: { id: report.targetProductMessageId },
      select: { id: true, userId: true, productChatRoomId: true },
    });
    if (!message) throw new ReportModerationError("이미 삭제된 메시지입니다.");
    await tx.productMessage.delete({ where: { id: message.id } });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_MESSAGE",
        targetType: "MESSAGE",
        targetId: message.id,
        reason,
      },
    });
    return {
      outboxJobs: [
        buildAdminNotificationJob(actionKey, "delete-product-message", {
          targetUserId: message.userId,
          type: "DELETE_MESSAGE",
          reason,
        }),
      ],
      revalidationPaths: [
        "/chat",
        ...(message.productChatRoomId
          ? [`/chats/${message.productChatRoomId}`]
          : []),
      ],
    };
  }

  if (report.targetStreamMessageId) {
    const message = await tx.streamMessage.findUnique({
      where: { id: report.targetStreamMessageId },
      select: {
        id: true,
        userId: true,
        stream_chat_room: { select: { broadcastId: true } },
      },
    });
    if (!message) throw new ReportModerationError("이미 삭제된 메시지입니다.");
    await tx.streamMessage.delete({ where: { id: message.id } });
    await tx.auditLog.create({
      data: {
        adminId,
        action: "DELETE_MESSAGE",
        targetType: "MESSAGE",
        targetId: message.id,
        reason,
      },
    });
    return {
      outboxJobs: [
        buildAdminNotificationJob(actionKey, "delete-stream-message", {
          targetUserId: message.userId,
          type: "DELETE_MESSAGE",
          reason,
        }),
      ],
      revalidationPaths: [
        "/streams",
        `/streams/${message.stream_chat_room.broadcastId}`,
      ],
    };
  }

  throw new ReportModerationError(
    "이 신고 대상은 삭제 조치를 지원하지 않습니다."
  );
}
