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
 */

import "server-only";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { serializeStream } from "@/features/stream/utils/serializer";
import { BROADCAST_SUMMARY_SELECT } from "@/features/stream/constants";
import type { BroadcastSummary, VodForGrid } from "@/features/stream/types";

/* -------------------------------------------------------------------------- */
/*                                1. Main List                                */
/* -------------------------------------------------------------------------- */

/**
 * 1. 메인 스트리밍 탭용 목록 조회
 * - 검색(keyword), 카테고리 필터, 스코프(전체/팔로잉) 조건을 모두 지원합니다.
 * - 커서 기반 무한 스크롤을 사용합니다.
 * - 현재 방송 중(`CONNECTED`)인 항목만 조회합니다.
 *
 * @param {Object} params - 검색 및 페이징 파라미터
 * @returns {Promise<BroadcastSummary[]>} 방송 목록
 */
export async function getStreams(params: {
  scope: "all" | "following";
  category?: string;
  keyword?: string;
  viewerId: number | null;
  cursor: number | null;
  take: number;
}): Promise<BroadcastSummary[]> {
  const { scope, category, keyword, viewerId, cursor, take } = params;

  // 기본 조건: 현재 방송 중
  const where: Prisma.BroadcastWhereInput = { status: "CONNECTED" };
  const conditions: Prisma.BroadcastWhereInput[] = [where];

  // 1. 커서
  if (cursor) conditions.push({ id: { lt: cursor } });

  // 2. 카테고리
  if (category) {
    conditions.push({
      OR: [
        { category: { eng_name: category } },
        { category: { parent: { eng_name: category } } },
      ],
    });
  }

  // 3. 키워드
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
          tags: {
            some: { name: { contains: keyword, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  // 4. 스코프 (팔로잉)
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
      {
        isFollowing: false, // 리스트에선 개별 팔로우 여부 확인 안 함 (필요시 클라 델타 사용)
        isMine: b.liveInput.userId === viewerId,
      }
    )
  );
}

/* -------------------------------------------------------------------------- */
/*                                2. Profile Rail                               */
/* -------------------------------------------------------------------------- */

/**
 * 2. 프로필 페이지 "최근 방송" Rail용 조회
 * - 특정 유저의 방송을 최신순으로 N개만 가져옵니다. (단순 리스트)
 * - `includePrivate` 옵션: 본인 프로필일 경우 비공개 방송도 포함합니다.
 * - 캐싱(`unstable_cache`)이 적용되어 있습니다. (USER_STREAMS_ID 태그)
 *
 * @param {number} ownerId - 방송 소유자 ID
 * @param {number} take - 조회 개수 (Default: 6)
 * @param {boolean} includePrivate - 비공개 방송 포함 여부 (본인이면 true)
 */
export async function getRecentBroadcasts(
  ownerId: number,
  take: number = 6,
  includePrivate: boolean = false
): Promise<BroadcastSummary[]> {
  const where: Prisma.BroadcastWhereInput = {
    liveInput: { userId: ownerId },
  };

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

/**
 * getRecentBroadcasts 캐시 Wrapper
 * - 태그: USER_STREAMS_ID(ownerId)
 */
export const getCachedRecentBroadcasts = (
  ownerId: number,
  take: number,
  includePrivate: boolean
) => {
  return nextCache(
    () => getRecentBroadcasts(ownerId, take, includePrivate),
    [
      "recent-broadcasts",
      String(ownerId),
      String(take),
      String(includePrivate),
    ],
    { tags: [T.USER_STREAMS_ID(ownerId)] }
  )();
};

/* -------------------------------------------------------------------------- */
/*                                3. Channel Live                               */
/* -------------------------------------------------------------------------- */

/**
 * 3. 채널 페이지 "현재 라이브" 조회 (단일)
 * - 특정 유저가 현재 진행 중인 방송 1개를 조회합니다. (최신순)
 * - 방송이 없으면 null을 반환합니다.
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
 * 4. 채널 페이지 "다시보기 그리드" 조회
 * - 특정 유저의 종료된(`ENDED`) 방송(VOD) 목록을 조회합니다.
 * - `ready_at` 및 `created_at` 기준으로 정렬합니다.
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
      requiresPassword: false, // Controller에서 처리
      followersOnlyLocked: false, // Controller에서 처리
    };
  });
}
