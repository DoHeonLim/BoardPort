/**
 * File Name : features/product/types.ts
 * Description : 제품 도메인 타입 정의 (DTO, ServiceResult 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created
 * 2026.01.20  임도헌   Modified  ServiceResult 및 DTO 타입 추가, 상속 구조 개선
 * 2026.01.24  임도헌   Moved     types/product.ts -> features/product/types.ts
 * 2026.01.25  임도헌   Modified  주석 표준화 및 역할별 그룹핑
 * 2026.02.03  임도헌   Modified  ProductType에 refreshed_at, bump_count 필드 추가
 * 2026.02.07  임도헌   Modified  관리자용 DTO (AdminProductItem, AdminProductListResponse) 추가
 * 2026.02.14  임도헌   Modified  location 속성 추가
 * 2026.02.15  임도헌   Modified  ProductType 및 리스트 아이템에 region 정보 타입 추가
 * 2026.03.07  임도헌   Modified  타입 섹션 제목 및 히스토리 오탈자 정리
 */

import {
  COMPLETENESS_TYPES,
  CONDITION_TYPES,
  GAME_TYPES,
} from "@/features/product/constants";
import type { ProductReview } from "@/features/review/types";
import { LocationData } from "@/features/map/types";

// =============================================================================
// 1. Utility Types
// =============================================================================
export type ISODate = Date | string | null;

// =============================================================================
// 2. Data Transfer Objects (DTO) - 요청/응답 데이터
// =============================================================================

/** 제품 생성/수정 요청 DTO */
export interface ProductDTO {
  title: string;
  description: string;
  price: number;
  photos: string[]; // URLs
  tags: string[];
  game_type: (typeof GAME_TYPES)[number];
  min_players: number;
  max_players: number;
  play_time: string;
  condition: (typeof CONDITION_TYPES)[number];
  completeness: (typeof COMPLETENESS_TYPES)[number];
  has_manual: boolean;
  categoryId: number;
  location?: LocationData | null;
}

/** 제품 검색 파라미터 */
export interface ProductSearchParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  game_type?: string;
  condition?: string;
  take?: number;
  skip?: number;
}

export type FilterState = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  game_type?: string;
  condition?: string;
};

/** 폼 Action 응답 */
export interface ProductFormResponse {
  success: boolean;
  productId?: number;
  error?: string;
  fieldErrors?: {
    [key: string]: string[];
  };
}

/** 제품 폼 서버 액션 타입 */
export type ProductFormAction = (
  formData: FormData
) => Promise<ProductFormResponse>;

// =============================================================================
// 3. Service Layer Types - 비즈니스 로직 결과
// =============================================================================

/** 제품 삭제 메타데이터 (캐시 무효화용) */
export interface ProductDeleteMeta {
  id: number;
  userId: number;
  purchase_userId: number | null;
  reservation_userId: number | null;
  chatUserIds: number[];
}

/** 상태 변경 메타데이터 (캐시 무효화용) */
export interface ProductStatusMeta {
  productId: number;
  sellerId: number;
  buyerId?: number | null; // 구매자 or 예약자
  newStatus: "selling" | "reserved" | "sold";
}

/** 좋아요 토글 결과 */
export interface ProductLikeResult {
  isLiked: boolean;
  likeCount: number;
}

/** 제네릭 페이지네이션 결과 */
export interface Paginated<T> {
  products: T[];
  nextCursor: number | null;
}

/** 프로필 탭별 카운트 */
export type TabCounts = { selling: number; reserved: number; sold: number };

// =============================================================================
// 4. Entity / Model Types - DB 모델 및 하위 필드
// =============================================================================

export type ProductStatus = "selling" | "reserved" | "sold";
export type GameType = (typeof GAME_TYPES)[number];
export type ConditionType = (typeof CONDITION_TYPES)[number];
export type CompletenessType = (typeof COMPLETENESS_TYPES)[number];

