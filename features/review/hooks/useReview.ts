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
 */

import { useState } from "react";
import { toast } from "sonner";
import { createReview } from "@/features/review/lib/createReview";
import type { ProductReview } from "@/types/product";

interface UseReviewProps {
  productId: number;
  type: "buyer" | "seller";
  onSuccess?: (review: ProductReview) => void;
}

export type SubmitResult =
  | { ok: true; review: ProductReview }
  | { ok: false; error: string };

export function useReview({ productId, type, onSuccess }: UseReviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = async (
    text: string,
    rating: number
  ): Promise<SubmitResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await createReview(productId, text, rating, type);
      if (!res?.success || !res.review) {
        const msg = res?.error ?? "리뷰 작성 중 오류가 발생했습니다.";
        setError(msg);
        toast.error(msg);
        return { ok: false, error: msg };
      }

      // 생성된 리뷰를 호출자에게 전달 → 로컬 상태 즉시 업데이트용
      try {
        onSuccess?.(res.review);
      } catch {
        // onSuccess 내부 예외는 삼켜서 UX 방해 X
      }

      toast.success("리뷰가 작성되었습니다.");
      return { ok: true, review: res.review };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "리뷰 작성 중 오류가 발생했습니다.";
      setError(msg);
      toast.error(msg);
      return { ok: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, submitReview };
}
