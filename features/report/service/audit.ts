/**
 * File Name : features/report/service/audit.ts
 * Description : 관리자 감사 로그(Audit Log) 생성 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   중앙화된 감사 로그 서비스 생성
 * 2026.03.10  임도헌   Modified  신고 strike 기록과 관리자 제재 로그 누적 기준을 주석에 반영
 */

import "server-only";
import db from "@/lib/db";
import type { AdminActionType } from "@/features/report/types";

interface CreateAuditLogParams {
  adminId: number;
  action: AdminActionType;
  targetType:
    | "USER"
    | "PRODUCT"
    | "POST"
    | "REPORT"
    | "REVIEW"
    | "STREAM"
    | "COMMENT"
    | "MESSAGE";
  targetId: number;
  reason?: string;
}

/**
 * 감사 로그 기록
 *
 * [기능]
 * - 관리자의 주요 활동과 strike 누적 이벤트를 DB에 기록
 * - 실패 시에도 메인 로직 흐름을 방해하지 않도록 예외를 catch하여 로깅만 수행
 *
 * @param params - 로그 기록 데이터 (adminId, action, target 등)
 */
export async function createAuditLog({
  adminId,
  action,
  targetType,
  targetId,
  reason,
}: CreateAuditLogParams) {
  try {
    await db.auditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error(
      `[AuditLog Error] Action: ${action}, Target: ${targetType}:${targetId}`,
      error
    );
  }
}
