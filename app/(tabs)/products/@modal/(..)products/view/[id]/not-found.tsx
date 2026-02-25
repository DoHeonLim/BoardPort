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
 */
"use client";

import NotFound from "@/components/ui/NotFound";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ModalProductNotFound() {
  const router = useRouter();

  const handleClose = () => {
    // 모달 닫기 (뒤로가기 또는 리스트로 이동)
    // 404 상황이므로 history back 보다는 명시적 리스트 이동이 안전할 수 있으나,
    // UX상 '닫기' 동작은 이전 목록을 보여주는 것이 자연스러움.
    router.back();
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
        {/* Header (Close Button Only) */}
        <div className="flex justify-end p-4">
          {/* 404에서는 returnTo 쿼리가 없을 수 있으므로 단순 back 처리 */}
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-surface-dim transition-colors"
          >
            <span className="sr-only">닫기</span>
            {/* CloseButton 컴포넌트를 써도 되지만, router 제어를 위해 직접 구현하거나 CloseButton에 onClick 전달 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6 text-muted"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <NotFound
            title="제품이 없습니다"
            description="삭제되었거나 잘못된 접근입니다."
            // 버튼 액션을 '닫기'로 대체
            action={
              <button
                onClick={handleClose}
                className="btn-primary w-full max-w-[200px]"
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
