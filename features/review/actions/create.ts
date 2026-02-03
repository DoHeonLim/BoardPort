/**
 * File Name : features/review/actions/create.ts
 * Description : 리뷰 생성 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     features/review/actions.ts -> features/review/actions/create.ts
 */
"use server";

import { revalidateTag } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { createReviewService } from "@/features/review/service/create";
import { createReviewSchema } from "@/features/review/schemas";
import { REVIEW_ERRORS } from "@/features/review/constants";
import type { ReviewServiceResult } from "@/features/review/types";

/**
 * 리뷰 생성 Action
 * - 로그인 세션을 확인합니다.
 * - 입력값을 Zod 스키마로 검증합니다.
 * - Service 계층을 호출하여 리뷰를 생성하고, 성공 시 제품 상세 캐시를 무효화합니다.
 *
 * @param productId - 제품 ID
 * @param payload - 리뷰 내용
 * @param rate - 평점 (1~5)
 * @param type - 작성자 타입 (buyer | seller)
 * @returns 처리 결과 (성공 시 리뷰 객체 포함)
 */
export async function createReviewAction(
  productId: number,
  payload: string,
  rate: number,
  type: "buyer" | "seller"
): Promise<ReviewServiceResult> {
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  const parsed = createReviewSchema.safeParse({
    productId,
    payload,
    rate,
    type,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const result = await createReviewService(session.id, parsed.data);

  if (result.success) {
    const { productId } = parsed.data;
    revalidateTag(T.PRODUCT_DETAIL_ID(productId));
  }

  return result;
}
