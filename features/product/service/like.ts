/**
 * File Name : features/product/service/like.ts
 * Description : 제품 좋아요(찜하기) 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   service/trade.ts에서 분리
 * 2026.02.05  임도헌   Modified  좋아요 시 차단 관계 확인 로직 추가
 */
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ServiceResult } from "@/lib/types";
import type { ProductLikeResult } from "@/features/product/types";
import { checkBlockRelation } from "@/features/user/service/block";
import { isUniqueConstraintError } from "@/lib/errors";

/**
 * 좋아요 상태 조회 (Cached)
 *
 * @param {number} productId - 제품 ID
 * @param {number | null} userId - 조회하는 유저 ID (비로그인 시 null)
 * @returns {Promise<ProductLikeResult>} 좋아요 여부 및 총 개수
 */
export const getCachedProductLikeStatus = async (
  productId: number,
  userId: number | null
): Promise<ProductLikeResult> => {
  return nextCache(
    async (pid: number, uid: number | null): Promise<ProductLikeResult> => {
      const likeCount = await db.productLike.count({
        where: { productId: pid },
      });

      let isLiked = false;
      if (uid) {
        const exist = await db.productLike.findUnique({
          where: { id: { productId: pid, userId: uid } },
        });
        isLiked = !!exist;
      }

      return { likeCount, isLiked };
    },
    ["product-like-status", String(productId), String(userId)],
    {
      tags: [T.PRODUCT_LIKE_STATUS(productId)],
    }
  )(productId, userId);
};

/**
 * 제품 좋아요 상태를 토글
 *
 * @param {number} userId - 유저 ID
 * @param {number} productId - 제품 ID
 * @param {boolean} isLike - true: 좋아요, false: 좋아요 취소
 * @returns {Promise<ServiceResult>} 성공 여부
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

    revalidateTag(T.PRODUCT_LIKE_STATUS(productId));
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
