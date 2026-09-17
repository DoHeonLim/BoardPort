/**
 * File Name : features/product/actions/visibility.ts
 * Description : 제품 숨김/숨김 해제 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   판매완료 상품 공개 노출 제어 액션 추가
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.09.09  임도헌   Removed   별도 최신 숨김 상태 조회와 중복되는 상세 본문 태그 만료 제거
 */
"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import { toggleProductHidden } from "@/features/product/service/visibility";

/**
 * 판매완료 상품의 숨김/숨김 해제를 수행
 *
 * - 공개 목록(/products), 프로필 제품 화면, 상세 경로를 함께 갱신
 * - 성공 시 최신 숨김 상태를 응답
 */
export async function toggleProductHiddenAction(
  productId: number,
  hidden: boolean
): Promise<{ success: boolean; hidden?: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await toggleProductHidden(session.id, productId, hidden);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/products");
  revalidatePath("/profile");
  revalidatePath(`/products/view/${productId}`);

  return { success: true, hidden: result.data?.hidden };
}
