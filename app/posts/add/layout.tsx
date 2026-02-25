/**
 * File Name : app/posts/add/layout.tsx
 * Description : 게시글 작성 레이아웃(상단바: 뒤로가기 + 제목)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   뒤로가기/제목 상단바 + 공통 컨테이너
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 헤더 통일
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function AddPostLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <header
        className={cn(
          "sticky top-0 z-40 h-14 w-full",
          "bg-background/80 backdrop-blur-md border-b border-border",
          "transition-colors"
        )}
      >
        <div className="mx-auto max-w-3xl h-full flex items-center px-3 sm:px-4 gap-3">
          <BackButton fallbackHref="/posts" variant="appbar" className="px-0" />
          <h1 className="text-base font-semibold text-primary">게시글 작성</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl pb-20">{children}</main>
    </div>
  );
}
