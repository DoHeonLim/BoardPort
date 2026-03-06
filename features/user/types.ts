/**
 * File Name : features/user/types.ts
 * Description : 유저 도메인 공통 타입 (types/profile.ts 통합)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   types/profile.ts 내용 통합
 * 2026.02.04  임도헌   Modified  userProfile 타입에 isBlocked 필드 추가 (차단 여부)
 * 2026.02.06  임도헌   Modified  관리자용 타입 추가
 * 2026.02.15  임도헌   Modified  UserProfile에 location 관련 필드 추가
 * 2026.02.24  임도헌   Modified  CurrentUserForEdit 타입에 kakao_id를 추가
 * 2026.03.07  임도헌   Modified  섹션 제목 및 타입 설명 정리
 */

import type { Role } from "@/generated/prisma/enums";

// =============================================================================
// 1. Entity / UI Types
// =============================================================================

/** 유저 최소 정보 (Lite) */
export type UserLite = {
  id: number;
  username: string;
  avatar: string | null;
};

/** 프로필 조회 결과 (상세) */
export interface UserProfile {
  id: number;
  username: string;
  avatar: string | null;
  email: string | null;
  created_at: Date;
  emailVerified: boolean;
  locationName?: string | null;
  region1?: string | null; // 시/도
  region2?: string | null; // 구/군
  region3?: string | null; // 동/읍/면
  _count: {
    followers: number;
    following: number;
  };
  // Viewer Context
  isMe: boolean;
  isFollowing: boolean; // viewer -> target
  isBlocked: boolean; // viewer -> target 차단 여부
  viewerId?: number | null;
}

/**
 * 팔로우 리스트 아이템
 * - 버튼 상태 및 섹션 분리용 필드 포함
 */
export type FollowListUser = {
  id: number;
  username: string;
  avatar: string | null;

  /** 버튼(토글) 상태 SSOT: viewer -> rowUser */
  isFollowedByViewer: boolean;

  /**
   * 섹션 분리용 SSOT: owner 기준 맞팔 여부
   * (followers: owner->row, following: row->owner)
   */
  isMutualWithOwner: boolean;
};

/** 팔로우 리스트 커서 */
export type FollowListCursor = { lastId: number } | null;

/** 프로필 리뷰 아이템 */
export interface ProfileReview {
  id: number;
  rate: number;
  payload?: string | null;
  created_at: Date;
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
  product: {
    id: number;
    title: string;
  };
}

/** 리뷰 리스트 커서 */
export type ReviewCursor = { lastCreatedAt: Date; lastId: number } | null;

/** 유저 평점 요약 */
export interface ProfileAverageRating {
  averageRating: number; // 0~5
  reviewCount: number;
}

/** 뱃지 정보 */
export type Badge = {
  id: number;
  name: string;
  icon: string;
  description: string;
};

/** 프로필 편집용 현재 유저 정보 */
export type CurrentUserForEdit = {
  id: number;
  username: string;
  email: string | null;
  avatar: string | null;
  phone: string | null;
  github_id: string | null;
  kakao_id: string | null;
  created_at: Date;
  updated_at: Date;
  emailVerified: boolean;
  needsEmailSetup: boolean;
  needsPasswordSetup: boolean;
};

/** 관리자용 유저 리스트 아이템 타입 */
export type AdminUserItem = {
  id: number;
  username: string;
  email: string | null;
  avatar: string | null;
  role: Role;
  bannedAt: Date | null;
  created_at: Date;
  _count: {
    posts: number;
    products: number;
    reports_received: number;
  };
};

/** 관리자용 유저 리스트 응답 타입 */
export type AdminUserListResponse = {
  items: AdminUserItem[];
  total: number;
  totalPages: number;
  currentPage: number;
};

// =============================================================================
// 2. Action / Form State Types
// =============================================================================

export type EditProfileActionState = {
  success: boolean;
  errors?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

export type ChangePasswordActionState = {
  success: boolean;
  errors?: {
    currentPassword?: string[];
    password?: string[];
    confirmPassword?: string[];
    _?: string[]; // 전역 에러
  };
};
