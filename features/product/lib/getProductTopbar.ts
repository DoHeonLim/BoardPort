/**
 * File Name : features/product/lib/getProductTopbar.ts
 * Description : 제품 상세 상단바용 경량 데이터 조회 (카테고리/소유자 여부)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   상단바 경량 쿼리(카테고리/소유자)
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

import db from "@/lib/db";
import getSession from "@/lib/session";

export async function getProductTopbar(id: number) {
  const session = await getSession();
  const me = session?.id ?? null;

  // 필요한 필드만 최소 조회
  const product = await db.product.findUnique({
    where: { id },
    select: {
      userId: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          kor_name: true, // 라벨로 사용
          icon: true, // 필요하면 노출
        },
      },
    },
  });

  if (!product) {
    return {
      categoryId: null as number | null,
      categoryLabel: null as string | null,
      isOwner: false,
    };
  }

  const categoryId = product.categoryId ?? product.category?.id ?? null;
  const categoryLabel = product.category?.kor_name ?? null;
  const categoryIcon = product.category?.icon ?? null;
  const isOwner = !!(me && product.userId === me);

  return { categoryId, categoryLabel, categoryIcon, isOwner };
}
