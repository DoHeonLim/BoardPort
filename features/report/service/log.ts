/**
 * File Name : features/report/service/log.ts
 * Description : 운영 감사 로그 기록 및 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   감사 로그 생성 및 목록 조회 기능 구현
 * 2026.03.29  임도헌   Modified  관리자명·액션·대상·사유·ID 검색과 액션/대상 타입 필터를 지원하도록 확장
 */

import "server-only";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import type { AdminAuditLogListResponse } from "@/features/report/types";
import type { Prisma } from "@/generated/prisma/client";
import {
  AUDIT_ACTION_LABELS,
  TARGET_TYPE_LABELS,
} from "@/features/report/constants";

/**
 * 감사 로그 목록 조회
 *
 * [기능]
 * - 검색어, 액션, 대상 타입 기준으로 감사 로그를 최신순 조회
 * - 관리자명, 사유, 액션 라벨, 대상 타입, 숫자 ID 검색을 함께 지원
 * - 페이징과 관리자/대상 추적용 메타를 함께 반환
 *
 * @param page - 현재 페이지 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 20)
 * @returns {Promise<ServiceResult<AdminAuditLogListResponse>>} 로그 목록 및 페이징 정보
 */
export async function getAuditLogsAdmin(
  page = 1,
  query?: string,
  limit = 20,
  filters?: {
    action?: string;
    targetType?: string;
  }
): Promise<ServiceResult<AdminAuditLogListResponse>> {
  try {
    const skip = (page - 1) * limit;
    const trimmedQuery = query?.trim();
    const normalizedQuery = trimmedQuery?.toLowerCase();
    const selectedAction = filters?.action?.trim();
    const selectedTargetType = filters?.targetType?.trim();
    const actionMatches = normalizedQuery
      ? Object.entries(AUDIT_ACTION_LABELS)
          .filter(
            ([key, label]) =>
              key.toLowerCase().includes(normalizedQuery) ||
              label.toLowerCase().includes(normalizedQuery)
          )
          .map(([key]) => key)
      : [];
    const targetTypeMatches = normalizedQuery
      ? Object.entries(TARGET_TYPE_LABELS)
          .filter(
            ([key, label]) =>
              key.toLowerCase().includes(normalizedQuery) ||
              label.toLowerCase().includes(normalizedQuery)
          )
          .map(([key]) => key)
      : [];
    const parsedTargetId =
      trimmedQuery && /^\d+$/.test(trimmedQuery) ? Number(trimmedQuery) : null;

    // 관리자명, 사유, 액션 라벨, 대상 타입, 숫자 ID까지 하나의 자유 검색으로 흡수
    const searchClauses: Prisma.AuditLogWhereInput[] = [];

    if (trimmedQuery) {
      searchClauses.push({
        admin: {
          is: {
            username: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          },
        },
      });
      searchClauses.push({
        reason: {
          contains: trimmedQuery,
          mode: "insensitive",
        },
      });

      if (parsedTargetId !== null) {
        searchClauses.push({ targetId: parsedTargetId });
      }

      actionMatches.forEach((action) => {
        searchClauses.push({ action });
      });

      targetTypeMatches.forEach((targetType) => {
        searchClauses.push({ targetType });
      });
    }

    const whereClauses: Prisma.AuditLogWhereInput[] = [];

    // 자유 검색과 빠른 필터 칩을 AND 기준으로 합쳐 운영 탐색 문맥 유지
    if (searchClauses.length) {
      whereClauses.push({ OR: searchClauses });
    }

    if (selectedAction && selectedAction !== "ALL") {
      whereClauses.push({ action: selectedAction });
    }

    if (selectedTargetType && selectedTargetType !== "ALL") {
      whereClauses.push({ targetType: selectedTargetType });
    }

    const where: Prisma.AuditLogWhereInput | undefined = whereClauses.length
      ? { AND: whereClauses }
      : undefined;

    // 전체 개수와 현재 페이지 항목을 함께 조회해 숫자형 페이지네이션 기준 동기화
    const [total, items] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
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
