/**
File Name : app/products/view/[id]/actions/like
Description : 제품 좋아요 관련 서버 액션
Author : 임도헌

History
Date        Author   Status    Description
2024.12.12  임도헌   Created   좋아요 관련 서버 코드 분리
2025.06.08  임도헌   Modified  actions 파일 역할별 분리
*/
"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { unstable_cache as nextCache, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 좋아요 상태 확인 함수 (내부 전용)
 */
const getProductLikeStatus = async (productId: number, userId: number) => {
  const isLiked = await db.productLike.findUnique({
    where: {
      id: {
        productId,
        userId,
      },
    },
  });
  const likeCount = await db.productLike.count({ where: { productId } });
  return {
    likeCount,
    isLiked: Boolean(isLiked),
  };
};

/**
 * 좋아요 상태 캐싱 함수
 */
export const getCachedProductLikeStatus = async (productId: number) => {
  const session = await getSession();
  const userId = session?.id;
  if (!userId) throw new Error("로그인이 필요합니다.");

  const cachedOperation = nextCache(
    getProductLikeStatus,
    ["product-like-status-by-id"],
    {
      tags: [T.PRODUCT_LIKE_STATUS(productId)],
    }
  );

  return cachedOperation(productId, userId);
};

/**
 * 좋아요 추가 함수
 */
export const likeProduct = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  await db.productLike.create({
    data: {
      user: { connect: { id: session.id } },
      product: { connect: { id: productId } },
    },
  });

  revalidateTag(T.PRODUCT_LIKE_STATUS(productId));
};

/**
 * 좋아요 취소 함수
 */
export const dislikeProduct = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  await db.productLike.delete({
    where: {
      id: {
        userId: session.id,
        productId,
      },
    },
  });

  revalidateTag(T.PRODUCT_LIKE_STATUS(productId));
};
