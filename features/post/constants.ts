/**
 * File Name : features/post/constants.ts
 * Description : 게시글 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  기존 select 쿼리 상수로 분리
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.19  임도헌   Renamed   PostSelect -> constants 이름 변경
 * 2026.01.22  임도헌   Moved     lib/constants.ts -> constants.ts
 * 2026.01.24  임도헌   Modified  lib/constants.ts에서 POST_CATEGORY 이관 및 통합
 * 2026.01.27  임도헌   Modified  주석 보강
 */
import { Prisma } from "@/generated/prisma/client";

// =============================================================================
// 1. Categories
// =============================================================================

/** 게시글 카테고리 (Enum 대용) */
export const POST_CATEGORY = {
  FREE: "⛵ 자유",
  CREW: "🏴‍☠️ 모험대원 모집",
  LOG: "📜 항해 일지",
  MAP: "🗺️ 보물지도",
  COMPASS: "🧭 나침반",
} as const;

export type PostCategoryType = keyof typeof POST_CATEGORY;

export const POST_CATEGORY_DESCRIPTIONS = {
  FREE: "자유롭게 이야기를 나눌 수 있는 공간입니다",
  CREW: "함께 보드게임을 즐길 모험대원을 모집하는 공간입니다",
  LOG: "보드게임 플레이 후기와 리뷰를 공유하는 공간입니다",
  MAP: "보드게임의 규칙과 공략을 공유하는 공간입니다",
  COMPASS: "보드게임에 대한 질문과 답변을 나누는 공간입니다",
} as const;

// 지역 필터가 '기본(내 동네)'으로 적용되어야 하는 카테고리 목록
export const LOCAL_FOCUSED_CATEGORIES = ["CREW", "FREE"];

// =============================================================================
// 2. Prisma Select Queries
// =============================================================================

/** 게시글 목록/상세 조회용 기본 Select Query */
export const POST_SELECT: Prisma.PostSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  views: true,
  created_at: true,
  updated_at: true,

  // 작성자 정보
  user: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },

  // 태그
  tags: {
    select: {
      name: true,
    },
  },

  // 대표 이미지 (1장)
  images: {
    select: {
      url: true,
    },
    take: 1,
  },

  // 위치 정보 추가
  latitude: true,
  longitude: true,
  locationName: true,
  region1: true,
  region2: true,
  region3: true,

  // 카운트 정보
  _count: {
    select: {
      comments: true,
      post_likes: true,
    },
  },
};