export interface ProductImage {
  url: string;
  order?: number;
}

export interface ProductTag {
  name: string;
}

export interface ProfileUserLite {
  username: string;
  avatar: string | null;
}

/** 공통 제품 베이스 (DB 모델 공통 필드) */
export interface BaseProduct {
  id: number;
  title: string;
  price: number;
  game_type: GameType | string;
  images: ProductImage[];
  search_tags: ProductTag[];
}

/** 상세 정보 포함 (DB 기반) */
export interface ProductFullDetails extends BaseProduct {
  description: string;
  min_players: number;
  max_players: number;
  play_time: string;
  condition: ConditionType;
  completeness: CompletenessType;
  has_manual: boolean;
  categoryId: number;
  userId: number;
  // 위치 정보 필드
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
}

/**
 * 상세 조회 결과 (User Join 포함)
 * - features/product/service/detail.ts 반환값
 */
export interface ProductDetailType extends ProductFullDetails {
  user: {
    id: number;
    avatar: string | null;
    username: string;
  };
  created_at: Date;
  reservation_userId: number | null;
  purchase_userId: number | null;
  views: number;
  bump_count: number;
  category: {
    eng_name: string;
    kor_name: string;
    icon: string | null;
    parent?: {
      eng_name: string;
      kor_name: string;
      icon: string | null;
    } | null;
  };
  _count: {
    product_likes: number;
  };
}

/**
 * 목록 조회용 제품 타입 (리스트/카드용)
 */
export interface ProductType extends BaseProduct {
  created_at: ISODate;
  refreshed_at?: ISODate;
  reservation_userId: number | null;
  purchase_userId: number | null;
  views: number;
  bump_count: number;
  region1: string | null;
  region2: string | null;
  region3: string | null;
  category: {
    kor_name: string;
    icon: string | null;
    parent?: {
      kor_name: string;
      icon: string | null;
    } | null;
  };
  _count: {
    product_likes: number;
  };
}

/**
 * 프로필: '나의 판매 제품' 리스트 아이템용
 */
export interface MySalesListItem extends ProductType {
  reservation_at?: ISODate | null;
  purchased_at?: ISODate | null;
  reservation_user?: ProfileUserLite | null;
  purchase_user?: ProfileUserLite | null;

  min_players?: number | null;
  max_players?: number | null;
  play_time?: string | null;
  condition?: string | null;
  completeness?: string | null;

  reviews?: ProductReview[];
  user?: ProfileUserLite; // 판매자 정보
}

/**
 * 프로필: '나의 구매 제품' 리스트 아이템용
 */
export interface MyPurchasedListItem extends Pick<
  ProductType,
  "id" | "title" | "price" | "images" | "purchase_userId"
> {
  purchased_at: ISODate;
  user: ProfileUserLite; // 판매자 정보
  reviews: ProductReview[];
}

/** 검색 기록 아이템 */
export interface SearchHistoryItem {
  keyword: string;
  created_at: Date;
}

/** 인기 검색어 아이템 */
export interface PopularSearchItem {
  keyword: string;
  count: number;
}

// =============================================================================
// 5. UI Component Props
// =============================================================================

export type ViewMode = "grid" | "list";

/** 제품 상세 페이지 UI 데이터 (View Data) */
export interface ProductDetailData {
  product: ProductDetailType;
  views: number;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

/** 제품 카드 컴포넌트 Props */
export interface ProductCardProps {
  product: ProductType;
  viewMode: ViewMode;
  isPriority: boolean;
}

// =============================================================================
// 6. Admin Types
// =============================================================================

/** 관리자 상품 목록 아이템 */
export interface AdminProductItem {
  id: number;
  title: string;
  price: number;
  created_at: Date;
  reservation_userId: number | null;
  purchase_userId: number | null;
  user: {
    id: number;
    username: string;
  };
}

/** 관리자 상품 목록 응답 */
export interface AdminProductListResponse {
  items: AdminProductItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}
