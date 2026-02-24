/**
 * File Name : features/stream/service/admin.ts
 * Description : 관리자용 스트리밍 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   방송 목록 조회 및 강제 종료 구현
 * 2026.02.08  임도헌   Modified  종료 시 유저 알림(sendAdminActionNotification) 연동
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { ServiceResult } from "@/lib/types";
import type { AdminStreamListResponse } from "@/features/stream/types";

/**
 * 관리자용 방송 목록 조회
 * - 기본적으로 현재 방송 중(CONNECTED)인 목록을 조회
 * - 검색어(query)가 있으면 제목 또는 스트리머 닉네임으로 필터링
 *
 * @param page - 현재 페이지
 * @param limit - 페이지당 항목 수
 * @param query - 검색어
 */
export async function getStreamsAdmin(
  page = 1,
  limit = 20,
  query?: string
): Promise<ServiceResult<AdminStreamListResponse>> {
  try {
    const skip = (page - 1) * limit;

    // 기본 조건: 현재 방송 중인 것만 조회
    // (필요 시 query 조건에 따라 전체 방송 이력을 조회하도록 확장 가능하지만,
    //  현재 관리자 기능의 핵심은 '실시간 방송 모니터링/종료'이므로 CONNECTED 유지)
    const where: any = { status: "CONNECTED" };

    if (query) {
      where.AND = [
        { status: "CONNECTED" },
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            {
              liveInput: {
                user: { username: { contains: query, mode: "insensitive" } },
              },
            },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      db.broadcast.count({ where }),
      db.broadcast.findMany({
        where,
        select: {
          id: true,
          title: true,
          thumbnail: true,
          status: true,
          started_at: true,
          liveInput: {
            select: { user: { select: { username: true } } },
          },
          _count: { select: { vodAssets: true } },
        },
        orderBy: { started_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      status: item.status,
      started_at: item.started_at,
      user: { username: item.liveInput.user.username },
      _count: item._count,
    }));

    return {
      success: true,
      data: {
        items: formattedItems,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch {
    return { success: false, error: "방송 목록 로드 실패" };
  }
}

/**
 * 방송 강제 종료 (관리자 권한)
 * - 방송을 DB에서 삭제하고 Audit Log를 남김
 *
 * @param adminId - 관리자 ID
 * @param broadcastId - 방송 ID
 * @param reason - 종료 사유
 */
export async function deleteStreamByAdmin(
  adminId: number,
  broadcastId: number,
  reason: string
): Promise<ServiceResult> {
  try {
    // 1. 존재 확인
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: { title: true, liveInput: { select: { userId: true } } },
    });

    if (!broadcast) return { success: false, error: "이미 종료된 방송입니다." };

    // 2. 삭제 실행 (Cascade로 채팅방 등도 정리됨)
    await db.broadcast.delete({ where: { id: broadcastId } });

    // 3. 감사 로그 기록
    await createAuditLog({
      adminId,
      action: "DELETE_PRODUCT", // (임시) DELETE_STREAM 타입이 없다면 가장 유사한 것으로 매핑
      targetType: "STREAM" as any, // DB Enum에 STREAM 추가 필요
      targetId: broadcastId,
      reason: `Force ended stream: ${broadcast.title} / Owner: ${broadcast.liveInput.userId} / Reason: ${reason}`,
    });

    // 4. 유저 알림 발송
    void sendAdminActionNotification({
      targetUserId: broadcast.liveInput.userId,
      type: "DELETE_STREAM",
      title: broadcast.title,
      reason,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: "방송 종료 실패" };
  }
}
