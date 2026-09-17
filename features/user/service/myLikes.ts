/**
 * File Name : features/user/service/myLikes.ts
 * Description : 사용자 찜한 콘텐츠 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   상품·게시글·다시보기 관심 목록 집계와 페이지 조회 구현
 * 2026.09.11  임도헌   Modified  삭제와 무관한 찜 시각·콘텐츠 ID 복합 커서 적용
 */
import "server-only";

import db from "@/lib/db";
import { POST_SELECT } from "@/features/post/selects";
import { STREAM_BOARD_GAME_RELATION_SELECT } from "@/features/boardgame/selects";
import { getBlockedUserIds } from "@/features/user/service/block";
import { resolveStreamThumbnailUrl } from "@/features/stream/service/playback";
import {
  selectRecordingThumbnail,
  selectRecordingTitle,
} from "@/features/stream/utils/thumbnail";
import type { VodForGrid } from "@/features/stream/types";
import type {
  LikedPostListItem,
  LikedPostsPage,
  LikedRecordingsPage,
  MyLikesCursor,
  MyLikesCounts,
} from "@/features/user/types";

const LIKES_PAGE_TAKE = 10;

function getAccessScopedThumbnail(
  sourceThumbnail: string | null | undefined,
  authorizedProviderId: string | null
) {
  try {
    return resolveStreamThumbnailUrl(sourceThumbnail, authorizedProviderId);
  } catch (error) {
    console.warn("[MyLikes] signed thumbnail unavailable:", error);
    return null;
  }
}

/** 사용자 관심 목록의 탭별 전체 개수 조회 */
export async function getMyLikesCounts(userId: number): Promise<MyLikesCounts> {
  const blockedIds = await getBlockedUserIds(userId);
  const [products, posts, recordings] = await Promise.all([
    db.productLike.count({
      where: { userId, product: { hidden_at: null } },
    }),
    db.postLike.count({
      where: {
        userId,
        post: {
          user: { bannedAt: null },
          userId: blockedIds.length ? { notIn: blockedIds } : undefined,
        },
      },
    }),
    db.recordingLike.count({
      where: {
        userId,
        vod: {
          ready_at: { not: null },
          broadcast: {
            status: "ENDED",
            liveInput: {
              user: { bannedAt: null },
              userId: blockedIds.length ? { notIn: blockedIds } : undefined,
            },
          },
        },
      },
    }),
  ]);

  return { products, posts, recordings };
}

