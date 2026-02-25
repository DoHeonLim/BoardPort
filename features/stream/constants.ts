/**
 * File Name : features/stream/constants.ts
 * Description : 공통 스트리밍 select 쿼리 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.13  임도헌   Created
 * 2025.08.24  임도헌   Modified  password 제거(민감 필드)
 * 2026.01.19  임도헌   Moved     lib/constants -> features/stream/lib
 * 2026.01.19  임도헌   Renamed   streamSelect -> constants 이름 변경
 * 2026.01.25  임도헌   Modified  도메인별 상수(AUTH, PRODUCT 등)를 각 Feature로 이관
 * 2026.01.25  임도헌   Modified  STREAM_SELECT 제거 -> BROADCAST_SUMMARY_SELECT로 대체 및 Enum 상수 추가
 */

import { Prisma } from "@/generated/prisma/client";

// =============================================================================
// 1. Enum / Visibility
// =============================================================================

export const STREAM_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  FOLLOWERS: "FOLLOWERS",
} as const;

export const STREAM_STATUS = {
  CREATED: "CREATED",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  ENDED: "ENDED",
} as const;

export const VOD_STATUS = {
  QUEUED: "QUEUED",
  INPROGRESS: "INPROGRESS",
  READY: "READY",
  ERROR: "ERROR",
} as const;

// =============================================================================
// 2. Display Maps / Categories
// =============================================================================

export const STREAM_VISIBILITY_DISPLAY = {
  PUBLIC: "공개",
  PRIVATE: "비공개",
  FOLLOWERS: "팔로워",
} as const;

export const STREAM_CATEGORY = {
  GAME_PLAY: "🎮 게임 플레이",
  REVIEW: "📝 리뷰",
  WORKTHROUGH: "📚 공략",
  COMMUNITY: "💬 커뮤니티",
} as const;

// =============================================================================
// 3. Prisma Select Queries
// =============================================================================

/**
 * 방송 목록/요약 조회용 공통 Select Query
 * (리스트, 그리드, 레일 등에서 사용)
 */
export const BROADCAST_SUMMARY_SELECT = {
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
      provider_uid: true, // stream_id
      userId: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  category: { select: { id: true, kor_name: true, icon: true } },
  tags: { select: { name: true } },
  // 최신 VOD ID (녹화본 이동용)
  vodAssets: {
    select: { id: true },
    orderBy: { id: "desc" },
    take: 1,
  },
} satisfies Prisma.BroadcastSelect;
