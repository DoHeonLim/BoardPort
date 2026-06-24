/**
 * File Name : features/product/service/list.ts
 * Description : 제품 목록 조회 및 검색 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   목록/검색 로직 통합 및 Service 패턴 적용
 * 2026.01.20  임도헌   Merged    lib/queries.ts (검색 쿼리 빌더) 통합
 * 2026.02.03  임도헌   Modified  목록 정렬 기준을 created_at -> refreshed_at으로 변경 (끌어올리기 반영)
 * 2026.02.04  임도헌   Modified  getBlockedUserIds로 차단된 유저 필터링 로직 추가
 * 2026.02.15  임도헌   Modified  내 동네(Local-First) 필터링 로직 구현
 * 2026.02.20  임도헌   Modified  주석 최신화 및 JSDoc 적용
 * 2026.02.22  임도헌   Modified  정지된 유저(Banned)의 상품 완벽 은닉
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 및 파편화된 페이징 로직 제거, 단일 함수(getProductsList)로 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.11  임도헌   Modified  무한스크롤 중에도 전체 검색 결과 수를 고정 표시할 수 있도록 totalCount 반환 추가
 * 2026.04.04  임도헌   Modified  검색 조건 조립/페이징 계산 단계의 인라인 주석 보강
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상품(hidden_at)은 공개 제품 목록과 검색 결과에서 제외
 * 2026.05.03  임도헌   Modified  상품 카드 표시용 연결 보드게임 locale 매핑 추가
 * 2026.05.12  임도헌   Modified  제품 검색의 제목/본문/태그 조건을 대소문자 무시 기준으로 통일
 * 2026.05.18  임도헌   Modified  목록 카드 하트 색상용 현재 유저 좋아요 여부를 DTO에 포함
 * 2026.05.20  임도헌   Modified  refreshed_at 정렬 주석의 2차 기준을 실제 id 기준으로 정정
 * 2026.05.24  임도헌   Modified  삭제된 상품 cursor로 인한 목록 페이지네이션 실패 방어
 */
import "server-only";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { getBlockedUserIds } from "@/features/user/service/block";
import { PRODUCT_SELECT } from "@/features/product/selects";
import { buildRegionWhere } from "@/features/user/utils/region";
import type {
  ProductSearchParams,
  Paginated,
  ProductType,
} from "@/features/product/types";

const TAKE = PRODUCTS_PAGE_TAKE;

type ProductListRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SELECT;
}>;

/**
 * 목록 카드 DTO에 맞게 공개 보드게임 locale만 평탄화
 *
 * @param row - PRODUCT_SELECT로 조회한 제품 row
 * @returns ProductCard가 바로 사용할 수 있는 제품 목록 DTO
 */
function mapProductListRow(
  row: ProductListRow,
  likedProductIds: Set<number>
): ProductType {
  return {
    ...row,
    isLiked: likedProductIds.has(row.id),
    board_games: row.board_games.flatMap(({ boardGame }) => {
      const { locales, ...linkedBoardGame } = boardGame;
      const locale = locales[0];
      // 공개 한국어 locale이 없는 연결은 카드 노출 대상에서 제외
      if (!locale) return [];
      return [{ boardGame: { ...linkedBoardGame, locale } }];
    }),
  };
}

/**
 * 제품 검색 조건 동적 쿼리 빌더
 *
 * [데이터 가공 전략]
 * - 카테고리 파라미터 유무에 따른 대분류/소분류 조건 분기 구성
 * - 사용자 위치 범위(`regionRange`) 기반의 동네 필터 동적 생성 적용 (특수 행정구역 방어 로직 포함)
 * - 가격 범위, 게임 타입, 상품 상태 필터링 추가
 * - 정지 유저(bannedAt) 콘텐츠의 글로벌 은닉 필터 적용
 *
 * @param {ProductSearchParams} params - 클라이언트 검색 파라미터 (keyword, category 등)
 * @param {number} viewerId - 조회자 ID (DB 지역 설정 조회용)
 * @returns {Promise<Prisma.ProductWhereInput>} 완성된 Prisma Where 조건 객체 반환
 */
