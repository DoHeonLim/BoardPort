/**
 * File Name : features/product/actions/bump.ts
 * Description : 제품 끌어올리기 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.03  임도헌   Created   끌어올리기 액션 추가
 * 2026.04.02  임도헌   Modified  파일 설명과 Action 주석 톤을 현재 서버 액션 기준으로 정리
 */
"use server";

import getSession from "@/lib/session";
import { bumpProduct } from "@/features/product/service/bump";
import type { ServiceResult } from "@/lib/types";

/**
 * 제품 끌어올리기 서버 액션
 *
 * [기능]
 * - 로그인 세션을 확인
 * - 끌어올리기 service를 호출해 노출 순서를 갱신
 *
 * @param {number} productId - 끌어올릴 제품 ID
 * @returns {Promise<ServiceResult>} 끌어올리기 처리 결과
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
