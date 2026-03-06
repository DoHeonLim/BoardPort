/**
 * File Name : features/report/service/log.ts
 * Description : 운영 감사 로그 기록 및 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   감사 로그 생성 및 목록 조회 기능 구현
 */

import "server-only";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import type { AdminAuditLogListResponse } from "@/features/report/types";

/**
 * 감사 로그 목록 조회
 * - 모든 관리자 활동 로그를 최신순으로 조회
 * - 페이징 처리를 포함
 *
 * @param page - 현재 페이지 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 20)
 * @returns {Promise<ServiceResult<AdminAuditLogListResponse>>} 로그 목록 및 페이징 정보
 */
export async function getAuditLogsAdmin(
  page = 1,
  limit = 20
): Promise<ServiceResult<AdminAuditLogListResponse>> {
  try {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.findMany({
        include: {
          admin: { select: { id: true, username: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch {
    return { success: false, error: "로그를 불러오지 못했습니다." };
  }
}
