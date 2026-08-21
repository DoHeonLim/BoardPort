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
 * 2026.03.09  임도헌   Modified  최근 방송 목록에서 CREATED/DISCONNECTED를 제외하고 준비 완료 VOD만 다시보기로 노출
 * 2026.03.25  임도헌   Modified  메인 스트리밍 리스트에서 실제 팔로우 상태를 함께 조회해 FOLLOWERS 잠금 플래그를 정확히 계산
 * 2026.03.29  임도헌   Modified  메인 다시보기 목록에 최신/인기 정렬과 팔로잉만 보조 필터를 분리 적용
 * 2026.04.02  임도헌   Modified  방송 요약 Prisma select import를 selects.ts 기준으로 정리
 * 2026.04.24  임도헌   Modified  프로필 방송국의 종료 방송 썸네일도 최신 ready VOD thumbnail_url을 우선 사용하도록 보정
 * 2026.05.03  임도헌   Modified  방송/다시보기 카드 표시용 연결 보드게임 locale 매핑 추가
 * 2026.05.08  임도헌   Modified  보드게임 relation select 공용화 및 팔로우 상태 확인용 select factory 적용
 * 2026.05.15  임도헌   Modified  전체 방송/다시보기 목록에서도 PRIVATE 항목을 노출하고 카드 진입 시 비밀번호로 접근 제어하도록 복구
 * 2026.05.15  임도헌   Modified  유저 채널 VOD 조회에 커서 기반 페이징을 적용해 무한스크롤 대응
 * 2026.05.18  임도헌   Modified  다시보기 카드 메타용 좋아요/댓글 수와 현재 사용자 좋아요 여부 매핑 추가
 * 2026.08.21  임도헌   Modified  목록 DTO 원본 provider UID 제거 및 접근 범위별 Cloudflare 썸네일 signed 변환
 */

import "server-only";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { serializeStream } from "@/features/stream/utils/serializer";
import {
  BROADCAST_SUMMARY_SELECT,
  buildBroadcastSummarySelectWithViewerFollow,
} from "@/features/stream/selects";
import { STREAM_BOARD_GAME_RELATION_SELECT } from "@/features/boardgame/selects";
import { getBlockedUserIds } from "@/features/user/service/block";
import { selectRecordingThumbnail } from "@/features/stream/utils/thumbnail";
import { resolveStreamThumbnailUrl } from "@/features/stream/service/playback";
import type {
  BroadcastSummary,
  StreamScope,
  VodForGrid,
} from "@/features/stream/types";

/** provider URL은 signed URL로 교체하고, 접근 불가 또는 설정 오류면 원본을 노출하지 않는다. */
function getAccessScopedThumbnail(
  sourceThumbnail: string | null | undefined,
  authorizedProviderId: string | null
) {
  try {
    return resolveStreamThumbnailUrl(sourceThumbnail, authorizedProviderId);
  } catch (error) {
    console.warn("[StreamList] signed thumbnail unavailable:", error);
    return null;
  }
}

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
  scope: StreamScope;
  category?: string;
  keyword?: string;
  viewerId: number;
  cursor: number | null;
  take: number;
}): Promise<BroadcastSummary[]> {
  const { scope, category, keyword, viewerId, cursor, take } = params;

  const summarySelectWithViewerFollow =
    buildBroadcastSummarySelectWithViewerFollow(viewerId);

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
    // 전체 목록에서도 PRIVATE 방송은 발견 가능해야 하며, 접근 제한은 카드/상세 진입 단계에서 처리
    conditions.push({
      visibility: { in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] },
    });
  }

  const rows = await db.broadcast.findMany({
    where: { AND: conditions },
    select: summarySelectWithViewerFollow,
    orderBy: { id: "desc" },
    take,
  });

  return rows.map((b) => {
    const isMine = b.liveInput.userId === viewerId;
    const isFollowing = b.liveInput.user.followers.length > 0;
    const canUseProviderThumbnail =
      b.visibility === "PUBLIC" ||
      isMine ||
      (b.visibility === "FOLLOWERS" && isFollowing);

    return serializeStream(
      {
        ...b,
        thumbnail: getAccessScopedThumbnail(
          b.thumbnail,
          canUseProviderThumbnail ? b.liveInput.provider_uid : null
        ),
        userId: b.liveInput.userId,
        user: {
          id: b.liveInput.user.id,
          username: b.liveInput.user.username,
          avatar: b.liveInput.user.avatar,
        },
        tags: b.tags,
      },
      {
        isFollowing,
        isMine,
      }
    );
  });
}

