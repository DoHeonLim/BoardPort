/**
 * File Name : features/stream/lib/getUserStreams.ts
 * Description : 유저 채널 스트림 목록 (Broadcast 스키마 / 가시성/정렬/페이징)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   유저 스트리밍 목록 조회 로직 분리
 * 2025.08.09  임도헌   Modified  역할군 + 가시성 필터 + 티저 플래그 추가
 * 2025.08.27  임도헌   Modified  비소유자도 PRIVATE의 ENDED(다시보기) 노출
 * 2025.10.23  임도헌   Modified  ownerId 우선, username→id 해석; per-id 태그; ROLE 캐시 버킷 2단계(owner/public); nextCursor 추가
 * 2025.10.29  임도헌   Modified  unstable_cache 키에 take 반영(1p만 캐시), username→id 얇은 캐시 + 태그 추가
 * 2025.11.26  임도헌   Modified  latestVodId(가장 최신 VodAsset id) DTO에 추가
 * 2025.12.20  임도헌   Modified  username→id 해석 로컬화, 구조/주석 통일
 * 2026.01.01  임도헌   Modified  username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { getViewerRole } from "@/features/stream/lib/getViewerRole";
import { resolveUserIdByUsernameCached } from "@/features/user/lib/resolveUserIdByUsernameCached";
import type { ViewerRole } from "@/types/stream";

/** 입력은 ownerId 권장, username은 호환용(서버에서 즉시 id 해석) */
export type GetUserStreamsParams =
  | {
      ownerId: number;
      viewerId?: number | null;
      take?: number;
      cursor?: number;
      includeViewerRole?: boolean; // 유저 role 포함 여부
    }
  | {
      username: string;
      viewerId?: number | null;
      take?: number;
      cursor?: number;
      includeViewerRole?: boolean; // 유저 role 포함 여부
    };

/* Prisma where/select 공통화                                                  */
/**
 * bucket(owner/public) + cursor를 반영한 where 생성
 * - owner: 모든 visibility (본인)
 * - public: PUBLIC + FOLLOWERS + (PRIVATE & ENDED)
 */
function buildWhere(
  ownerId: number,
  bucket: "owner" | "public",
  cursor?: number
): Prisma.BroadcastWhereInput {
  const baseWhere: Prisma.BroadcastWhereInput = {
    liveInput: { userId: ownerId },
  };

  const cursorFilter: Prisma.BroadcastWhereInput = cursor
    ? { id: { lt: cursor } }
    : {};

  if (bucket === "owner") {
    return { ...baseWhere, ...cursorFilter };
  }

  const nonOwnerVisibility: Prisma.BroadcastWhereInput = {
    OR: [
      { visibility: "PUBLIC" },
      { visibility: "FOLLOWERS" },
      { visibility: "PRIVATE", status: "ENDED" },
    ],
  };

  return { ...baseWhere, ...nonOwnerVisibility, ...cursorFilter };
}

const vodAssetsOrderBy = [
  { ready_at: "desc" },
  { id: "desc" },
] as Prisma.VodAssetOrderByWithRelationInput[];

const broadcastSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  visibility: true,
  status: true,
  started_at: true,
  ended_at: true,
  liveInput: {
    select: {
      provider_uid: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  category: { select: { id: true, kor_name: true, icon: true } },
  tags: { select: { name: true } },
  vodAssets: {
    select: { id: true, ready_at: true },
    orderBy: vodAssetsOrderBy,
    take: 1,
  },
} satisfies Prisma.BroadcastSelect;

/* 1페이지 캐시 (cursor 없는 첫 페이지만)                                       */

/**
 * 1페이지 캐시
 * - 태그: user-streams-id-${ownerId}
 * - 키: ["user-streams-by-owner", ownerId, bucket, take]
 * - cursor가 있으면 비캐시(findMany) 경로로 우회
 */
function getCachedUserStreamsFirstPage(
  ownerId: number,
  bucket: "owner" | "public",
  take: number
) {
  return nextCache(
    async () => {
      return db.broadcast.findMany({
        where: buildWhere(ownerId, bucket),
        select: broadcastSelect,
        orderBy: { id: "desc" },
        take,
      });
    },
    ["user-streams-by-owner", String(ownerId), bucket, String(take)],
    { tags: [T.USER_STREAMS_ID(ownerId)] }
  );
}

export async function getUserStreams(params: GetUserStreamsParams) {
  // 1) ownerId 확정 (username이 왔다면 얇은 캐시로 해석)
  let ownerId: number | null = null;

  if ("ownerId" in params) {
    ownerId = params.ownerId;
  } else {
    ownerId = await resolveUserIdByUsernameCached(params.username);
    if (!ownerId) {
      return {
        items: [],
        role: "VISITOR" as ViewerRole,
        owner: null,
        nextCursor: null,
      };
    }
  }

  const take = Math.max(1, Math.min(params.take ?? 30, 60)); // 안전 클램프
  const cursor = params.cursor;

  // 2) ROLE 계산 옵션화
  const includeViewerRole = params.includeViewerRole !== false;
  const viewerId = params.viewerId ?? null;

  const role: ViewerRole = includeViewerRole
    ? await getViewerRole(viewerId, ownerId)
    : viewerId && viewerId === ownerId
      ? "OWNER"
      : "VISITOR";

  const bucket: "owner" | "public" = role === "OWNER" ? "owner" : "public";

  // 3) 조회: cursor가 있으면 비캐시(페이징), 없으면 1페이지 캐시
  const rows = cursor
    ? await db.broadcast.findMany({
        where: buildWhere(ownerId, bucket, cursor),
        select: broadcastSelect,
        orderBy: { id: "desc" },
        take,
      })
    : await getCachedUserStreamsFirstPage(ownerId, bucket, take)();

  // 4) DTO 매핑 + nextCursor
  const items = rows.map((b) => {
    const latestVod = b.vodAssets?.[0] ?? null;

    return {
      id: b.id,
      title: b.title,
      description: b.description,
      thumbnail: b.thumbnail ?? null,
      visibility: b.visibility,
      status: b.status,
      isLive: b.status === "CONNECTED",

      started_at: b.started_at,
      ended_at: b.ended_at,

      // Cloudflare stream uid
      stream_id: b.liveInput.provider_uid,

      user: {
        id: b.liveInput.user.id,
        username: b.liveInput.user.username,
        avatar: b.liveInput.user.avatar ?? null,
      },

      category: b.category
        ? {
            id: b.category.id,
            kor_name: b.category.kor_name,
            icon: b.category.icon ?? null,
          }
        : null,

      tags: b.tags,

      /**
       * 잠금 플래그:
       * - PRIVATE: 팔로우로 풀리지 않음 → OWNER만 false, 그 외는 true
       * - FOLLOWERS: VISITOR면 잠김
       */
      requiresPassword: b.visibility === "PRIVATE" && role !== "OWNER",
      followersOnlyLocked: b.visibility === "FOLLOWERS" && role === "VISITOR",

      // 가장 최신 VodAsset id (녹화 상세로 이동할 때 사용)
      latestVodId: latestVod?.id ?? null,
    };
  });

  const nextCursor = items.length === take ? items[items.length - 1].id : null;
  const owner = { id: ownerId }; // 호환용 메타

  return { items, role, owner, nextCursor };
}

/**
 * 정밀 무효화 예시
 * - 방송 시작/종료/삭제/가시성 변경 등 이벤트 후:
 *   revalidateTag(`user-streams-id-${ownerId}`);
 * - username 변경 이벤트(프로필 수정) 후:
 *   revalidateTag(`user-username-id-${normalizedUsername}`);
 */
