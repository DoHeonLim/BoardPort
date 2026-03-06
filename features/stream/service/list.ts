/**
 * File Name : features/stream/service/list.ts
 * Description : 방송 목록 조회 서비스 (공개 목록, 팔로잉 목록, 유저 방송국 목록 등)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   내 방송 목록 조회 로직 분리 (legacy LiveStream)
 * 2025.09.20  임도헌   Modified  Broadcast/LiveInput 스키마로 마이그레이션
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.25  임도헌   Modified  getChannelVods 추가 (채널 페이지 VOD 그리드용)
 * 2026.01.25  임도헌   Modified  getChannelLive 추가 (단일 라이브 조회 최적화)
 * 2026.01.24  임도헌   Refactor  목적별 함수 분리 (MainList / ProfileRail / ChannelLive / ChannelVods)
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 제거 및 단일 함수명(getStreamsList, getRecentBroadcasts) 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import "server-only";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { serializeStream } from "@/features/stream/utils/serializer";
import { BROADCAST_SUMMARY_SELECT } from "@/features/stream/constants";
import { getBlockedUserIds } from "@/features/user/service/block";
import type { BroadcastSummary, VodForGrid } from "@/features/stream/types";

/* -------------------------------------------------------------------------- */
/*                                1. Main List                                */
/* -------------------------------------------------------------------------- */

/**
 * 메인 스트리밍 목록 필터링 및 페이징 조회 로직
 *
 * [데이터 페칭 및 권한 제어 전략]
 * - 현재 방송 중(`CONNECTED`)인 항목만 조회 대상으로 한정
 * - 조회자(`viewerId`) 기반 차단 및 정지된 유저의 방송 원천 은닉 필터 적용
 * - 스코프(`scope`) 파라미터에 따라 전체 공개 또는 팔로잉 전용(비공개 포함) 목록으로 분기 처리
 * - 커서 기반 페이징 적용 및 직렬화 유틸(`serializeStream`)을 통한 DTO 변환 반환
 *
 * @param {Object} params - 검색 및 페이징 파라미터 (scope, category, keyword, viewerId 등)
 * @returns {Promise<BroadcastSummary[]>} 필터링 및 직렬화가 완료된 방송 목록
 */
export async function getStreamsList(params: {
  scope: "all" | "following";
  category?: string;
  keyword?: string;
  viewerId: number;
  cursor: number | null;
  take: number;
}): Promise<BroadcastSummary[]> {
  const { scope, category, keyword, viewerId, cursor, take } = params;

  // 1. 차단된 유저 ID 목록 조회
  const blockedIds = await getBlockedUserIds(viewerId);

  // 2. 기본 조건: 현재 방송 중(CONNECTED) && 차단 관계가 아닌 유저
  const conditions: Prisma.BroadcastWhereInput[] = [
    { status: "CONNECTED" },
    { liveInput: { user: { bannedAt: null } } }, // 정지된 유저의 방송 숨김
    { liveInput: { userId: { notIn: blockedIds } } }, // 차단 필터
  ];

  // 3. 페이지네이션 (커서)
  if (cursor) conditions.push({ id: { lt: cursor } });

  // 4. 카테고리 필터
  if (category) {
    conditions.push({
      OR: [
        { category: { eng_name: category } },
        { category: { parent: { eng_name: category } } },
      ],
    });
  }

  // 5. 키워드 검색
  if (keyword) {
    conditions.push({
      OR: [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        {
          liveInput: {
            user: { username: { contains: keyword, mode: "insensitive" } },
          },
        },
        {
          tags: { some: { name: { contains: keyword, mode: "insensitive" } } },
        },
      ],
    });
  }

  // 6. 스코프 필터 (팔로잉 목록인 경우)
  if (scope === "following") {
    if (!viewerId) return []; // 비로그인이면 팔로잉 목록 없음
    conditions.push({
      liveInput: {
        user: {
          OR: [
            { id: viewerId },
            { followers: { some: { followerId: viewerId } } },
          ],
        },
      },
      // 팔로잉 목록에서는 비공개(PRIVATE) 방송도 노출 (접근 시 비번 확인)
      visibility: { in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] },
    });
  } else {
    // 전체 목록에서는 PRIVATE 제외, PUBLIC/FOLLOWERS 노출
    conditions.push({
      OR: [{ visibility: "PUBLIC" }, { visibility: "FOLLOWERS" }],
    });
  }

  const rows = await db.broadcast.findMany({
    where: { AND: conditions },
    select: BROADCAST_SUMMARY_SELECT,
    orderBy: { id: "desc" },
    take,
  });

  return rows.map((b) =>
    serializeStream(
      {
        ...b,
        stream_id: b.liveInput.provider_uid,
        userId: b.liveInput.userId,
        user: b.liveInput.user,
        tags: b.tags,
      },
      { isFollowing: false, isMine: b.liveInput.userId === viewerId }
    )
  );
}

/* -------------------------------------------------------------------------- */
/*                                2. Profile Rail                               */
/* -------------------------------------------------------------------------- */

