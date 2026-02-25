/**
 * File Name : app/posts/[id]/edit/layout.tsx
 * Description : 게시글 편집 레이아웃(상단 공통 BackHeader + 컨테이너)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   상단 고정 백 헤더/세이프에어리어/컨테이너 도입
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 헤더 통일
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function EditPostLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const idNum = Number(params.id);
  const defaultHref =
    Number.isFinite(idNum) && idNum > 0 ? `/posts/${idNum}` : "/posts";

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
          <BackButton
            fallbackHref={defaultHref}
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-semibold text-primary">게시글 수정</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl pb-20">{children}</main>
    </div>
  );
}