/**
 * 메인 다시보기 목록 필터링 및 페이징 조회 로직
 *
 * [데이터 페칭 및 권한 제어 전략]
 * - 처리 완료된 VOD(`ready_at`)만 조회 대상으로 한정
 * - 조회자 기반 차단 및 정지 유저 필터를 동일하게 적용
 * - `followingOnly` 보조 필터로 팔로잉한 스트리머의 다시보기만 좁혀볼 수 있음
 * - 카드에서 필요한 접근 제어 플래그와 메타데이터(길이, 조회수, 좋아요/댓글 수, 사용자 좋아요 여부)를 함께 반환
 */
export async function getRecordingsList(params: {
  sort: "latest" | "popular";
  followingOnly?: boolean;
  category?: string;
  keyword?: string;
  viewerId: number;
  cursor: number | null;
  take: number;
}): Promise<VodForGrid[]> {
  const {
    sort,
    followingOnly = false,
    category,
    keyword,
    viewerId,
    cursor,
    take,
  } = params;
  const blockedIds = await getBlockedUserIds(viewerId);

  const conditions: Prisma.VodAssetWhereInput[] = [
    { ready_at: { not: null } },
    { broadcast: { status: "ENDED" } },
    { broadcast: { liveInput: { user: { bannedAt: null } } } },
    { broadcast: { liveInput: { userId: { notIn: blockedIds } } } },
  ];

  if (cursor) conditions.push({ id: { lt: cursor } });

  if (category) {
    conditions.push({
      broadcast: {
        OR: [
          { category: { eng_name: category } },
          { category: { parent: { eng_name: category } } },
        ],
      },
    });
  }

  if (keyword) {
    conditions.push({
      OR: [
        { broadcast: { title: { contains: keyword, mode: "insensitive" } } },
        {
          broadcast: {
            description: { contains: keyword, mode: "insensitive" },
          },
        },
        {
          broadcast: {
            liveInput: {
              user: { username: { contains: keyword, mode: "insensitive" } },
            },
          },
        },
        {
          broadcast: {
            tags: {
              some: { name: { contains: keyword, mode: "insensitive" } },
            },
          },
        },
      ],
    });
  }

  conditions.push({
    // 다시보기 목록도 라이브/채널과 동일하게 PRIVATE를 발견 가능하게 두고, 상세 진입 시 비밀번호로 제한
    broadcast: { visibility: { in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] } },
  });

  if (followingOnly) {
    conditions.push({
      broadcast: {
        liveInput: {
          user: {
            OR: [
              { id: viewerId },
              { followers: { some: { followerId: viewerId } } },
            ],
          },
        },
      },
    });
  }

  const vods = await db.vodAsset.findMany({
    where: { AND: conditions },
    select: {
      id: true,
      duration_sec: true,
      ready_at: true,
      views: true,
      _count: { select: { recordingLikes: true, recordingComments: true } },
      provider_asset_id: true,
      thumbnail_url: true,
      created_at: true,
      broadcastId: true,
      broadcast: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          thumbnailAnimated: true,
          visibility: true,
          category: { select: { id: true, kor_name: true, icon: true } },
          tags: { select: { id: true, name: true } },
          board_games: { select: STREAM_BOARD_GAME_RELATION_SELECT },
          liveInput: {
            select: {
              provider_uid: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  followers: {
                    where: { followerId: viewerId },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy:
      sort === "popular"
        ? [{ views: "desc" }, { ready_at: "desc" }, { id: "desc" }]
        : [{ ready_at: "desc" }, { id: "desc" }],
    take,
  });

  // 카드 하트 색상은 현재 조회자의 좋아요 여부를 의미하므로 현재 페이지 VOD만 배치 조회
  const likedVodIds =
    viewerId > 0 && vods.length > 0
      ? new Set(
          (
            await db.recordingLike.findMany({
              where: {
                userId: viewerId,
                vodId: { in: vods.map((vod) => vod.id) },
              },
              select: { vodId: true },
            })
          ).map((like) => like.vodId)
        )
      : new Set<number>();

  return vods.map((v) => {
    const b = v.broadcast;
    const isMine = b.liveInput.userId === viewerId;
    const isFollowing = b.liveInput.user.followers.length > 0;
    const canUseProviderThumbnail = b.visibility === "PUBLIC" || isMine;
    const thumbnail = selectRecordingThumbnail({
      visibility: b.visibility,
      isOwner: isMine,
      providerThumbnail:
        viewerId > 0 && canUseProviderThumbnail
          ? getAccessScopedThumbnail(v.thumbnail_url, v.provider_asset_id)
          : null,
      broadcastThumbnail: getAccessScopedThumbnail(
        b.thumbnail,
        canUseProviderThumbnail ? b.liveInput.provider_uid : null
      ),
      broadcastThumbnailAnimated: b.thumbnailAnimated,
    });

    return {
      vodId: v.id,
      broadcastId: b.id,
      title: b.title,
      // 제한 콘텐츠는 VOD asset UID가 포함될 수 있는 provider 썸네일을 목록에 노출하지 않는다.
      ...thumbnail,
      visibility: b.visibility,
      user: {
        id: b.liveInput.user.id,
        username: b.liveInput.user.username,
        avatar: b.liveInput.user.avatar,
      },
      href: `/streams/${v.id}/recording`,
      readyAt: v.ready_at,
      duration: v.duration_sec ?? 0,
      viewCount: v.views,
      likeCount: v._count.recordingLikes,
      commentCount: v._count.recordingComments,
      isLiked: likedVodIds.has(v.id),
      category: b.category,
      tags: b.tags,
      board_games: b.board_games.flatMap(({ boardGame }) => {
        const { locales, ...linkedBoardGame } = boardGame;
        const locale = locales[0];
        // 공개 locale이 있는 연결만 방송 카드의 보드게임 뱃지로 사용
        if (!locale) return [];
        return [{ boardGame: { ...linkedBoardGame, locale } }];
      }),
      requiresPassword: b.visibility === "PRIVATE" ? !isMine : false,
      followersOnlyLocked:
        b.visibility === "FOLLOWERS" ? !isMine && !isFollowing : false,
    };
  });
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
 * @param {number | null} viewerId - signed VOD 썸네일을 발급할 현재 로그인 사용자
 */
export async function getRecentBroadcasts(
  ownerId: number,
  take: number = 6,
  includePrivate: boolean = false,
  viewerId: number | null = null
): Promise<BroadcastSummary[]> {
  if (
    viewerId &&
    viewerId !== ownerId &&
    (await getBlockedUserIds(viewerId)).includes(ownerId)
  ) {
    return [];
  }

  const where: Prisma.BroadcastWhereInput = { liveInput: { userId: ownerId } };
  where.AND = [
    {
      OR: [
        { status: "CONNECTED" },
        {
          status: "ENDED",
          vodAssets: {
            some: { ready_at: { not: null } },
          },
        },
      ],
    },
  ];

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

  return broadcasts.map((b) => {
    // getRecentBroadcasts는 Broadcast 중심 DTO지만, 종료 방송 카드는 최신 ready VOD로 이동
    // 따라서 대표 이미지도 Broadcast 업로드 썸네일보다 VOD 처리 완료 썸네일 우선
    const latestVod = b.vodAssets[0] ?? null;
    const canUseProviderThumbnail = b.visibility === "PUBLIC" || includePrivate;
    const stream = serializeStream(
      {
        ...b,
        thumbnail: getAccessScopedThumbnail(
          b.thumbnail,
          canUseProviderThumbnail ? b.liveInput.provider_uid : null
        ),
        userId: b.liveInput.userId,
        user: b.liveInput.user,
        tags: b.tags,
      },
      { isFollowing: false, isMine: includePrivate }
    );
    const thumbnail = selectRecordingThumbnail({
      visibility: b.visibility,
      isOwner: includePrivate,
      providerThumbnail:
        latestVod && viewerId && canUseProviderThumbnail
          ? getAccessScopedThumbnail(
              latestVod.thumbnail_url,
              latestVod.provider_asset_id
            )
          : null,
      broadcastThumbnail: stream.thumbnail,
      broadcastThumbnailAnimated: stream.thumbnailAnimated,
    });

    return {
      ...stream,
      ...thumbnail,
      latestVodId: latestVod?.id ?? null,
    };
  });
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
      // 채널 페이지에서 실제 접근 판정이 끝나기 전에는 provider URL을 숨긴다.
      thumbnail: getAccessScopedThumbnail(b.thumbnail, null),
      userId: b.liveInput.userId,
      user: b.liveInput.user,
      tags: b.tags,
    },
    { isFollowing: false, isMine: false } // 상위 계층에서 보정할 기본 뷰어 상태
  );
}

/* -------------------------------------------------------------------------- */
/*                                4. Channel VODs                               */
/* -------------------------------------------------------------------------- */

/**
 * 유저 채널 "다시보기(VOD)" 그리드 목록 조회 로직
 *
 * [데이터 가공 전략]
 * - 종료된(`ENDED`) 방송에 매핑된 VodAsset 레코드를 처리 완료(`ready_at`) 및 id 역순으로 조회
 * - UI 그리드 렌더링에 최적화된 DTO(`VodForGrid`) 매핑 및 반환
 *
 * @param {number} ownerId - 방송 소유자 ID
 * @param {number} take - 조회 개수
 * @param {number | null} cursor - 이전 페이지의 마지막 VOD id
 * @param {number | null} viewerId - 현재 조회자 ID, 다시보기 카드의 좋아요 강조 여부 계산에 사용
 */
export async function getChannelVods(
  ownerId: number,
  take: number,
  cursor: number | null = null,
  viewerId: number | null = null
): Promise<VodForGrid[]> {
  if (
    viewerId &&
    viewerId !== ownerId &&
    (await getBlockedUserIds(viewerId)).includes(ownerId)
  ) {
    return [];
  }

  const vods = await db.vodAsset.findMany({
    where: {
      ready_at: { not: null },
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
      _count: { select: { recordingLikes: true, recordingComments: true } },
      provider_asset_id: true,
      thumbnail_url: true,
      created_at: true,
      broadcast: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          thumbnailAnimated: true,
          visibility: true,
          category: { select: { id: true, kor_name: true, icon: true } },
          tags: { select: { id: true, name: true } },
          board_games: { select: STREAM_BOARD_GAME_RELATION_SELECT },
          liveInput: {
            select: {
              provider_uid: true,
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
        },
      },
    },
    orderBy: [{ ready_at: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take,
  });

  // 채널 첫 페이지/추가 페이지 모두 같은 하트 색상 기준을 쓰도록 현재 조회자 좋아요 여부 주입
  const likedVodIds =
    viewerId && viewerId > 0 && vods.length > 0
      ? new Set(
          (
            await db.recordingLike.findMany({
              where: {
                userId: viewerId,
                vodId: { in: vods.map((vod) => vod.id) },
              },
              select: { vodId: true },
            })
          ).map((like) => like.vodId)
        )
      : new Set<number>();

  return vods.map((v) => {
    const b = v.broadcast;
    const isOwner = b.liveInput.user.id === viewerId;
    const canUseProviderThumbnail = b.visibility === "PUBLIC" || isOwner;
    const thumbnail = selectRecordingThumbnail({
      visibility: b.visibility,
      isOwner,
      providerThumbnail:
        viewerId && canUseProviderThumbnail
          ? getAccessScopedThumbnail(v.thumbnail_url, v.provider_asset_id)
          : null,
      broadcastThumbnail: getAccessScopedThumbnail(
        b.thumbnail,
        canUseProviderThumbnail ? b.liveInput.provider_uid : null
      ),
      broadcastThumbnailAnimated: b.thumbnailAnimated,
    });
    return {
      vodId: v.id,
      broadcastId: b.id,
      title: b.title,
      ...thumbnail,
      visibility: b.visibility,
      user: b.liveInput.user,
      href: `/streams/${v.id}/recording`,
      readyAt: v.ready_at,
      duration: v.duration_sec ?? 0,
      viewCount: v.views,
      likeCount: v._count.recordingLikes,
      commentCount: v._count.recordingComments,
      isLiked: likedVodIds.has(v.id),
      category: b.category,
      tags: b.tags,
      board_games: b.board_games.flatMap(({ boardGame }) => {
        const { locales, ...linkedBoardGame } = boardGame;
        const locale = locales[0];
        // 공개 locale이 없는 연결은 다시보기 그리드 표시 대상에서 제외
        if (!locale) return [];
        return [{ boardGame: { ...linkedBoardGame, locale } }];
      }),
      requiresPassword: false,
      followersOnlyLocked: false,
    };
  });
}
