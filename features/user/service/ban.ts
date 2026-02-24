/**
 * File Name : features/user/service/ban.ts
 * Description : 유저 정지 정보 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   정지 사유 및 기간 조회 함수 구현
 */

import "server-only";
import db from "@/lib/db";

export interface BanDetails {
  until: Date | null;
  reason: string;
}

/**
 * 유저의 정지 상세 정보(만료일, 사유)를 조회
 * - User 테이블에서 만료일(bannedUntil)을 가져옴
 * - AuditLog 테이블에서 가장 최근의 'BAN_USER' 로그를 찾아 사유(reason)를 가져옴
 *
 * @param userId - 조회할 유저 ID
 * @returns {Promise<BanDetails | null>} 정지 정보 (정지 상태가 아니거나 유저가 없으면 null)
 */
export async function getUserBanDetails(
  userId: number
): Promise<BanDetails | null> {
  try {
    // 1. 유저의 정지 상태 및 만료일 조회
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { bannedAt: true, bannedUntil: true },
    });

    if (!user || !user.bannedAt) {
      return null; // 정지된 상태가 아님
    }

    // 2. 가장 최근의 정지 로그(AuditLog) 조회하여 사유 가져오기
    const lastBanLog = await db.auditLog.findFirst({
      where: {
        targetType: "USER",
        targetId: userId,
        action: "BAN_USER",
      },
      orderBy: { created_at: "desc" },
      select: { reason: true },
    });

    const reasonText = lastBanLog?.reason || "운영 정책 위반";

    return {
      until: user.bannedUntil,
      reason: reasonText,
    };
  } catch (error) {
    console.error("[getUserBanDetails] Error:", error);
    return null;
  }
}