/** 최근 찜한 순서의 게시글 한 페이지 조회 */
export async function getLikedPostsPage(
  userId: number,
  cursor: MyLikesCursor | null
): Promise<LikedPostsPage> {
  const blockedIds = await getBlockedUserIds(userId);
  const cursorLikedAt = cursor ? new Date(cursor.likedAt) : null;

  const rows = await db.postLike.findMany({
    where: {
      userId,
      post: {
        user: { bannedAt: null },
        userId: blockedIds.length ? { notIn: blockedIds } : undefined,
      },
      ...(cursor && cursorLikedAt
        ? {
            OR: [
              { created_at: { lt: cursorLikedAt } },
              {
                created_at: cursorLikedAt,
                postId: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    select: {
      postId: true,
      created_at: true,
      post: { select: POST_SELECT },
    },
    orderBy: [{ created_at: "desc" }, { postId: "desc" }],
    take: LIKES_PAGE_TAKE + 1,
  });

  const hasMore = rows.length > LIKES_PAGE_TAKE;
  const pageRows = hasMore ? rows.slice(0, LIKES_PAGE_TAKE) : rows;
  const posts = pageRows.map(({ post, created_at }) => ({
    ...post,
    liked_at: created_at,
    isLiked: true,
    board_games: post.board_games.flatMap(({ boardGame }) => {
      const { locales, ...linkedBoardGame } = boardGame;
      const locale = locales[0];
      return locale ? [{ boardGame: { ...linkedBoardGame, locale } }] : [];
    }),
  })) as LikedPostListItem[];

  return {
    posts,
    nextCursor: hasMore ? toLikesCursor(pageRows.at(-1), "postId") : null,
  };
}

/** 최근 찜한 순서의 다시보기 한 페이지 조회 */
export async function getLikedRecordingsPage(
  userId: number,
  cursor: MyLikesCursor | null
): Promise<LikedRecordingsPage> {
  const blockedIds = await getBlockedUserIds(userId);
  const cursorLikedAt = cursor ? new Date(cursor.likedAt) : null;

  const rows = await db.recordingLike.findMany({
    where: {
      userId,
      vod: {
        ready_at: { not: null },
        broadcast: {
          status: "ENDED",
          visibility: { in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] },
          liveInput: {
            user: { bannedAt: null },
            userId: blockedIds.length ? { notIn: blockedIds } : undefined,
          },
        },
      },
      ...(cursor && cursorLikedAt
        ? {
            OR: [
              { created_at: { lt: cursorLikedAt } },
              {
                created_at: cursorLikedAt,
                vodId: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    select: {
      vodId: true,
      created_at: true,
      vod: {
        select: {
          id: true,
          duration_sec: true,
          ready_at: true,
          views: true,
          _count: { select: { recordingLikes: true, recordingComments: true } },
          provider_asset_id: true,
          thumbnail_url: true,
          title: true,
          custom_thumbnail_url: true,
          thumbnailAnimated: true,
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
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      username: true,
                      avatar: true,
                      followers: {
                        where: { followerId: userId },
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
      },
    },
    orderBy: [{ created_at: "desc" }, { vodId: "desc" }],
    take: LIKES_PAGE_TAKE + 1,
  });

  const hasMore = rows.length > LIKES_PAGE_TAKE;
  const pageRows = hasMore ? rows.slice(0, LIKES_PAGE_TAKE) : rows;
  const recordings = pageRows.map(({ vod, created_at }) => {
    const broadcast = vod.broadcast;
    const isMine = broadcast.liveInput.userId === userId;
    const isFollowing = broadcast.liveInput.user.followers.length > 0;
    const canUseProviderThumbnail = broadcast.visibility === "PUBLIC" || isMine;
    const thumbnail = selectRecordingThumbnail({
      visibility: broadcast.visibility,
      isOwner: isMine,
      customThumbnail: getAccessScopedThumbnail(vod.custom_thumbnail_url, null),
      customThumbnailAnimated: vod.thumbnailAnimated,
      providerThumbnail: canUseProviderThumbnail
        ? getAccessScopedThumbnail(vod.thumbnail_url, vod.provider_asset_id)
        : null,
      broadcastThumbnail: getAccessScopedThumbnail(
        broadcast.thumbnail,
        canUseProviderThumbnail ? broadcast.liveInput.provider_uid : null
      ),
      broadcastThumbnailAnimated: broadcast.thumbnailAnimated,
    });

    return {
      vodId: vod.id,
      broadcastId: broadcast.id,
      title: selectRecordingTitle(vod.title, broadcast.title),
      ...thumbnail,
      visibility: broadcast.visibility,
      user: {
        id: broadcast.liveInput.user.id,
        username: broadcast.liveInput.user.username,
        avatar: broadcast.liveInput.user.avatar,
      },
      href: `/streams/${vod.id}/recording`,
      readyAt: vod.ready_at,
      likedAt: created_at,
      duration: vod.duration_sec ?? 0,
      viewCount: vod.views,
      likeCount: vod._count.recordingLikes,
      commentCount: vod._count.recordingComments,
      isLiked: true,
      category: broadcast.category,
      tags: broadcast.tags,
      board_games: broadcast.board_games.flatMap(({ boardGame }) => {
        const { locales, ...linkedBoardGame } = boardGame;
        const locale = locales[0];
        return locale ? [{ boardGame: { ...linkedBoardGame, locale } }] : [];
      }),
      requiresPassword: broadcast.visibility === "PRIVATE" ? !isMine : false,
      followersOnlyLocked:
        broadcast.visibility === "FOLLOWERS" ? !isMine && !isFollowing : false,
    } satisfies VodForGrid;
  });

  return {
    recordings,
    nextCursor: hasMore ? toLikesCursor(pageRows.at(-1), "vodId") : null,
  };
}

function toLikesCursor<T extends "postId" | "vodId">(
  row: ({ created_at: Date } & Record<T, number>) | undefined,
  idKey: T
): MyLikesCursor | null {
  return row
    ? { id: row[idKey], likedAt: row.created_at.toISOString() }
    : null;
}