/**
 * 유저 프로필 "최근 방송" 탭 전용 목록 조회 로직
 *
 * [데이터 가공 및 권한 제어 전략]
 * - 특정 유저의 방송 이력을 최신순으로 정렬하여 제한된 개수(take)만큼 조회
 * - 조회자가 소유자 본인일 경우에만 비공개(PRIVATE) 진행 중 방송 포함 로직 적용
 * - 종료된 비공개 방송은 목록에 노출하되 잠금 처리를 위한 식별자(requiresPassword) 부여
 *
 * @param {number} ownerId - 방송 소유자 ID
 * @param {number} take - 조회 개수 (Default: 6)
 * @param {boolean} includePrivate - 본인 프로필 여부에 따른 비공개 방송 포함 여부
 */
export async function getRecentBroadcasts(
  ownerId: number,
  take: number = 6,
  includePrivate: boolean = false
): Promise<BroadcastSummary[]> {
  const where: Prisma.BroadcastWhereInput = { liveInput: { userId: ownerId } };

  // 본인이 아니면 PRIVATE 진행 중 방송 숨김 (종료된 건 표시하되 잠금)
  if (!includePrivate) {
    where.OR = [
      { visibility: "PUBLIC" },
      { visibility: "FOLLOWERS" },
      { visibility: "PRIVATE", status: "ENDED" },
    ];
  }

  const broadcasts = await db.broadcast.findMany({
    where,
    orderBy: { id: "desc" },
    take,
    select: BROADCAST_SUMMARY_SELECT,
  });

  return broadcasts.map((b) => ({
    ...serializeStream(
      {
        ...b,
        stream_id: b.liveInput.provider_uid,
        userId: b.liveInput.userId,
        user: b.liveInput.user,
        tags: b.tags,
      },
      { isFollowing: false, isMine: includePrivate }
    ),
    latestVodId: b.vodAssets[0]?.id ?? null,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                3. Channel Live                               */
/* -------------------------------------------------------------------------- */

/**
 * 유저 채널 "현재 진행 중인 방송(Live)" 단일 조회 로직
 *
 * [데이터 가공 전략]
 * - 특정 소유자가 현재 송출 중(`CONNECTED`)인 방송 중 최신 항목 1개 추출
 * - `serializeStream` 유틸을 활용하여 방송 요약(BroadcastSummary) DTO 포맷으로 변환 반환
 *
 * @param {number} ownerId - 방송 소유자 ID
 */
export async function getChannelLive(
  ownerId: number
): Promise<BroadcastSummary | null> {
  const b = await db.broadcast.findFirst({
    where: {
      liveInput: { userId: ownerId },
      status: "CONNECTED",
    },
    select: BROADCAST_SUMMARY_SELECT,
    orderBy: { created_at: "desc" },
  });

  if (!b) return null;

  return serializeStream(
    {
      ...b,
      stream_id: b.liveInput.provider_uid,
      userId: b.liveInput.userId,
      user: b.liveInput.user,
      tags: b.tags,
    },
    { isFollowing: false, isMine: false } // Controller에서 오버라이드 예정
  );
}

/* -------------------------------------------------------------------------- */
/*                                4. Channel VODs                               */
/* -------------------------------------------------------------------------- */

/**
 * 유저 채널 "다시보기(VOD)" 그리드 목록 조회 로직
 *
 * [데이터 가공 전략]
 * - 종료된(`ENDED`) 방송에 매핑된 VodAsset 레코드를 처리 완료(`ready_at`) 및 생성일(`created_at`) 역순으로 조회
 * - UI 그리드 렌더링에 최적화된 DTO(`VodForGrid`) 매핑 및 반환
 *
 * @param {number} ownerId - 방송 소유자 ID
 * @param {number} take - 조회 개수
 */
export async function getChannelVods(
  ownerId: number,
  take: number
): Promise<VodForGrid[]> {
  const vods = await db.vodAsset.findMany({
    where: {
      broadcast: {
        liveInput: { userId: ownerId },
        status: "ENDED",
      },
    },
    select: {
      id: true,
      duration_sec: true,
      ready_at: true,
      views: true,
      thumbnail_url: true,
      created_at: true,
      broadcast: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          visibility: true,
          category: { select: { id: true, kor_name: true, icon: true } },
          tags: { select: { id: true, name: true } },
          liveInput: {
            select: {
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
        },
      },
    },
    orderBy: [{ ready_at: "desc" }, { created_at: "desc" }],
    take,
  });

  return vods.map((v) => {
    const b = v.broadcast;
    return {
      vodId: v.id,
      broadcastId: b.id,
      title: b.title,
      thumbnail: v.thumbnail_url ?? b.thumbnail,
      visibility: b.visibility,
      user: b.liveInput.user,
      href: `/streams/${v.id}/recording`,
      readyAt: v.ready_at,
      duration: v.duration_sec ?? 0,
      viewCount: v.views,
      category: b.category,
      tags: b.tags,
      requiresPassword: false,
      followersOnlyLocked: false,
    };
  });
}
