/**
 * File Name : features/user/service/admin.ts
 * Description : 관리자 전용 유저 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   유저 목록 조회, 권한 변경, 정지(Ban) 로직 구현
 * 2026.02.08  임도헌   Modified  정지 시 유저 알림(sendAdminActionNotification) 연동
 * 2026.02.08  임도헌   Modified  정지 기간(duration) 적용 및 실시간 강제 추가
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { Role, Prisma } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminUserItem,
  AdminUserListResponse,
} from "@/features/user/types";

/** 유저 목록 조회용 필터 */
export interface UserFilter {
  query?: string; // 닉네임 또는 이메일 검색
  role?: Role | "ALL";
  page?: number;
  limit?: number;
}

/**
 * 관리자용 유저 목록 조회
 * - 검색(query), 역할(role) 필터링 지원
 * - 활동 지표(게시글, 상품, 받은 신고 수)를 포함하여 조회
 */
export async function getUsersAdmin(
  filter: UserFilter
): Promise<ServiceResult<AdminUserListResponse>> {
  try {
    const { query, role, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    // 검색 (닉네임 or 이메일, 대소문자 무시)
    if (query) {
      where.OR = [
        { username: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    // 역할 필터 ("ALL"이 아니면 필터링)
    if (role && role !== "ALL") {
      where.role = role;
    }

    // 병렬 실행: 전체 카운트(total) + 목록 조회(items)
    const [total, items] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          bannedAt: true,
          created_at: true,
          // 활동 지표 카운트 (Activity Metrics)
          _count: {
            select: {
              posts: true,
              products: true,
              reports_received: true, // 받은 신고 수 (중요!)
            },
          },
        },
        orderBy: { created_at: "desc" }, // 최신 가입순
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        items: items as AdminUserItem[],
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("[getUsersAdmin Error]:", error);
    return { success: false, error: "유저 목록을 불러오지 못했습니다." };
  }
}

/**
 * 유저 권한(Role) 변경 (USER <-> ADMIN)
 */
export async function updateUserRole(
  adminId: number,
  targetUserId: number,
  newRole: Role
): Promise<ServiceResult> {
  try {
    if (adminId === targetUserId) {
      return { success: false, error: "자신의 권한은 변경할 수 없습니다." };
    }

    await db.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    void sendAdminActionNotification({
      targetUserId,
      type: "CHANGE_ROLE",
      title: newRole === "ADMIN" ? "관리자" : "일반 선원",
      reason: "관리자 설정에 의한 변경",
    });

    await createAuditLog({
      adminId,
      action: "CHANGE_ROLE",
      targetType: "USER",
      targetId: targetUserId,
      reason: `Changed role to ${newRole}`,
    });

    revalidateTag(T.USER_CORE_ID(targetUserId));

    return { success: true };
  } catch (error) {
    console.error("[updateUserRole Error]:", error);
    return { success: false, error: "권한 변경에 실패했습니다." };
  }
}

/**
 * 유저 이용 정지 (Ban) 토글
 * - 정지 시: bannedAt = now()
 * - 해제 시: bannedAt = null
 * - Audit Log 기록 및 알림 발송
 * - 기간(durationDays)이 주어지면 정지(Ban), 없으면 해제(Unban)로 처리하거나
 * - 현재 상태를 보고 토글하되, 정지 시에는 기간을 적용
 *
 * @param adminId - 관리자 ID
 * @param targetUserId - 대상 유저 ID
 * @param reason - 정지/해제 사유 (필수)
 * @param durationDays - 정지 일수 (0: 영구 정지, -1: 해제/단순 토글 시 사용)
 */
export async function toggleUserBan(
  adminId: number,
  targetUserId: number,
  reason: string,
  durationDays: number = 0
): Promise<ServiceResult<{ banned: boolean }>> {
  try {
    // 1. 대상 유저 조회
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { bannedAt: true, role: true },
    });

    if (!user) return { success: false, error: "유저를 찾을 수 없습니다." };
    if (user.role === "ADMIN")
      return { success: false, error: "관리자는 정지할 수 없습니다." };

    // 2-1. 정지 해제 로직 (이미 정지 상태이고, 명시적으로 해제를 요청했거나 토글인 경우)
    const isCurrentlyBanned = !!user.bannedAt;
    if (isCurrentlyBanned) {
      // 정지 해제
      await db.user.update({
        where: { id: targetUserId },
        data: { bannedAt: null, bannedUntil: null },
      });

      void sendAdminActionNotification({
        targetUserId,
        type: "UNBAN_USER",
        reason: "정지 기간 만료 또는 관리자 해제",
      });

      await createAuditLog({
        adminId,
        action: "UNBAN_USER",
        targetType: "USER",
        targetId: targetUserId,
        reason,
      });

      revalidateTag(T.USER_CORE_ID(targetUserId));
      return { success: true, data: { banned: false } };
    }

    // 2-2. 정지 적용
    // durationDays: 0 = 영구(9999년), N = N일 후
    const bannedUntil =
      durationDays === 0
        ? new Date("9999-12-31T23:59:59.999Z")
        : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await db.user.update({
      where: { id: targetUserId },
      data: {
        bannedAt: new Date(),
        bannedUntil,
      },
    });

    // 3. 감사 로그
    const durationText =
      durationDays === 0 ? "영구 정지" : `${durationDays}일 정지`;
    await createAuditLog({
      adminId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: targetUserId,
      reason: `${reason} (${durationText})`,
    });

    // 4. 알림 발송 (DB 저장 + Push)
    void sendAdminActionNotification({
      targetUserId,
      type: "BAN_USER",
      reason: `${reason} (기간: ${durationText})`,
    });

    // 5. 실시간 강제 퇴장 신호 전송
    await supabase.channel(`user-${targetUserId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: "BAN",
        reason,
        until: bannedUntil.toISOString(),
      },
    });

    revalidateTag(T.USER_CORE_ID(targetUserId));

    return { success: true, data: { banned: true } };
  } catch (error) {
    console.error("[toggleUserBan Error]:", error);
    return { success: false, error: "유저 상태 변경에 실패했습니다." };
  }
}

/**
 * 유저 상태 검증 가드 (Gatekeeper)
 *
 * - 게시글 작성, 댓글, 채팅 등 주요 상호작용 전에 호출되어 유저의 이용 정지 여부를 확인
 * - **Lazy Unban**: 정지 기간(`bannedUntil`)이 만료되었을 경우, 자동으로 정지를 해제하고 `success: true`를 반환
 * - 정지 상태가 유효하다면 `success: false`와 에러 메시지를 반환
 *
 * @param {number} userId - 검증할 유저 ID
 * @returns {Promise<ServiceResult>} 통과 여부
 */
export async function validateUserStatus(
  userId: number
): Promise<ServiceResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true, bannedUntil: true },
  });

  if (user?.bannedAt) {
    // 정지 기간이 설정되어 있고, 현재 시간이 만료일을 지났다면 -> 해제
    if (user.bannedUntil && new Date() > user.bannedUntil) {
      await db.user.update({
        where: { id: userId },
        data: { bannedAt: null, bannedUntil: null },
      });
      // 정지가 해제되었으므로 통과
      return { success: true };
    }

    // 정지 유효
    return {
      success: false,
      error: "운영 정책에 의해 이용이 정지된 계정입니다.",
      code: "BANNED",
    };
  }

  return { success: true };
}
