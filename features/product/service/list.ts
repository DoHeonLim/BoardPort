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
 */
import "server-only";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { getBlockedUserIds } from "@/features/user/service/block";
import { PRODUCT_SELECT } from "@/features/product/constants";
import { buildRegionWhere } from "@/features/user/utils/region";
import type {
  ProductSearchParams,
  Paginated,
  ProductType,
} from "@/features/product/types";

const TAKE = PRODUCTS_PAGE_TAKE;

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
          // 대분류: 자신 + 자식 카테고리 모두 포함
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
          // 소분류: 해당 카테고리만
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

  // 가격 필터 정규화
  const minPrice =
    params.minPrice !== undefined && !isNaN(Number(params.minPrice))
      ? Number(params.minPrice)
      : undefined;
  const maxPrice =
    params.maxPrice !== undefined && !isNaN(Number(params.maxPrice))
      ? Number(params.maxPrice)
      : undefined;

  return {
    AND: [
      { user: { bannedAt: null } },
      params.keyword
        ? {
            OR: [
              { title: { contains: params.keyword } },
              { description: { contains: params.keyword } },
              { search_tags: { some: { name: { contains: params.keyword } } } },
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
 * - 끌어올리기(`refreshed_at`)를 반영한 내림차순 1차 정렬 및 생성일 기준 2차 정렬 적용
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
  const where = await buildSearchWhere(params, viewerId);

  // 차단 유저 필터링 (필수 보안)
  const blockedIds = await getBlockedUserIds(viewerId);
  if (blockedIds.length > 0) {
    where.userId = { notIn: blockedIds };
  }

  const cursorObj = cursor ? { id: cursor } : undefined;

  const rows = await db.product.findMany({
    where,
    select: PRODUCT_SELECT,
    // 끌어올리기 반영 정렬
    orderBy: [{ refreshed_at: "desc" }, { id: "desc" }],
    take: (params.take ?? TAKE) + 1,
    skip: cursor ? 1 : (params.skip ?? 0),
    cursor: cursorObj,
  });

  const hasNext = rows.length > (params.take ?? TAKE);
  const products = hasNext ? rows.slice(0, params.take ?? TAKE) : rows;
  const nextCursor = hasNext ? products[products.length - 1].id : null;

  return { products, nextCursor };
}
