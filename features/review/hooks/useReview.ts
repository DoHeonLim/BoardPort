/**
 * File Name : features/review/hooks/useReview.ts
 * Description : 리뷰 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.03  임도헌   Created
 * 2024.12.03  임도헌   Modified  리뷰 작성 훅 추가
 * 2024.12.04  임도헌   Modified  리뷰 작성 로직을 구매자, 판매자 분리
 * 2024.12.22  임도헌   Modified  createReview코드로 변경(구매자, 판매자)
 * 2025.11.05  임도헌   Modified  서버에서 userId 강제 → 에러 메시지 표준화/토스트
 * 2025.11.06  임도헌   Modified  반환 타입 구조화(SubmitResult) + 생성 리뷰 객체 반환
 * 2026.01.16  임도헌   Moved     hooks -> hooks/review
 * 2026.01.18  임도헌   Moved     hooks/review -> features/review/hooks
 * 2026.01.24  임도헌   Modified  Action(createReviewAction) 연결 및 경로 수정
 */
import { useState } from "react";
import { toast } from "sonner";
import { createReviewAction } from "@/features/review/actions/create";
import type {
  ProductReview,
  ReviewSubmitResult,
} from "@/features/review/types";

interface UseReviewProps {
  productId: number;
  type: "buyer" | "seller"; // 작성자 역할 (구매자/판매자)
  onSuccess?: (review: ProductReview) => void; // 성공 시 실행할 콜백 (예: 리스트 갱신)
}

/**
 * 리뷰 작성(Submit) 로직을 캡슐화한 훅
 *
 * [기능]
 * 1. 로딩(`isLoading`) 및 에러(`error`) 상태 관리
 * 2. 리뷰 작성 서버 액션 호출 및 결과 처리
 * 3. 성공 시 `onSuccess` 콜백 실행 및 Toast 알림
 * 4. 실패 시 에러 메시지 처리 (Toast 포함)
 */
export function useReview({ productId, type, onSuccess }: UseReviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 리뷰 제출 핸들러
   *
   * @param text - 리뷰 내용
   * @param rating - 별점 (1~5)
   * @returns 처리 결과 객체 ({ ok, review?, error? })
   */
  const submitReview = async (
    text: string,
    rating: number
  ): Promise<ReviewSubmitResult> => {
    try {
      // 1. 상태 초기화 (로딩 시작, 이전 에러 제거)
      setIsLoading(true);
      setError(null);

      // 2. 서버 액션 호출 (리뷰 생성 요청)
      const res = await createReviewAction(productId, text, rating, type);

      // 3. 실패 처리
      if (!res.success) {
        const msg = res.error;
        setError(msg);
        toast.error(msg); // 사용자에게 에러 알림
        return { ok: false, error: msg };
      }

      // 4. 성공 처리
      // - 상위 컴포넌트의 콜백 실행 (예: 모달 닫기, 리스트에 새 리뷰 추가)
      try {
        onSuccess?.(res.review);
      } catch (callbackError) {
        console.warn("[useReview] onSuccess callback error:", callbackError);
        // 콜백 에러는 전체 흐름을 실패로 간주하지 않음
      }

      toast.success("리뷰가 작성되었습니다.");
      return { ok: true, review: res.review };
    } catch (err) {
      // 5. 예상치 못한 네트워크/런타임 에러 처리
      const msg =
        err instanceof Error
          ? err.message
          : "리뷰 작성 중 오류가 발생했습니다.";

      console.error("[useReview] Unexpected error:", err);
      setError(msg);
      toast.error(msg);
      return { ok: false, error: msg };
    } finally {
      // 6. 로딩 상태 해제 (성공/실패 무관)
      setIsLoading(false);
    }
  };

  return { isLoading, error, submitReview };
}
