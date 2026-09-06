/**
 * File Name : app/(app)/(tabs)/products/@modal/(..)products/view/[id]/error.tsx
 * Description : 인터셉트 상품 상세 모달 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   상품 목록 배경을 유지하는 모달 재시도·복귀 화면 추가
 * 2026.08.27  임도헌   Modified  오류 제목 초기 포커스를 유지하면서 모달 Tab 순환·복귀 포커스 보강
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";
import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { useModalFocus } from "@/hooks/useModalFocus";

/**
 * 인터셉트 상품 상세 오류를 parallel modal slot 안에서 복구
 *
 * @param props - Next.js가 전달하는 오류 객체와 modal segment 재시도 함수
 * @returns 상품 목록 위에 표시하는 모달 오류 복구 화면
 */
export default function ProductDetailModalError({
  error,
  reset,
}: RouteErrorBoundaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTo = sanitizeCallbackUrl(
    searchParams.get("returnTo") ?? "/products"
  );

  useModalFocus({
    open: true,
    containerRef: dialogRef,
    focusOnOpen: false,
    onClose: () => router.replace(returnTo),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="상품 상세 오류"
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col overflow-y-auto bg-background sm:h-auto sm:max-h-[85vh] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border-subtle sm:shadow-2xl"
      >
        <AppErrorFallback
          error={error}
          reset={reset}
          title="상품을 불러오지 못했습니다"
          description="상품 정보를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 상품 목록으로 돌아가 주세요."
          fallbackHref={returnTo}
          fallbackLabel="상품 목록으로"
        />
      </div>
    </div>
  );
}
