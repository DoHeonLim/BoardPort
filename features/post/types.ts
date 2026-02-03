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
 */

// =============================================================================
// 1. Data Transfer Objects (DTO) - 요청/응답 데이터
// =============================================================================

/** Action 응답 타입 */
export type PostActionResponse = {
  success: boolean;
  postId?: number;
  error?: string;
};

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
}

/** 게시글 수정 DTO */
export interface PostUpdateDTO extends PostCreateDTO {
  id: number;
}

/** 게시글 목록 페이지네이션 결과 */
export interface PostsPage {
  posts: PostDetail[];
  nextCursor: number | null;
}

// =============================================================================
// 2. Entity / Model Types - DB 모델 및 하위 필드
// =============================================================================

export interface PostImage {
  id?: number;
  url: string;
  order?: number;
}

export interface PostTag {
  name: string;
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
