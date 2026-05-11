/**
 * File Name : features/stream/selects.ts
 * Description : 스트리밍 도메인 Prisma select 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   constants.ts에서 방송 요약 조회용 Prisma select 분리
 * 2026.04.24  임도헌   Modified  프로필 방송국 썸네일을 최신 ready VOD 기준으로 맞추기 위해 vodAssets thumbnail_url 포함
 * 2026.05.03  임도헌   Modified  방송 카드에 연결 보드게임 칩을 표시할 수 있도록 보드게임 locale select 추가
 * 2026.05.08  임도헌   Modified  보드게임 relation select 공용화 및 팔로우 상태 확인용 select factory 추가
 */

import { Prisma } from "@/generated/prisma/client";
import { STREAM_BOARD_GAME_RELATION_SELECT } from "@/features/boardgame/selects";

/** 방송 목록/요약 조회용 공통 select */
export const BROADCAST_SUMMARY_SELECT = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  thumbnailAnimated: true,
  visibility: true,
  status: true,
  started_at: true,
  ended_at: true,
  liveInput: {
    select: {
      provider_uid: true, // stream_id
      userId: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  category: { select: { id: true, kor_name: true, icon: true } },
  tags: { select: { name: true } },
  board_games: {
    select: STREAM_BOARD_GAME_RELATION_SELECT,
  },
  // 프로필 방송국도 다시보기 목록과 같은 대표 썸네일을 쓰도록 최신 ready VOD 1개만 함께 조회
  vodAssets: {
    where: { ready_at: { not: null } },
    select: { id: true, thumbnail_url: true },
    orderBy: { id: "desc" },
    take: 1,
  },
} satisfies Prisma.BroadcastSelect;

/**
 * 방송 목록에서 팔로우 전용 잠금 상태를 계산하기 위한 viewerId 기반 select
 *
 * @param viewerId - 현재 조회자 ID
 * @returns 팔로우 여부를 포함한 방송 요약 select
 */
export function buildBroadcastSummarySelectWithViewerFollow(viewerId: number) {
  return {
    ...BROADCAST_SUMMARY_SELECT,
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
  } satisfies Prisma.BroadcastSelect;
}
