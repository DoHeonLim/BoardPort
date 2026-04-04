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
 * 2026.03.05  임도헌   Modified  권한 변경/이용 정지 시의 `revalidateTag` 의존성 제거, `revalidatePath` 및 클라이언트 상태 동기화로 대체
 * 2026.03.07  임도헌   Modified  관리자 액션 실패 문구를 구체화(v1.2)
 * 2026.03.10  임도헌   Modified  신고 승인 후 강제 정지 전용 banUserByAdmin 경로 추가
 * 2026.04.03  임도헌   Modified  관리자 유저 목록 필터 타입을 user/types 공용 정의로 이동
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { Role, Prisma } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminUserInsights,
  UserFilter,
  AdminUserItem,
  AdminUserListResponse,
} from "@/features/user/types";

/**
 * 유저 관리 인사이트 조회
 *
 * [기능]
 * - 최근 30일 가입 추이와 회원 상태 분포를 계산
 * - 유저 관리 상단 헤더가 전체 기준 요약을 읽도록 집계
 */
export async function getUsersAdminInsights(
  now: Date = new Date()
): Promise<ServiceResult<AdminUserInsights>> {
  try {
    // 최근 일자 버킷 유틸 지연 로드
    // 관리자 차트 전용 유틸을 필요한 시점에만 가져오는 경로
    const { buildRecentDayBuckets } =
      await import("@/features/report/utils/analytics");

    // 최근 30일 범위 계산
    // 가입 추이 차트와 요약 지표가 같은 날짜 창을 공유하도록 맞추는 기준점
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 지표 계산용 집계 병렬 조회
    const [recentUsers, totalUsers, adminUsers, bannedUsers, regularUsers] =
      await Promise.all([
        db.user.findMany({
          where: { created_at: { gte: thirtyDaysAgo } },
          select: { created_at: true },
        }),
        db.user.count(),
        db.user.count({ where: { role: "ADMIN" } }),
        db.user.count({ where: { bannedAt: { not: null } } }),
        db.user.count({
          where: {
            role: "USER",
            bannedAt: null,
          },
        }),
      ]);

    // 차트 버킷 계산
    // 상단 헤더와 차트가 동일한 날짜 축을 읽도록 최근 가입 데이터를 버킷화
    const signupBuckets = buildRecentDayBuckets(
      recentUsers.map((item) => item.created_at),
      30,
      now
    );

    return {
      success: true,
      data: {
        labels: signupBuckets.labels,
        signupSeries: [
          {
            name: "신규 가입",
            color: "#2563eb",
            values: signupBuckets.values,
          },
        ],
        statusSlices: [
          {
            label: "일반 회원",
            value: regularUsers,
            color: "#2563eb",
          },
          {
            label: "관리자",
            value: adminUsers,
            color: "#7c3aed",
          },
          {
            label: "이용 정지",
            value: bannedUsers,
            color: "#ef4444",
          },
        ],
        summary: {
          totalUsers,
          todaySignups:
            signupBuckets.values[signupBuckets.values.length - 1] ?? 0,
          bannedUsers,
          adminUsers,
        },
      },
    };
  } catch (error) {
    console.error("[getUsersAdminInsights Error]:", error);
    return {
      success: false,
      error: "유저 인사이트를 불러오지 못했습니다.",
    };
  }
}

/**
 * 관리자용 유저 목록 조회
 *
 * [기능]
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

    // 검색 조건 조립
    // 닉네임, 이메일, 숫자 ID exact match를 단일 입력으로 수용
    if (query) {
      const parsedUserId = /^\d+$/.test(query.trim())
        ? Number(query.trim())
        : null;
      where.OR = [
        { username: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        ...(parsedUserId !== null ? [{ id: parsedUserId }] : []),
      ];
    }

    // 역할/상태 필터 조립
    // BANNED는 bannedAt 기준 별도 분기
    if (role === "BANNED") {
      where.bannedAt = { not: null };
    } else if (role && role !== "ALL") {
      where.role = role;
    }

    // 전체 개수와 현재 페이지 목록 병렬 조회
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
          // 활동 지표 카운트
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
 *
 * [기능]
 * - 자기 자신 권한 변경 방지
 * - 권한 변경 후 관리자 액션 알림 및 감사 로그 기록
 */
