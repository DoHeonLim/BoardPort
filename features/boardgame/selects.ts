/**
 * File Name : features/boardgame/selects.ts
 * Description : 보드게임 도감 relation Prisma select 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   상품/게시글/방송 공용 보드게임 relation select 분리
 * 2026.05.08  임도헌   Modified  도메인별 join table relation select 상수 추가
 * 2026.05.08  임도헌   Modified  공개 locale where 조건을 publicQuery shared에서 select 상수로 이동
 */

import { Prisma } from "@/generated/prisma/client";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";

/** 공개 도감 목록/상세에 노출 가능한 한국어 locale where 조건 */
export const PUBLISHED_BOARDGAME_LOCALE_WHERE = {
  locale: "ko",
  status: BoardGameLocaleStatus.PUBLISHED,
  shortDescription: { not: null },
  reviewedAt: { not: null },
} satisfies Prisma.BoardGameLocaleWhereInput;

/** 콘텐츠 카드/상세에서 공통으로 표시하는 공개 보드게임 도감 select */
export const BOARD_GAME_RELATION_BOARD_GAME_SELECT = {
  id: true,
  primaryName: true,
  imageUrl: true,
  locales: {
    where: {
      locale: "ko",
      status: BoardGameLocaleStatus.PUBLISHED,
    },
    select: {
      title: true,
      aliases: true,
    },
    take: 1,
  },
} satisfies Prisma.BoardGameSelect;

/** 상품-보드게임 연결 relation select */
export const PRODUCT_BOARD_GAME_RELATION_SELECT = {
  boardGame: {
    select: BOARD_GAME_RELATION_BOARD_GAME_SELECT,
  },
} satisfies Prisma.ProductBoardGameSelect;

/** 게시글-보드게임 연결 relation select */
export const POST_BOARD_GAME_RELATION_SELECT = {
  boardGame: {
    select: BOARD_GAME_RELATION_BOARD_GAME_SELECT,
  },
} satisfies Prisma.PostBoardGameSelect;

/** 방송-보드게임 연결 relation select */
export const STREAM_BOARD_GAME_RELATION_SELECT = {
  boardGame: {
    select: BOARD_GAME_RELATION_BOARD_GAME_SELECT,
  },
} satisfies Prisma.StreamBoardGameSelect;
