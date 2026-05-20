/**
 * File Name : features/post/types.ts
 * Description : 게시글 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   PostItem, PostDetail 타입 정의
 * 2026.01.22  임도헌   Modified  타입 정의 구체화 (Prisma 호환)
 * 2026.01.25  임도헌   Modified  ServiceResult 추가
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.07  임도헌   Modified  관리자용 DTO (AdminPostItem, AdminPostListResponse) 추가
 * 2026.02.14  임도헌   Modified  location 속성 추가
 * 2026.02.15  임도헌   Modified  POST_SELECT 기반 Type SSOT 적용
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 여부 저장용 메타 필드 추가
 * 2026.03.30  임도헌   Modified  게시글 동영상 첨부 1차 도입 대비 PostVideo 타입 및 DTO 초안 추가
 * 2026.03.30  임도헌   Modified  videoDraftKey/removeVideo 기반의 게시글 동영상 초안 연결 필드 추가
 * 2026.03.30  임도헌   Modified  본문/미디어 블록 2차 확장용 PostBlock 타입 초안 추가
 * 2026.03.30  임도헌   Modified  저장 전 가벼운 블록 편집기용 PostEditorBlock 타입 및 DTO 필드 추가
 * 2026.03.31  임도헌   Modified  유튜브 전용 EMBED 블록 저장용 편집기 필드 추가
 * 2026.04.02  임도헌   Modified  PostActionResponse를 success/failure union으로 정리
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 DTO 및 상세 타입 추가
 * 2026.05.03  임도헌   Modified  게시글 목록 카드에서 연결 보드게임 요약을 표시할 수 있도록 타입 설명 보강
 * 2026.05.18  임도헌   Modified  게시글 목록 카드 하트 색상 기준 분리를 위한 isLiked 필드 추가
 */

import { LocationData } from "@/features/map/types";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

// =============================================================================
// 1. Data Transfer Objects (DTO) - 요청/응답 데이터
// =============================================================================

/** 게시글 액션 필드 에러 맵 */
export type PostFieldErrors<K extends string = string> = Partial<
  Record<K, string[]>
>;

/** Action 성공 응답 타입 */
export type PostActionSuccessResponse = {
  success: true;
  postId: number;
};

/** Action 실패 응답 타입 */
export type PostActionFailureResponse<K extends string = string> = {
  success: false;
  error?: string;
  fieldErrors?: PostFieldErrors<K>;
};

/** Action 응답 타입 */
export type PostActionResponse<K extends string = string> =
  | PostActionSuccessResponse
  | PostActionFailureResponse<K>;

/** 게시글 검색 파라미터 */
export interface PostSearchParams {
  keyword?: string;
  category?: string;
}

/** 게시글 생성 DTO */
export interface PostCreateDTO {
  title: string;
  description: string;
  category: string;
  tags: string[];
  photos: string[];
  photosAnimated?: boolean[];
  location?: LocationData | null;
  videoDraftKey?: string | null;
  removeVideo?: boolean;
  blocks?: PostEditorBlock[];
  boardGameIds?: number[];
}

/** 게시글 수정 DTO */
export interface PostUpdateDTO extends PostCreateDTO {
  id: number;
}

/** 게시글 목록 페이지네이션 결과 */
export interface PostsPage {
  posts: PostDetail[];
  nextCursor: number | null;
  totalCount?: number;
}

// =============================================================================
// 2. Entity / Model Types - DB 모델 및 하위 필드
// =============================================================================

/** 게시글 이미지 정보 */
export interface PostImage {
  id?: number;
  url: string;
  order?: number;
  isAnimated?: boolean;
}

/** 게시글 태그 정보 */
export interface PostTag {
  name: string;
}

/** 게시글 동영상 처리 상태 */
export type PostVideoStatus =
  | "UPLOADING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

/** 저장된 게시글 본문 블록 타입 */
export type PostBlockType = "TEXT" | "IMAGE" | "VIDEO" | "EMBED";
/** 편집기에서 사용하는 게시글 블록 타입 */
export type PostEditorBlockType = "TEXT" | "IMAGE" | "VIDEO" | "EMBED";

/** 게시글 첨부 동영상 정보 */
export interface PostVideo {
  id?: number;
  provider: "CLOUDFLARE_STREAM";
  providerAssetId?: string | null;
  uploadUid?: string | null;
  draftKey?: string | null;
  status: PostVideoStatus;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
}

/** 저장된 게시글 본문 블록 정보 */
export interface PostBlock {
  id?: number;
  type: PostBlockType;
  order: number;
  textContent?: string | null;
  embedProvider?: string | null;
  embedUrl?: string | null;
  embedTitle?: string | null;
  embedThumbnailUrl?: string | null;
  postImage?: PostImage | null;
  postVideo?: PostVideo | null;
}

/** 저장 전 편집기 블록 정보 */
export interface PostEditorBlock {
  id: string;
  type: PostEditorBlockType;
  textContent?: string;
  embedProvider?: string;
  embedUrl?: string;
  embedTitle?: string;
  embedThumbnailUrl?: string;
}

/** 기본 게시글 정보 */
export interface BasePost {
  id: number;
  title: string;
  description: string | null;
  category: string;
  created_at: Date | string;
}

/** 게시글 상세 정보 (작성자, 태그, 이미지, 카운트 포함) */
export interface PostDetail extends BasePost {
  user: {
    id: number;
    username: string;
    avatar: string | null;
  };
  updated_at: Date | string;
  views: number;
  tags: PostTag[];
  images: PostImage[];
  video?: PostVideo | null;
  blocks?: PostBlock[];
  // 위치 정보 필드
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
  board_games?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
  isLiked?: boolean;
  _count: {
    post_likes: number;
    comments: number;
  };
}

/** 댓글 정보 */
export interface PostComment {
  id: number;
  payload: string;
  created_at: Date | string;
  userId: number;
  user: {
    username: string;
    avatar: string | null;
  };
}

// =============================================================================
// 3. UI Component Props
// =============================================================================

/** 게시글 카드 컴포넌트 Props */
export interface PostCardProps {
  post: PostDetail;
  viewMode: "list" | "grid";
  isPriority?: boolean;
}

// =============================================================================
// 4. Admin Types
// =============================================================================

/** 관리자 목록용 게시글 요약 정보 */
export interface AdminPostItem {
  id: number;
  title: string;
  category: string;
  views: number;
  created_at: Date;
  user: {
    id: number;
    username: string;
  };
}

/** 관리자 게시글 목록 응답 */
export interface AdminPostListResponse {
  items: AdminPostItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

// =============================================================================
// 5. Post Video Draft Types
// =============================================================================

/** 동영상 업로드 세션 생성 요청 데이터 */
export interface CreatePostVideoUploadDTO {
  filename: string;
  contentType: string;
  size: number;
}

/** 동영상 업로드 세션 정보 */
export interface PostVideoUploadSession {
  uploadUrl: string;
  uploadUid: string;
  draftKey: string;
}

/** 동영상 업로드 세션 액션 응답 */
export type PostVideoUploadActionResponse =
  | { success: true; data: PostVideoUploadSession }
  | { success: false; error: string };