export async function updateUserRole(
  adminId: number,
  targetUserId: number,
  newRole: Role,
  reason?: string
): Promise<ServiceResult> {
  try {
    // 자기 자신 권한 변경 방지
    if (adminId === targetUserId) {
      return { success: false, error: "자신의 권한은 변경할 수 없습니다." };
    }

    // 권한 변경 반영
    await db.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    // 사용자 알림 기록
    // 대상 사용자가 role 변경 사실을 앱 내에서 확인할 수 있게 남김
    void sendAdminActionNotification({
      targetUserId,
      type: "CHANGE_ROLE",
      title: newRole === "ADMIN" ? "관리자" : "일반 선원",
      reason: reason?.trim() || "관리자 설정에 의한 변경",
      link: "/profile",
    });

    // 감사 로그 기록
    // 운영 추적과 이후 관리자 검색 기준이 되는 기록
    await createAuditLog({
      adminId,
      action: "CHANGE_ROLE",
      targetType: "USER",
      targetId: targetUserId,
      reason: `Changed role to ${newRole}${reason?.trim() ? ` / ${reason.trim()}` : ""}`,
    });

    return { success: true };
  } catch (error) {
    console.error("[updateUserRole Error]:", error);
    return {
      success: false,
      error: "유저 권한 변경에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 유저 이용 정지 (Ban) 토글
 *
 * [기능]
 * - 현재 상태를 기준으로 정지 또는 해제를 전환
 * - 감사 로그, 사용자 알림, 실시간 강제 퇴장 신호를 함께 처리
 * - durationDays는 정지 기간 계산에 사용하며 0이면 영구 정지로 해석
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
    // 대상 유저 확인
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { bannedAt: true, role: true },
    });

    if (!user) return { success: false, error: "유저를 찾을 수 없습니다." };
    if (user.role === "ADMIN")
      return { success: false, error: "관리자는 정지할 수 없습니다." };

    // 현재 정지 상태 확인
    const isCurrentlyBanned = !!user.bannedAt;
    if (isCurrentlyBanned) {
      // 정지 해제 반영
      await db.user.update({
        where: { id: targetUserId },
        data: { bannedAt: null, bannedUntil: null },
      });

      // 해제 알림 기록
      void sendAdminActionNotification({
        targetUserId,
        type: "UNBAN_USER",
        reason: reason.trim() || "정지 기간 만료 또는 관리자 해제",
        link: "/profile",
      });

      // 해제 감사 로그 기록
      await createAuditLog({
        adminId,
        action: "UNBAN_USER",
        targetType: "USER",
        targetId: targetUserId,
        reason,
      });

      return { success: true, data: { banned: false } };
    }

    // 정지 만료 시각 계산
    // durationDays: 0 = 영구(9999년), N = N일 후
    const bannedUntil =
      durationDays === 0
        ? new Date("9999-12-31T23:59:59.999Z")
        : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 정지 상태 반영
    await db.user.update({
      where: { id: targetUserId },
      data: {
        bannedAt: new Date(),
        bannedUntil,
      },
    });

    // 운영 추적용 감사 로그
    const durationText =
      durationDays === 0 ? "영구 정지" : `${durationDays}일 정지`;
    await createAuditLog({
      adminId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: targetUserId,
      reason: `${reason} (${durationText})`,
    });

    // 사용자 알림 저장 및 푸시 시도
    void sendAdminActionNotification({
      targetUserId,
      type: "BAN_USER",
      reason: `${reason} (기간: ${durationText})`,
    });

    // 현재 세션 강제 종료용 실시간 신호
    await supabase.channel(`user-${targetUserId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: "BAN",
        reason,
        until: bannedUntil.toISOString(),
      },
    });

    return { success: true, data: { banned: true } };
  } catch (error) {
    console.error("[toggleUserBan Error]:", error);
    return {
      success: false,
      error: "유저 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 유저 이용 정지 강제 적용
 *
 * [기능]
 * - 신고 승인처럼 "무조건 정지"가 필요한 경로에서 사용
 * - 이미 정지된 유저여도 기간을 새 기준으로 덮어씀
 * - 감사 로그, 관리자 알림, 실시간 강제 퇴장 신호를 함께 처리
 */
export async function banUserByAdmin(
  adminId: number,
  targetUserId: number,
  reason: string,
  durationDays: number = 0
): Promise<ServiceResult<{ banned: boolean }>> {
  try {
    // 대상 유저 확인
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });

    if (!user) return { success: false, error: "유저를 찾을 수 없습니다." };
    if (user.role === "ADMIN")
      return { success: false, error: "관리자는 정지할 수 없습니다." };

    // 정지 만료 시각 계산
    const bannedUntil =
      durationDays === 0
        ? new Date("9999-12-31T23:59:59.999Z")
        : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 정지 상태 반영
    await db.user.update({
      where: { id: targetUserId },
      data: {
        bannedAt: new Date(),
        bannedUntil,
      },
    });

    const durationText =
      durationDays === 0 ? "영구 정지" : `${durationDays}일 정지`;

    // 감사 로그 기록
    await createAuditLog({
      adminId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: targetUserId,
      reason: `${reason} (${durationText})`,
    });

    // 사용자 알림 및 실시간 신호 전송
    // 앱 내 알림과 현재 세션 강제 종료 신호 동시 처리
    void sendAdminActionNotification({
      targetUserId,
      type: "BAN_USER",
      reason: `${reason} (기간: ${durationText})`,
      link: "/profile",
    });

    await supabase.channel(`user-${targetUserId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: "BAN",
        reason,
        until: bannedUntil.toISOString(),
      },
    });

    return { success: true, data: { banned: true } };
  } catch (error) {
    console.error("[banUserByAdmin Error]:", error);
    return {
      success: false,
      error: "유저 정지 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 유저 상태 검증 가드
 *
 * [기능]
 * - 게시글 작성, 댓글, 채팅 등 주요 상호작용 전에 이용 정지 여부를 확인
 * - bannedUntil이 만료된 경우 lazy unban으로 즉시 해제
 * - 정지 상태가 아직 유효하면 차단 메시지를 반환
 *
 * @param {number} userId - 검증할 유저 ID
 * @returns {Promise<ServiceResult>} 통과 여부
 */
export async function validateUserStatus(
  userId: number
): Promise<ServiceResult> {
  // 정지 상태 조회
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true, bannedUntil: true },
  });

  if (user?.bannedAt) {
    // 만료된 정지의 lazy unban 처리
    if (user.bannedUntil && new Date() > user.bannedUntil) {
      await db.user.update({
        where: { id: userId },
        data: { bannedAt: null, bannedUntil: null },
      });
      return { success: true };
    }

    // 유효한 정지 상태 반환
    return {
      success: false,
      error: "운영 정책에 의해 이용이 정지된 계정입니다.",
      code: "BANNED",
    };
  }

  return { success: true };
}
