/**
 * File Name : features/review/actions/create.ts
 * Description : 리뷰 생성 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     features/review/actions.ts -> features/review/actions/create.ts
 * 2026.03.05  임도헌   Modified  Action 내 `revalidateTag` 부수 효과(리뷰 목록, 평점 등) 제거 및 클라이언트 Mutation 훅으로 상태 갱신 위임
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.09.09  임도헌   Removed   별도 리뷰 Query와 무관한 상품 상세 본문 태그 만료 제거
 */
"use server";

import getSession from "@/lib/session";
import { createReviewService } from "@/features/review/service/create";
import { createReviewSchema } from "@/features/review/schemas";
import { REVIEW_ERRORS } from "@/features/review/constants";
import type { ReviewServiceResult } from "@/features/review/types";

/**
 * 리뷰 생성 Action
 * - 로그인 세션을 확인
 * - 입력값을 Zod 스키마로 검증
 * - Service 계층을 호출해 리뷰 생성
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
  // 로그인 세션 확인
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  // 입력 검증
  const parsed = createReviewSchema.safeParse({
    productId,
    payload,
    rate,
    type,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 리뷰 생성 service 위임
  const result = await createReviewService(session.id, parsed.data);

  return result;
}
