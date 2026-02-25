/**
 * File Name : features/product/actions/bump.ts
 * Description : 제품 끌어올리기 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.03  임도헌   Created   끌어올리기 액션 추가
 */
"use server";

import getSession from "@/lib/session";
import { bumpProduct } from "@/features/product/service/bump";
import type { ServiceResult } from "@/lib/types";

/**
 * 제품 끌어올리기 Action
 * - 로그인 세션을 확인하고 Service를 호출
 *
 * @param productId - 제품 ID
 */
export async function bumpProductAction(
  productId: number
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  return await bumpProduct(session.id, productId);
}
