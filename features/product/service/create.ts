/**
 * File Name : features/product/service/create.ts
 * Description : 제품 생성 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   제품 등록 로직 서버 액션으로 분리
 * 2025.11.19  임도헌   Modified  프로필 판매 탭/카운트 및 제품 상세 캐시 무효화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Modified  Controller 분리, 순수 로직화, 타입 적용
 * 2026.01.25  임도헌   Modified  주석 보강
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type { ProductDTO } from "@/features/product/types";

/**
 * 신규 제품을 생성합니다.
 * 트랜잭션을 사용하여 제품 정보 저장, 이미지 연결, 태그 카운트 증가를 원자적으로 처리합니다.
 *
 * @param {number} userId - 작성자(판매자) ID
 * @param {ProductDTO} data - 제품 생성 데이터 DTO
 * @returns {Promise<ServiceResult<{ productId: number }>>} 생성된 제품 ID 반환
 */
export const createProduct = async (
  userId: number,
  data: ProductDTO
): Promise<ServiceResult<{ productId: number }>> => {
  try {
    const productData: Prisma.ProductCreateInput = {
      title: data.title,
      description: data.description,
      price: data.price,
      game_type: data.game_type,
      min_players: data.min_players,
      max_players: data.max_players,
      play_time: data.play_time,
      condition: data.condition,
      completeness: data.completeness,
      has_manual: data.has_manual,
      category: { connect: { id: data.categoryId } },
      user: { connect: { id: userId } },
      search_tags: {
        connectOrCreate: data.tags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      },
    };

    // 1. 트랜잭션 실행: 제품 생성 + 이미지 연결 + 태그 카운트 증가
    const product = await db.$transaction(async (tx) => {
      // 1-1. 제품 생성
      const newProduct = await tx.product.create({ data: productData });

      // 1-2. 이미지 저장
      if (data.photos.length > 0) {
        await tx.productImage.createMany({
          data: data.photos.map((url, index) => ({
            url,
            order: index,
            productId: newProduct.id,
          })),
        });
      }

      // 1-3. 태그 사용 횟수 증가
      if (data.tags.length > 0) {
        await tx.searchTag.updateMany({
          where: { name: { in: data.tags } },
          data: { count: { increment: 1 } },
        });
      }

      return newProduct;
    });

    return {
      success: true,
      data: { productId: product.id },
    };
  } catch (error) {
    console.error("createProduct Service Error:", error);
    return {
      success: false,
      error: "제품 등록 중 오류가 발생했습니다.",
    };
  }
};
