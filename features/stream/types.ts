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
 * 2026.03.12  임도헌   Modified  스트림 썸네일 애니메이션 메타(thumbnailAnimated) 필드 추가
 * 2026.04.02  임도헌   Modified  스트림 공용 타입/헬퍼 설명 보강
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 채팅 메시지 삭제 결과 타입과 placeholder 상태를 추가
 * 2026.04.03  임도헌   Modified  스트림 호스트 전용 강제 퇴장 결과 타입 추가
 * 2026.04.03  임도헌   Modified  스트림 호스트 전용 채팅 금지 토글 결과 타입 추가
 * 2026.04.03  임도헌   Modified  스트림 호스트 전용 고정 공지 수정 결과 타입 추가
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

/** 방송 상세에서의 조회자 역할 */
export type ViewerRole = "OWNER" | "FOLLOWER" | "VISITOR";

/** 방송 공개 범위 타입 */
export type StreamVisibility =
  (typeof STREAM_VISIBILITY)[keyof typeof STREAM_VISIBILITY];

/** 방송 상태 타입 */
export type StreamStatus =
  | (typeof STREAM_STATUS)[keyof typeof STREAM_STATUS]
  | string;

/** VOD 상태 타입 */
export type VodStatus = (typeof VOD_STATUS)[keyof typeof VOD_STATUS];

// =============================================================================
// 2. Summary / Info Types
// =============================================================================

/** 사용자 요약 정보 */
export interface UserSummary {
  id: number;
  username: string;
  avatar?: string | null;
}

/** 방송 카테고리 정보 */
export interface StreamCategory {
  id?: number;
  kor_name: string;
  icon?: string | null;
}

/** 방송 태그 정보 */
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
  thumbnailAnimated?: boolean;
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
  thumbnailAnimated?: boolean;
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

/** 채널 화면 스트림 모드 */
export type StreamMode = "live" | "recordings";
/** 다시보기 정렬 방식 */
export type RecordingSort = "latest" | "popular";

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

/** 방송 생성 액션/서비스 결과 */
export type CreateBroadcastResult =
  | {
      success: true;
      liveInputId: number; // 생성/재사용된 LiveInput PK
      broadcastId: number; // 생성된 Broadcast PK
      rtmpUrl: string; // OBS 입력용
      streamKey: string; // OBS 입력용
    }
  | (ServiceFailure & { fieldErrors?: Record<string, string[]> });

/** 비공개 방송 접근 실패 코드 */
export type UnlockErrorCode =
  | "NOT_LOGGED_IN"
  | "STREAM_NOT_FOUND"
  | "NOT_PRIVATE_STREAM"
  | "NO_PASSWORD_SET"
  | "INVALID_PASSWORD"
  | "BAD_REQUEST"
  | "MISSING_PASSWORD"
  | "INTERNAL_ERROR";

/** 비공개 방송 잠금 해제 결과 */
export type UnlockResult =
  | { success: true }
  | { success: false; error: UnlockErrorCode };

/** 방송 채팅 메시지 전송 결과 */
export type SendStreamMessageResult =
  | { success: true; message: StreamChatMessage }
  | {
      success: false;
      error:
        | "NOT_LOGGED_IN"
        | "EMPTY_MESSAGE"
        | "MESSAGE_TOO_LONG"
        | "MUTED"
        | "RATE_LIMITED"
        | "CREATE_FAILED";
    };

/** 방송 채팅 메시지 삭제 결과 */
export type DeleteStreamMessageResult =
  | { success: true; messageId: number; deleted_at: string }
  | {
      success: false;
      error: "NOT_LOGGED_IN" | "FORBIDDEN" | "NOT_FOUND" | "DELETE_FAILED";
    };

/** 스트림 호스트 전용 시청자 강제 퇴장 결과 */
export type KickStreamViewerResult =
  | { success: true; targetId: number }
  | {
      success: false;
      error: "NOT_LOGGED_IN" | "FORBIDDEN" | "NOT_FOUND" | "KICK_FAILED";
    };

/** 스트림 호스트 전용 채팅 금지 토글 결과 */
export type ToggleStreamChatMuteResult =
  | { success: true; targetId: number; muted: boolean }
  | {
      success: false;
      error:
        | "NOT_LOGGED_IN"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "MUTE_FAILED";
    };

/** 방송 단위 채팅 금지 대상 시청자 요약 */
export type MutedStreamViewer = UserSummary;

/** 방송 단위 채팅 금지 대상 목록 조회 결과 */
export type GetMutedStreamViewerListResult =
  | { success: true; viewers: MutedStreamViewer[] }
  | {
      success: false;
      error: "NOT_LOGGED_IN" | "FORBIDDEN" | "NOT_FOUND" | "FETCH_FAILED";
    };

/** 스트림 호스트 전용 고정 공지 등록/수정/해제 결과 */
export type UpdatePinnedChatNoticeResult =
  | { success: true; notice: string | null }
  | {
      success: false;
      error:
        | "NOT_LOGGED_IN"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "NOTICE_TOO_LONG"
        | "UPDATE_FAILED";
    };

/** 송출 키 조회 결과 */
export type GetStreamKeyResult =
  | { success: true; rtmpUrl: string; streamKey: string }
  | { success: false; error: "NOT_LOGGED_IN" | "NOT_FOUND" | "FORBIDDEN" };

/** 송출 키 재발급 결과 */
export type RotateLiveInputKeyResult =
  | { success: true; rtmpUrl: string; streamKey: string }
  | ServiceFailure;

// =============================================================================
// 4. Utils / Helpers
// =============================================================================

/** 잠금 해제 실패 코드별 사용자 메시지 */
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

/** 비공개 방송 여부 판별 */
export const isPrivateVisibility = (v: StreamVisibility) =>
  v === STREAM_VISIBILITY.PRIVATE;

/** 팔로워 전용 방송 여부 판별 */
export const isFollowersVisibility = (v: StreamVisibility) =>
  v === STREAM_VISIBILITY.FOLLOWERS;

/** 시청 가능한 준비 완료 VOD 여부 판별 */
export const isVodReady = (s: VodStatus) => s === VOD_STATUS.READY;

// =============================================================================
// 5. Admin Types
// =============================================================================

/** 관리자 목록용 방송 요약 정보 */
export interface AdminStreamItem {
  id: number;
  title: string;
  thumbnail: string | null;
  thumbnailAnimated?: boolean;
  status: string;
  started_at: Date | null;
  user: {
    id: number;
    username: string;
  };
  _count: {
    vodAssets: number; // 녹화본 수 (참고용)
  };
}

/** 관리자 방송 목록 응답 */
export interface AdminStreamListResponse {
  items: AdminStreamItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/** 관리자 방송 인사이트 응답 */
export interface AdminStreamInsights {
  labels: string[];
  startsSeries: {
    name: string;
    color: string;
    values: number[];
  }[];
  categorySlices: {
    label: string;
    value: number;
    color: string;
  }[];
  summary: {
    liveCount: number;
    startedLast24Hours: number;
    endedLast24Hours: number;
    averageBroadcastHours: number;
  };
}

