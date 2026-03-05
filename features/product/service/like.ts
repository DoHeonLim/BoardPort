/**
 * File Name : features/product/service/like.ts
 * Description : 제품 좋아요(찜하기) 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   service/trade.ts에서 분리
 * 2026.02.05  임도헌   Modified  좋아요 시 차단 관계 확인 로직 추가
 * 2026.03.04  임도헌   Modified  getCachedProductLikeStatus 대신 getProductLikeStatus 순수 함수로 변경
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
import "server-only";

import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import type { ProductLikeResult } from "@/features/product/types";
import { checkBlockRelation } from "@/features/user/service/block";
import { isUniqueConstraintError } from "@/lib/errors";

/**
 * 제품 좋아요 상태 및 카운트 조회 로직
 *
 * [데이터 가공 전략]
 * - 해당 제품의 총 좋아요 수(`likeCount`)와 요청 유저의 좋아요 누름 여부(`isLiked`) 병렬 집계
 * - 비로그인(userId가 null) 상태일 경우 `isLiked`를 false로 즉시 반환
 *
 * @param {number} productId - 제품 ID
 * @param {number | null} userId - 조회하는 유저 ID
 * @returns {Promise<ProductLikeResult>} 좋아요 여부 및 총 개수 객체 반환
 */
export async function getProductLikeStatus(
  productId: number,
  userId: number | null
): Promise<ProductLikeResult> {
  const likeCount = await db.productLike.count({ where: { productId } });
  let isLiked = false;
  if (userId) {
    const exist = await db.productLike.findUnique({
      where: { id: { productId, userId } },
    });
    isLiked = !!exist;
  }
  return { likeCount, isLiked };
}

/**
 * 제품 좋아요 추가/취소 처리 로직
 *
 * [데이터 가공 및 권한 제어 전략]
 * - 제품 소유자 조회 및 판매자와 요청 유저 간 양방향 차단 관계 검증 (차단 시 상호작용 불가 처리)
 * - `isLike` 플래그에 따른 DB Create 또는 Delete 수행
 * - 동시 요청으로 인한 Prisma Unique Constraint Error (P2002) 발생 시 멱등성 보장을 위한 예외 무시 처리
 *
 * @param {number} userId - 요청 유저 ID
 * @param {number} productId - 대상 제품 ID
 * @param {boolean} isLike - true(추가), false(취소)
 * @returns {Promise<ServiceResult>} 처리 결과 객체 반환
 */
export async function toggleProductLike(
  userId: number,
  productId: number,
  isLike: boolean
): Promise<ServiceResult> {
  try {
    // 차단 확인
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!product) return { success: false, error: "제품을 찾을 수 없습니다." };

    const isBlocked = await checkBlockRelation(userId, product.userId);
    if (isBlocked) {
      return {
        success: false,
        error: "차단된 사용자와는 상호작용할 수 없습니다.",
      };
    }

    if (isLike) {
      await db.productLike.create({
        data: {
          user: { connect: { id: userId } },
          product: { connect: { id: productId } },
        },
      });
    } else {
      await db.productLike.delete({
        where: { id: { userId, productId } },
      });
    }

    return { success: true };
  } catch (e: any) {
    // 멱등성 처리
    if (isLike && isUniqueConstraintError(e, ["userId", "productId"])) {
      return { success: true };
    }
    console.error("toggleProductLike Error:", e);
    return { success: false, error: "좋아요 처리 실패" };
  }
}
