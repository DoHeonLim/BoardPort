/**
 * File Name : app/(tabs)/profile/(product)/my-purchases/layout.tsx
 * Description : '나의 구매 제품' 섹션 공통 레이아웃(상단 앱바 + BackButton)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   섹션 전용 레이아웃 추가(모바일 sticky 앱바, 데스크톱 동일 스타일)
 * 2026.01.15  임도헌   Modified   [Rule 3.2] max-w-mobile 및 시맨틱 토큰 적용
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function MyPurchasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Sticky Header */}
      <header
        className={cn(
          "sticky top-0 z-40 h-14 w-full",
          "bg-background/80 backdrop-blur-md border-b border-border",
          "transition-colors"
        )}
      >
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton
            fallbackHref="/profile"
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-semibold text-primary">구매 내역</h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-mobile pb-24">{children}</main>
    </div>
  );
}
