/**
 * File Name : app/streams/add/layout
 * Description : 스트리밍 생성 페이지 레이아웃 (공통 헤더 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2026.01.14  임도헌   Created    [Rule 3.2] 다른 Add 페이지와 레이아웃 통일
 */

import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function AddStreamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
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
            fallbackHref="/streams"
            variant="inline"
            className="px-0"
          />
          <h1 className="text-base font-semibold text-primary">
            스트리밍 시작
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-mobile pb-20">{children}</main>
    </div>
  );
}
