/**
 * File Name : features/post/selects.ts
 * Description : 게시글 Prisma 조회 shape 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   constants.ts에서 게시글 목록/상세 조회용 Prisma select 분리
 * 2026.05.03  임도헌   Modified  게시글 목록 카드에 연결 보드게임 칩을 표시할 수 있도록 보드게임 locale select 추가
 * 2026.05.08  임도헌   Modified  보드게임 relation select를 features/boardgame/selects.ts 공용 상수로 교체
 */

import { Prisma } from "@/generated/prisma/client";
import { POST_BOARD_GAME_RELATION_SELECT } from "@/features/boardgame/selects";

/** 게시글 목록/상세 조회용 기본 Select Query */
export const POST_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  views: true,
  created_at: true,
  updated_at: true,
  user: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
  tags: {
    select: {
      name: true,
    },
  },
  images: {
    select: {
      url: true,
      isAnimated: true,
    },
    take: 1,
  },
  blocks: {
    where: {
      type: {
        in: ["IMAGE", "EMBED"],
      },
    },
    orderBy: { order: "asc" },
    select: {
      type: true,
      embedUrl: true,
      embedThumbnailUrl: true,
      postImage: {
        select: {
          url: true,
          isAnimated: true,
        },
      },
    },
    take: 1,
  },
  latitude: true,
  longitude: true,
  locationName: true,
  region1: true,
  region2: true,
  region3: true,
  _count: {
    select: {
      comments: true,
      post_likes: true,
    },
  },
  board_games: {
    select: POST_BOARD_GAME_RELATION_SELECT,
  },
} satisfies Prisma.PostSelect;
