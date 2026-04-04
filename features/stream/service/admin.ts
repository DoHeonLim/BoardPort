/**
 * File Name : features/stream/service/admin.ts
 * Description : 관리자용 스트리밍 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   방송 목록 조회 및 강제 종료 구현
 * 2026.02.08  임도헌   Modified  종료 시 유저 알림(sendAdminActionNotification) 연동
 * 2026.03.09  임도헌   Modified  감사 로그 액션을 DELETE_STREAM으로 정리
 * 2026.03.30  임도헌   Modified  관리자 라이브 검색이 카테고리명까지 포함되도록 확장
 * 2026.03.31  임도헌   Modified  관리자 종료도 일반 삭제와 같은 VOD/썸네일 cleanup 규칙을 재사용
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import { hardDeleteBroadcastWithCleanup } from "@/features/stream/service/delete";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminStreamInsights,
  AdminStreamListResponse,
} from "@/features/stream/types";

/**
 * 관리자용 방송 목록 조회
 *
 * [기능]
 * - 기본적으로 현재 방송 중(CONNECTED)인 목록을 조회
 * - 검색어(query)가 있으면 제목, 방송 ID, 스트리머 닉네임, 카테고리명으로 필터링
 * - 관리자 카드/테이블에서 바로 쓸 수 있는 형태로 응답을 정규화
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

    // 실시간 운영 화면 기준 유지
    // 현재 관리자 방송 목록은 "진행 중인 라이브 모니터링/종료"에 초점을 둔 목록
    const where: any = { status: "CONNECTED" };

    if (query) {
      const parsedBroadcastId = /^\d+$/.test(query.trim())
        ? Number(query.trim())
        : null;
      where.AND = [
        { status: "CONNECTED" },
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            ...(parsedBroadcastId !== null ? [{ id: parsedBroadcastId }] : []),
            {
              liveInput: {
                user: { username: { contains: query, mode: "insensitive" } },
              },
            },
            {
              category: {
                kor_name: { contains: query, mode: "insensitive" },
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
            select: { user: { select: { id: true, username: true } } },
          },
          _count: { select: { vodAssets: true } },
        },
        orderBy: { started_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // liveInput 관계형 응답을 관리자 카드/테이블 공용 DTO로 평탄화
    const formattedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      status: item.status,
      started_at: item.started_at,
      user: {
        id: item.liveInput.user.id,
        username: item.liveInput.user.username,
      },
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
 * 방송 관리 인사이트 조회
 *
 * [기능]
 * - 라이브 현황, 최근 7일 시작 추이, 카테고리 분포, 24시간 시작/종료 요약 계산
 * - 방송 관리 상단 인사이트 헤더가 전체 기준으로 같은 숫자를 읽도록 집계
 */
export async function getStreamsAdminInsights(
  now: Date = new Date()
): Promise<ServiceResult<AdminStreamInsights>> {
  try {
    const { buildRecentDayBuckets } = await import(
      "@/features/report/utils/analytics"
    );

    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(now.getHours() - 23, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      liveCount,
      recentStarts,
      liveCategories,
      endedLast24Hours,
      startedLast24Hours,
      endedRecentStreams,
    ] = await Promise.all([
      db.broadcast.count({ where: { status: "CONNECTED" } }),
      db.broadcast.findMany({
        where: { started_at: { gte: sevenDaysAgo } },
        select: { started_at: true },
      }),
      db.broadcast.findMany({
        where: { status: "CONNECTED" },
        select: {
          category: {
            select: {
              kor_name: true,
            },
          },
        },
      }),
      db.broadcast.count({
        where: {
          ended_at: { gte: twentyFourHoursAgo },
        },
      }),
      db.broadcast.count({
        where: {
          started_at: { gte: twentyFourHoursAgo },
        },
      }),
      db.broadcast.findMany({
        where: {
          ended_at: { gte: sevenDaysAgo },
          started_at: { not: null },
        },
        select: {
          started_at: true,
          ended_at: true,
        },
      }),
    ]);

    // 최근 7일 시작 추이를 같은 일 단위 버킷으로 정규화
    const startBuckets = buildRecentDayBuckets(
      recentStarts.flatMap((item) => (item.started_at ? [item.started_at] : [])),
      7,
      now
    );

    // 현재 라이브 카테고리를 도넛 차트용 슬라이스로 재조합
    const categoryPalette = [
      "#2563eb",
      "#7c3aed",
      "#0f766e",
      "#f97316",
      "#e11d48",
      "#64748b",
    ];
    const categoryMap = new Map<string, number>();
    liveCategories.forEach((item) => {
      const label = item.category?.kor_name ?? "미분류";
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
    });

    return {
      success: true,
      data: {
        labels: startBuckets.labels,
        startsSeries: [
          {
            name: "방송 시작",
            color: "#2563eb",
            values: startBuckets.values,
          },
        ],
        categorySlices: Array.from(categoryMap.entries())
          .map(([label, value], index) => ({
            label,
            value,
            color: categoryPalette[index % categoryPalette.length],
          }))
          .sort((left, right) => right.value - left.value),
        summary: {
          liveCount,
          startedLast24Hours,
          endedLast24Hours,
          averageBroadcastHours:
            endedRecentStreams.length > 0
              ? endedRecentStreams.reduce((acc, stream) => {
                  const startedAt = stream.started_at;
                  const endedAt = stream.ended_at;
                  if (!startedAt || !endedAt) return acc;
                  return (
                    acc + (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
                  );
                }, 0) / endedRecentStreams.length
              : 0,
        },
      },
    };
  } catch (error) {
    console.error("[getStreamsAdminInsights Error]:", error);
    return {
      success: false,
      error: "방송 인사이트를 불러오지 못했습니다.",
    };
  }
}

/**
 * 방송 강제 종료 (관리자 권한)
 *
 * [기능]
 * - 진행 중인 방송을 관리자 권한으로 종료
 * - 삭제 후 감사 로그와 사용자 알림까지 함께 처리
 *
 * @param adminId - 관리자 ID
 * @param broadcastId - 방송 ID
 * @param reason - 종료 사유
 */
export async function deleteStreamByAdmin(
  adminId: number,
  broadcastId: number,
  reason: string
): Promise<ServiceResult<{ broadcastId: number; username: string }>> {
  try {
    // 종료 대상 확인
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        vodAssets: {
          select: { provider_asset_id: true },
        },
        liveInput: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!broadcast) return { success: false, error: "이미 종료된 방송입니다." };

    // 본체 삭제와 연관 데이터 정리
    // 일반 삭제와 동일한 cleanup 규칙을 재사용해 VOD/썸네일 외부 자산까지 함께 정리
    await hardDeleteBroadcastWithCleanup({
      id: broadcast.id,
      thumbnail: broadcast.thumbnail,
      vodAssets: broadcast.vodAssets,
    });

    // 운영 추적용 감사 로그
    await createAuditLog({
      adminId,
      action: "DELETE_STREAM",
      targetType: "STREAM",
      targetId: broadcastId,
      reason: `Force ended stream: ${broadcast.title} / Owner: ${broadcast.liveInput.userId} / Reason: ${reason}`,
    });

    // 방송국 복귀 경로를 포함한 사용자 알림
    void sendAdminActionNotification({
      targetUserId: broadcast.liveInput.userId,
      type: "DELETE_STREAM",
      title: broadcast.title,
      reason,
      link: `/profile/${broadcast.liveInput.user.username}/channel`,
    });

    return {
      success: true,
      data: {
        broadcastId,
        username: broadcast.liveInput.user.username,
      },
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: "방송 종료 실패" };
  }
}
