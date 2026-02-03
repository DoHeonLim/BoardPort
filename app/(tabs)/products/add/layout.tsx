/**
 * File Name : app/(tabs)/products/add/layout.tsx
 * Description : 제품 등록 레이아웃(상단바: 뒤로가기 + 제목, 본문 컨테이너)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   뒤로가기/제목 상단바 + 공통 컨테이너
 * 2026.01.11  임도헌   Modified  [Rule 3.2] 모바일 최대 너비 제약 및 시맨틱 토큰 적용
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function AddProductLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      {/* 상단바 */}
      <header
        className={cn(
          "sticky top-0 z-40 h-14 w-full",
          "bg-background/80 backdrop-blur-md border-b border-border",
          "transition-colors"
        )}
        role="banner"
      >
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton fallbackHref="/products" variant="appbar" />
          <h1 className="text-base font-semibold text-primary">제품 등록</h1>
        </div>
      </header>

      {/* 본문 컨테이너 */}
      <main className="mx-auto max-w-mobile pb-20">{children}</main>

      {/* 스크린리더 안내 */}
      <span className="sr-only" aria-live="polite">
        제품 등록 폼을 불러오는 중입니다…
      </span>
    </div>
  );
}
