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
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminReportListResponse,
  AdminReportItem,
} from "@/features/report/types";
import { Prisma } from "@/generated/prisma/client";

export interface ReportFilter {
  status?: string; // "PENDING" | "RESOLVED" | "DISMISSED" | "ALL"
  page?: number;
  limit?: number;
}

/**
 * 관리자용 신고 목록 조회
 * - 필터 조건(상태)에 따라 신고 목록을 최신순으로 조회
 * - 신고자 정보(닉네임 등)를 포함하여 반환
 *
 * @param filter - 필터 조건 객체
 * @returns {Promise<ServiceResult<AdminReportListResponse>>} 신고 목록 결과
 */
export async function getReportsAdmin(
  filter: ReportFilter
): Promise<ServiceResult<AdminReportListResponse>> {
  try {
    const { status, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

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

    return {
      success: true,
      data: {
        items: items as AdminReportItem[],
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
  adminComment?: string
): Promise<ServiceResult> {
  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true },
    });

    if (!report)
      return { success: false, error: "신고 내역을 찾을 수 없습니다." };

    const trimmedComment = adminComment?.trim() ?? "";
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

    // 1. 신고 상태 업데이트
    await db.report.update({
      where: { id: reportId },
      data: {
        status,
        adminComment: trimmedComment,
        updated_at: new Date(),
      },
    });

    // 2. 감사 로그 기록
    const actionType =
      status === "RESOLVED" ? "RESOLVE_REPORT" : "DISMISS_REPORT";
    await createAuditLog({
      adminId,
      action: actionType,
      targetType: "REPORT",
      targetId: reportId,
      reason: trimmedComment,
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