async function buildSearchWhere(
  params: ProductSearchParams,
  viewerId: number
): Promise<Prisma.ProductWhereInput> {
  // 카테고리 조건의 동적 시작점
  let categoryCondition: Prisma.ProductWhereInput = {};

  // 카테고리 필터 (대분류/소분류 처리)
  if (params.category) {
    const categoryId = parseInt(params.category);
    if (!isNaN(categoryId)) {
      const selectedCategory = await db.category.findUnique({
        where: { id: categoryId },
        include: { children: { select: { id: true } } },
      });

      if (selectedCategory) {
        if (selectedCategory.parentId === null) {
          // 대분류 선택 시 하위 카테고리까지 포함
          categoryCondition = {
            OR: [
              { categoryId: selectedCategory.id },
              {
                categoryId: {
                  in: selectedCategory.children.map((child) => child.id),
                },
              },
            ],
          };
        } else {
          // 소분류 선택 시 단일 카테고리만 사용
          categoryCondition = { categoryId: selectedCategory.id };
        }
      }
    }
  }

  // 1. 사용자 지역 및 범위(Range) 설정 조회
  const user = await db.user.findUnique({
    where: { id: viewerId },
    select: { region1: true, region2: true, region3: true, regionRange: true },
  });

  // 2. DB 범위(Range) 설정에 따른 필터 분기 (Fallback 포함)
  const regionCondition = user ? buildRegionWhere(user) : {};

  // 가격 필터 숫자 정규화
  const minPrice =
    params.minPrice !== undefined && !isNaN(Number(params.minPrice))
      ? Number(params.minPrice)
      : undefined;
  const maxPrice =
    params.maxPrice !== undefined && !isNaN(Number(params.maxPrice))
      ? Number(params.maxPrice)
      : undefined;
  const keyword = params.keyword?.trim();

  return {
    AND: [
      { user: { bannedAt: null } },
      { hidden_at: null },
      keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" } },
              { description: { contains: keyword, mode: "insensitive" } },
              {
                search_tags: {
                  some: { name: { contains: keyword, mode: "insensitive" } },
                },
              },
            ],
          }
        : {},
      categoryCondition,
      regionCondition,
      {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
      params.game_type ? { game_type: params.game_type } : {},
      params.condition ? { condition: params.condition } : {},
    ],
  };
}

/**
 * 제품 목록 조회 및 페이징 로직 (항구 메인 페이지용)
 *
 * [데이터 페칭 및 가공 전략]
 * - 검색 쿼리 빌더(`buildSearchWhere`) 적용 및 커서 기반 데이터 추출
 * - 조회자(`viewerId`) 기준 차단된 유저의 상품 은닉 처리
 * - 끌어올리기(`refreshed_at`)를 반영한 내림차순 1차 정렬 및 id 기준 2차 정렬 적용
 * - 다음 페이지 존재 유무 판별을 위한 LIMIT + 1 레코드 조회 로직 포함
 *
 * @param {ProductSearchParams} params - 검색 조건
 * @param {number} viewerId - 조회자 ID
 * @param {number | null} cursor - 페이징 커서 (제품 ID)
 * @returns {Promise<Paginated<ProductType>>} 페이징된 제품 목록과 다음 커서 반환
 */
export async function getProductsList(
  params: ProductSearchParams,
  viewerId: number,
  cursor: number | null = null
): Promise<Paginated<ProductType>> {
  // 검색 파라미터 기반 where 조건 조립
  const where = await buildSearchWhere(params, viewerId);

  // 차단 유저 필터링 (필수 보안)
  const blockedIds = await getBlockedUserIds(viewerId);
  if (blockedIds.length > 0) {
    where.userId = { notIn: blockedIds };
  }

  if (cursor) {
    const cursorExists = await db.product.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (!cursorExists) {
      const totalCount = await db.product.count({ where });
      return { products: [], nextCursor: null, totalCount };
    }
  }

  // 커서 기반 페이지네이션용 cursor 객체 구성
  const cursorObj = cursor ? { id: cursor } : undefined;

  // 목록 데이터와 전체 개수 동시 조회
  const [rows, totalCount] = await db.$transaction([
    db.product.findMany({
      where,
      select: PRODUCT_SELECT,
      // 끌어올리기 반영 정렬
      orderBy: [{ refreshed_at: "desc" }, { id: "desc" }],
      take: (params.take ?? TAKE) + 1,
      skip: cursor ? 1 : (params.skip ?? 0),
      cursor: cursorObj,
    }),
    db.product.count({ where }),
  ]);

  // LIMIT + 1 기준의 다음 페이지 존재 판별
  const hasNext = rows.length > (params.take ?? TAKE);
  const pageRows = hasNext ? rows.slice(0, params.take ?? TAKE) : rows;
  const likedRows =
    viewerId > 0 && pageRows.length > 0
      ? await db.productLike.findMany({
          where: {
            userId: viewerId,
            productId: { in: pageRows.map((row) => row.id) },
          },
          select: { productId: true },
        })
      : [];
  const likedProductIds = new Set(likedRows.map((row) => row.productId));
  const products = pageRows.map((row) => mapProductListRow(row, likedProductIds));
  const nextCursor = hasNext ? products[products.length - 1].id : null;

  return { products, nextCursor, totalCount };
}
