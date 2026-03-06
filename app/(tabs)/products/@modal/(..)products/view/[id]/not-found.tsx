/**
 * File Name : app/(tabs)/products/@modal/(..)products/view/[id]/not-found.tsx
 * Description : 모달 제품 상세 페이지 Not Found UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.05  임도헌   Created
 * 2024.11.05  임도헌   Modified  notFound 페이지 추가
 * 2025.06.08  임도헌   Modified  상세 페이지 Not Found UI 추가
 * 2025.06.08  임도헌   Modified  모달 제품 상세 페이지 Not Found UI 공통 컴포넌트 적용
 * 2025.06.12  임도헌   Modified  app/(tabs)/products/@modal/(..)products/view/[id]/not-found 로 이동
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 및 모달 스타일의 NotFound 페이지로 변경
 * 2026.03.06  임도헌   Modified  닫기 버튼 접근성과 상태 화면 패딩을 공통 기준에 맞게 정리
 */
"use client";

import NotFound from "@/components/ui/NotFound";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import CloseButton from "@/components/global/CloseButton";

export default function ModalProductNotFound() {
  const sp = useSearchParams();
  const router = useRouter();

  const handleClose = () => {
    const returnTo = sp.get("returnTo") || "/products";
    router.replace(returnTo);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="제품을 찾을 수 없음"
        className={cn(
          "flex flex-col bg-background outline-none shadow-2xl transition-all",
          // [Mobile] Full Screen
          "w-full h-[100dvh] rounded-none",
          // [Desktop] Center Card (작은 사이즈)
          "sm:h-auto sm:min-h-[400px] sm:max-w-sm sm:rounded-2xl sm:border sm:border-border"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-4">
          <CloseButton returnTo={sp.get("returnTo") || "/products"} label="모달 닫기" />
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center justify-center px-4 pb-6">
          <NotFound
            title="제품이 없습니다"
            description="삭제되었거나 잘못된 접근입니다."
            action={
              <button
                onClick={handleClose}
                className="btn-primary w-full max-w-[200px] min-h-[44px]"
              >
                목록으로 닫기
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
