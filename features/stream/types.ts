/**
 * File Name : features/stream/types.ts
 * Description : 스트리밍/방송(Broadcast) + 녹화(VOD) 공용 타입
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.03  임도헌   Created
 * 2025.08.07  임도헌   Modified  녹화본 타입 정의
 * 2025.09.22  임도헌   Modified  라이브/방송/녹화 타입 슬림화 + VOD 전환
 * 2025.11.26  임도헌   Modified  BroadCastSummary에 vodIdForRecording 추가
 * 2026.01.23  임도헌   Modified  SendStreamMessageResult 타입 추가
 * 2026.01.25  임도헌   Modified  Unused types removed (BroadcastCard), VodForGrid에 tags 추가
 * 2026.01.28  임도헌   Modified  주석 및 타입 정리
 * 2026.02.07  임도헌   Modified  관리자용 DTO 추가
 * 2026.03.07  임도헌   Modified  결과 타입 정리 및 중복 VodForPage 선언 제거
 */

import { StreamChatMessage } from "@/features/chat/types";
import type { ServiceFailure } from "@/lib/types";
import {
  STREAM_VISIBILITY,
  STREAM_STATUS,
  VOD_STATUS,
} from "@/features/stream/constants";

// =============================================================================
// 1. Primitive Types
// =============================================================================

export type ViewerRole = "OWNER" | "FOLLOWER" | "VISITOR";

export type StreamVisibility =
  (typeof STREAM_VISIBILITY)[keyof typeof STREAM_VISIBILITY];

export type StreamStatus =
  | (typeof STREAM_STATUS)[keyof typeof STREAM_STATUS]
  | string;

export type VodStatus = (typeof VOD_STATUS)[keyof typeof VOD_STATUS];

// =============================================================================
// 2. Summary / Info Types
// =============================================================================

export interface UserSummary {
  id: number;
  username: string;
  avatar?: string | null;
}

export interface StreamCategory {
  id?: number;
  kor_name: string;
  icon?: string | null;
}

export interface StreamTag {
  id?: number;
  name: string;
}

/** 팔로우 모달 등에서 쓰는 확장 요약 */
export interface UserInfo extends UserSummary {
  _count?: { followers: number; following: number };
  followers?: { follower: UserSummary }[];
  following?: { following: UserSummary }[];
  isFollowing?: boolean;
}

/**
 * 방송 요약 (BroadcastSummary)
 * - 리스트/그리드/상세 헤더에서 공통으로 소비하는 가벼운 DTO
 */
export interface BroadcastSummary {
  id: number; //Broadcast PK
  latestVodId?: number | null; // 가장 최근 VodAsset id
  stream_id: string; // Cloudflare Live Input UID (iframe/임베드 식별자)
  title: string;
  thumbnail: string | null;
  isLive?: boolean;
  status: StreamStatus;
  visibility: StreamVisibility;
  started_at: Date | null;
  ended_at: Date | null;
  user: UserSummary;
  category?: StreamCategory | null;
  tags?: StreamTag[];
  /** 접근성/UI 보조 플래그(서버에서 계산해 전달 가능) */
  requiresPassword?: boolean; // PRIVATE 이면서 비번 설정됨
  followersOnlyLocked?: boolean; // FOLLOWERS 이지만 뷰어가 팔로워가 아님
}

/**
 * 녹화본 요약 (VodForGrid)
 * - 그리드 뷰에서 사용하는 VOD 정보
 */
export interface VodForGrid {
  vodId: number; // VodAsset PK
  broadcastId: number; // 부모 Broadcast PK — unlock/check 용
  title: string;
  thumbnail: string | null;
  visibility: StreamVisibility;
  user: UserSummary;
  href?: string; // 상세 이동 경로 (없으면 /streams/:vodId/recording 폴백)
  readyAt: Date | null;
  duration?: number;
  viewCount?: number;
  category?: StreamCategory | null;
  tags?: StreamTag[];
  requiresPassword?: boolean; // 접근 보조 플래그(있으면 우선)
  followersOnlyLocked?: boolean;
}

/** VOD 상세 페이지에서 사용할 수 있는 넉넉한 DTO */
export interface VodForPage extends VodForGrid {
  broadcastStatus?: StreamStatus; // 방송 상태(부모) — 삭제/버튼 표시 분기 등에 유용
  description?: string | null; // 추가 메타(원하면 확장)
}

/** 댓글 타입 */
export interface StreamComment {
  id: number;
  user: UserSummary;
  payload: string;
  created_at: Date;
}

// =============================================================================
// 3. Action / Service Result Types
// =============================================================================

export type CreateBroadcastResult =
  | {
      success: true;
      liveInputId: number; // 생성/재사용된 LiveInput PK
      broadcastId: number; // 생성된 Broadcast PK
      rtmpUrl: string; // OBS 입력용
      streamKey: string; // OBS 입력용
    }
  | ServiceFailure;

export type UnlockErrorCode =
  | "NOT_LOGGED_IN"
  | "STREAM_NOT_FOUND"
  | "NOT_PRIVATE_STREAM"
  | "NO_PASSWORD_SET"
  | "INVALID_PASSWORD"
  | "BAD_REQUEST"
  | "MISSING_PASSWORD"
  | "INTERNAL_ERROR";

export type UnlockResult =
  | { success: true }
  | { success: false; error: UnlockErrorCode };

export type SendStreamMessageResult =
  | { success: true; message: StreamChatMessage }
  | {
      success: false;
      error:
        | "NOT_LOGGED_IN"
        | "EMPTY_MESSAGE"
        | "MESSAGE_TOO_LONG"
        | "RATE_LIMITED"
        | "CREATE_FAILED";
    };

export type GetStreamKeyResult =
  | { success: true; rtmpUrl: string; streamKey: string }
  | { success: false; error: "NOT_LOGGED_IN" | "NOT_FOUND" | "FORBIDDEN" };

export type RotateLiveInputKeyResult =
  | { success: true; rtmpUrl: string; streamKey: string }
  | ServiceFailure;

// =============================================================================
// 4. Utils / Helpers
// =============================================================================

export const unlockErrorMessage: Record<UnlockErrorCode, string> = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  STREAM_NOT_FOUND: "스트림을 찾을 수 없습니다.",
  NOT_PRIVATE_STREAM: "비공개 스트림이 아닙니다.",
  NO_PASSWORD_SET: "비밀번호가 설정되지 않았습니다.",
  INVALID_PASSWORD: "비밀번호가 올바르지 않습니다.",
  BAD_REQUEST: "요청이 올바르지 않습니다.",
  MISSING_PASSWORD: "비밀번호를 입력해주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

export const isPrivateVisibility = (v: StreamVisibility) =>
  v === STREAM_VISIBILITY.PRIVATE;

export const isFollowersVisibility = (v: StreamVisibility) =>
  v === STREAM_VISIBILITY.FOLLOWERS;

export const isVodReady = (s: VodStatus) => s === VOD_STATUS.READY;

// =============================================================================
// 5. Admin Types
// =============================================================================

export interface AdminStreamItem {
  id: number;
  title: string;
  thumbnail: string | null;
  status: string;
  started_at: Date | null;
  user: {
    username: string;
  };
  _count: {
    vodAssets: number; // 녹화본 수 (참고용)
  };
}

export interface AdminStreamListResponse {
  items: AdminStreamItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}
