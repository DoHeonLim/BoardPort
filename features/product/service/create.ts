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
 * 2026.02.12  임도헌   Modified  상품 등록 시 키워드 알림 발송 로직(checkAndSendKeywordAlert) 연결
 * 2026.02.14  임도헌   Modified  위치 정보 추가
 * 2026.02.23  임도헌   Modified  Serverless 환경에서 알림 누락 방지를 위해 비동기 작업 명시적 await 처리
 * 2026.03.07  임도헌   Modified  사용자 노출용 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  태그 중복 입력 방지 및 count 증가 기준을 고유 태그 단위로 정리
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkAndSendKeywordAlert } from "@/features/notification/service/keyword";
import type { ServiceResult } from "@/lib/types";
import type { ProductDTO } from "@/features/product/types";

/**
 * 신규 제품을 생성
 * [검증 및 처리]
 * 1. 정지 유저 체크: `validateUserStatus`를 호출하여 이용 정지 상태인 경우 생성을 차단합니다.
 * 2. 트랜잭션 처리: 제품 정보 저장, 이미지 연결, 태그 카운트 증가를 원자적으로 수행합니다.
 * 3. 후처리: 키워드 알림 발송 및 뱃지 체크를 비동기로 실행합니다.
 *
 * @param {number} userId - 작성자(판매자) ID
 * @param {ProductDTO} data - 제품 생성 데이터 DTO
 * @returns {Promise<ServiceResult<{ productId: number }>>} 생성된 제품 ID 반환
 */
export const createProduct = async (
  userId: number,
  data: ProductDTO
): Promise<ServiceResult<{ productId: number }>> => {
  // 1. 정지 유저 체크
  const status = await validateUserStatus(userId);
  if (!status.success) return status;

  try {
    const uniqueTags = Array.from(new Set(data.tags));

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
      // 위치 정보 매핑 (data.location이 있으면 분해, 없으면 undefined)
      ...(data.location && {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        locationName: data.location.locationName,
        region1: data.location.region1,
        region2: data.location.region2,
        region3: data.location.region3,
      }),
      category: { connect: { id: data.categoryId } },
      user: { connect: { id: userId } },
      search_tags: {
        connectOrCreate: uniqueTags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      },
    };

    // 2. 트랜잭션 실행: 제품 생성 + 이미지 연결 + 태그 카운트 증가
    const product = await db.$transaction(async (tx) => {
      // 2-1. 제품 생성
      const newProduct = await tx.product.create({ data: productData });

      // 2-2. 이미지 저장
      if (data.photos.length > 0) {
        await tx.productImage.createMany({
          data: data.photos.map((url, index) => ({
            url,
            order: index,
            productId: newProduct.id,
          })),
        });
      }

      // 2-3. 태그 사용 횟수 증가
      if (uniqueTags.length > 0) {
        await tx.searchTag.updateMany({
          where: { name: { in: uniqueTags } },
          data: { count: { increment: 1 } },
        });
      }

      return newProduct;
    });

    // 3. 후처리 작업
    // Vercel Serverless 컨테이너 동결을 막기 위해 await를 사용하여 확실히 처리 (속도보다 알림 신뢰성 우선)
    try {
      await checkAndSendKeywordAlert({
        productId: product.id,
        title: product.title,
        tags: uniqueTags,
        sellerId: userId,
        region1: data.location?.region1,
        region2: data.location?.region2,
        region3: data.location?.region3,
      });
    } catch (err) {
      console.error("[createProduct] Keyword alert failed:", err);
    }

    return {
      success: true,
      data: { productId: product.id },
    };
  } catch (error) {
    console.error("createProduct Service Error:", error);
    return {
      success: false,
      error:
        "제품 등록에 실패했습니다. 필수 입력값과 이미지 업로드 상태를 확인한 뒤 다시 시도해주세요.",
    };
  }
};
