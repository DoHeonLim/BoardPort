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
 * 2026.03.12  임도헌   Modified  제품 이미지 저장 시 애니메이션 여부 메타를 함께 기록
 * 2026.04.04  임도헌   Modified  상품 생성 트랜잭션/후처리 단계의 인라인 주석 보강
 * 2026.05.03  임도헌   Modified  상품 생성 시 보드게임 카탈로그 연결 저장 추가
 * 2026.05.03  임도헌   Modified  상품-보드게임 연결 저장 정책 주석 보강
 * 2026.06.18  임도헌   Modified  거래 기준 지역 필수 정책에 맞춰 위치 저장/알림 지역을 필수값으로 정리
 * 2026.08.22  임도헌   Modified  상품 이미지 저장 전 MediaAsset 소유자·용도 검증 추가
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkAndSendKeywordAlert } from "@/features/notification/service/keyword";
import type { ServiceResult } from "@/lib/types";
import type { ProductDTO } from "@/features/product/types";
import { attachOwnedMediaAssets } from "@/features/media/service/assets";

/**
 * 신규 제품 생성
 * [검증 및 처리]
 * 1. 정지 유저 체크: `validateUserStatus` 호출 후 이용 정지 상태 생성 차단
 * 2. 트랜잭션 처리: 제품 정보 저장, 이미지 연결, 태그 카운트 증가의 원자적 수행
 * 3. 후처리: 키워드 알림 발송 및 뱃지 체크의 비동기 실행
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
    if (!data.location) {
      return {
        success: false,
        error: "거래 기준 지역을 선택해주세요.",
      };
    }

    // 태그 저장/카운트 정산용 고유 태그 목록 구성
    const uniqueTags = Array.from(new Set(data.tags));
    // 선택된 보드게임은 중복 제거 후 join table 연결 대상으로만 사용
    const boardGameIds = Array.from(new Set(data.boardGameIds ?? []));

    // 상품 본문/거래 기준 지역/카테고리/태그 연결용 create payload 구성
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
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      locationName: data.location.locationName,
      region1: data.location.region1,
      region2: data.location.region2,
      region3: data.location.region3,
      category: { connect: { id: data.categoryId } },
      user: { connect: { id: userId } },
      search_tags: {
        connectOrCreate: uniqueTags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      },
    };

    // 상품, 이미지, 태그 카운트의 원자적 저장
    const product = await db.$transaction(async (tx) => {
      // 상품 본문 생성
      const newProduct = await tx.product.create({ data: productData });

      // 이미지 순서와 애니메이션 메타 저장
      if (data.photos.length > 0) {
        const ownedPhotoUrls = await attachOwnedMediaAssets(tx, {
          ownerId: userId,
          purpose: "PRODUCT_IMAGE",
          urls: data.photos,
          linkedEntityId: String(newProduct.id),
        });
        await tx.productImage.createMany({
          data: ownedPhotoUrls.map((url, index) => ({
            url,
            order: index,
            isAnimated: data.photosAnimated?.[index] ?? false,
            productId: newProduct.id,
          })),
        });
      }

      // 보드게임 선택 연결만 join table에 기록, 원천 카탈로그 데이터 불변
      if (boardGameIds.length > 0) {
        await tx.productBoardGame.createMany({
          data: boardGameIds.map((boardGameId) => ({
            productId: newProduct.id,
            boardGameId,
          })),
          skipDuplicates: true,
        });
      }

      // 연결된 고유 태그 count 증가
      if (uniqueTags.length > 0) {
        await tx.searchTag.updateMany({
          where: { name: { in: uniqueTags } },
          data: { count: { increment: 1 } },
        });
      }

      return newProduct;
    });

    // 상품 생성 후 키워드 알림 후처리
    // serverless 환경 기준의 명시적 await 처리
    try {
      await checkAndSendKeywordAlert({
        productId: product.id,
        title: product.title,
        tags: uniqueTags,
        sellerId: userId,
        region1: data.location.region1,
        region2: data.location.region2,
        region3: data.location.region3,
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
