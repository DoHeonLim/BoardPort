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
 * 2026.03.11  임도헌   Modified  무한스크롤 목록에서도 전체 검색 결과 수를 고정 표시할 수 있도록 totalCount 필드 추가
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 여부 저장을 위한 메타 필드 추가
 * 2026.03.26  임도헌   Modified  찜 목록 전용 liked_at 타입과 카드 활동 시점 prop 타입 추가
 * 2026.05.03  임도헌   Modified  프로필 구매 목록에서도 연결 보드게임 배지를 표시할 수 있도록 타입 확장
 * 2026.03.26  임도헌   Modified  ProductCard에 찜 목록 전용 빠른 해제 UI prop 추가
 * 2026.04.02  임도헌   Modified  ProductFormResponse union 정리와 상태 타입 일관성 보강
 * 2026.04.02  임도헌   Modified  검색 기록/인기 검색 타입을 search 도메인 공용 타입으로 이동
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상태(hidden_at) 지원을 위해 상세/목록 타입 필드 확장
 * 2026.04.13  임도헌   Modified  ProductCard returnTo를 상위 리스트에서 주입할 수 있도록 prop 확장
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 DTO 및 상세 타입 추가
 * 2026.05.03  임도헌   Modified  상품 목록 카드에서 연결 보드게임 요약을 표시할 수 있도록 목록 타입 확장
 * 2026.05.18  임도헌   Modified  상품 목록 카드 하트 색상 기준 분리를 위한 isLiked 필드 추가
 * 2026.05.08  임도헌   Modified  프로필/마이페이지 제품 목록 조회 범위 타입을 product types로 이동
 * 2026.06.17  임도헌   Modified  찜 목록 빠른 해제의 좋아요 캐시 분리를 위한 ProductCard viewerId prop 추가
 * 2026.06.18  임도헌   Modified  상품 거래 기준 지역 필수화에 맞춰 ProductDTO location을 필수값으로 정리
 * 2026.08.27  임도헌   Modified  상세 상품의 실제 노출 기준 시각을 최근 본 상품 스냅샷까지 보존하도록 refreshed_at 계약 명시
 */

import {
  COMPLETENESS_TYPES,
  CONDITION_TYPES,
  GAME_TYPES,
} from "@/features/product/constants";
import type { ProductReview } from "@/features/review/types";
import { LocationData } from "@/features/map/types";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

// =============================================================================
// 1. Utility Types
// =============================================================================
/** 날짜 직렬화 호환 타입 */
export type ISODate = Date | string | null;
/** 상품 판매 상태 */
export type ProductStatus = "selling" | "reserved" | "sold";

/**
 * 유저 제품 목록 조회 범위
 * - SELLING: 판매 중
 * - RESERVED: 예약 중
 * - SOLD: 판매 완료
 * - PURCHASED: 구매 내역
 * - LIKED: 좋아요 내역
 */
export type UserProductsScope =
  | { type: "SELLING"; userId: number }
  | { type: "RESERVED"; userId: number }
  | { type: "SOLD"; userId: number }
  | { type: "PURCHASED"; userId: number }
  | { type: "LIKED"; userId: number };

// =============================================================================
// 2. Data Transfer Objects (DTO) - 요청/응답 데이터
// =============================================================================

/** 제품 생성/수정 요청 DTO */
export interface ProductDTO {
  title: string;
  description: string;
  price: number;
  photos: string[]; // URLs
  photosAnimated?: boolean[];
  tags: string[];
  game_type: (typeof GAME_TYPES)[number];
  min_players: number;
  max_players: number;
  play_time: string;
  condition: (typeof CONDITION_TYPES)[number];
  completeness: (typeof COMPLETENESS_TYPES)[number];
  has_manual: boolean;
  categoryId: number;
  location: LocationData;
  boardGameIds?: number[];
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

/** 상품 목록 필터 상태 */
export type FilterState = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  game_type?: string;
  condition?: string;
};

/** 상품 폼 필드 에러 맵 */
export type ProductFormFieldErrors<FieldKey extends string = string> = Partial<
  Record<FieldKey, string[]>
>;

/** 폼 Action 성공 응답 */
export type ProductFormSuccess = {
  success: true;
  productId: number;
  error?: never;
  fieldErrors?: never;
};

/** 폼 Action 실패 응답 */
export type ProductFormFailure<FieldKey extends string = string> = {
  success: false;
  productId?: never;
  error?: string;
  fieldErrors?: ProductFormFieldErrors<FieldKey>;
};

/** 폼 Action 응답 */
export type ProductFormResponse<FieldKey extends string = string> =
  ProductFormSuccess | ProductFormFailure<FieldKey>;

/** 상품 폼 서버 액션 시그니처 */
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
  newStatus: ProductStatus;
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
  totalCount?: number;
}

/** 프로필 탭별 카운트 */
export type TabCounts = Record<ProductStatus, number>;

// =============================================================================
// 4. Entity / Model Types - DB 모델 및 하위 필드
// =============================================================================

/** 게임 장르 타입 */
export type GameType = (typeof GAME_TYPES)[number];
/** 상품 상태 타입 */
export type ConditionType = (typeof CONDITION_TYPES)[number];
/** 구성품 상태 타입 */
export type CompletenessType = (typeof COMPLETENESS_TYPES)[number];

/** 상품 이미지 정보 */
export interface ProductImage {
  url: string;
  order?: number;
  isAnimated?: boolean;
}

/** 상품 검색 태그 정보 */
export interface ProductTag {
  name: string;
}

/** 프로필 목록용 사용자 요약 정보 */
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
  hidden_at?: ISODate;
  board_games?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
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
  refreshed_at: Date;
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
  board_games?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
}

/**
 * 목록 조회용 제품 타입 (리스트/카드용)
 */
export interface ProductType extends BaseProduct {
  created_at: ISODate;
  refreshed_at?: ISODate;
  hidden_at?: ISODate;
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
  isLiked?: boolean;
  board_games?: Array<{
    boardGame: BoardGameRelationOption;
  }>;
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
  | "id"
  | "title"
  | "price"
  | "images"
  | "purchase_userId"
  | "game_type"
  | "category"
  | "views"
  | "_count"
  | "board_games"
> {
  purchased_at: ISODate;
  user: ProfileUserLite; // 판매자 정보
  reviews: ProductReview[];
}

/**
 * 프로필: '나의 찜한 제품' 리스트 아이템용
 */
export interface LikedProductListItem extends ProductType {
  liked_at: ISODate;
}

// =============================================================================
// 5. UI Component Props
// =============================================================================

/** 상품 카드 표시 방식 */
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
  product: ProductType | LikedProductListItem;
  viewMode: ViewMode;
  isPriority: boolean;
  returnTo?: string;
  showQuickUnlike?: boolean;
  viewerId?: number | null;
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
