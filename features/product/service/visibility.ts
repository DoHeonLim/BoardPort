/**
 * File Name : features/product/service/visibility.ts
 * Description : 제품 숨김/숨김 해제 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   판매완료 상품만 숨길 수 있는 공개 노출 제어 로직 추가
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 */
import "server-only";

import db from "@/lib/db";

interface ToggleProductHiddenResult {
  success: boolean;
  error?: string;
  data?: {
    hidden: boolean;
  };
}

/**
 * 판매완료 상품의 공개 노출 숨김 상태를 전환
 *
 * - 판매자 본인만 수행 가능
 * - 판매완료 상품만 숨기기/숨김 해제 가능
 * - 숨김은 삭제가 아니라 공개 목록/프로필 노출만 내리는 소프트 상태
 */
export async function toggleProductHidden(
  userId: number,
  productId: number,
  hidden: boolean
): Promise<ToggleProductHiddenResult> {
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
        purchase_userId: true,
        hidden_at: true,
      },
    });

    if (!product) {
      return { success: false, error: "상품을 찾을 수 없습니다." };
    }

    if (product.userId !== userId) {
      return { success: false, error: "본인 상품만 관리할 수 있습니다." };
    }

    if (!product.purchase_userId) {
      return {
        success: false,
        error: "판매완료 상품만 숨기기 또는 숨김 해제를 할 수 있습니다.",
      };
    }

    await db.product.update({
      where: { id: productId },
      data: {
        hidden_at: hidden ? (product.hidden_at ?? new Date()) : null,
      },
    });

    return { success: true, data: { hidden } };
  } catch (error) {
    console.error("[toggleProductHidden] Error:", error);
    return {
      success: false,
      error: "상품 숨김 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
