/**
 * File Name : app/(app)/posts/add/layout.tsx
 * Description : 게시글 작성 레이아웃(상단바: 뒤로가기 + 제목)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   뒤로가기/제목 상단바 + 공통 컨테이너
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 헤더 통일
 * 2026.03.23  임도헌   Modified  게시글 작성 헤더 하단 구조선을 border-border-subtle 기준으로 정리
 * 2026.04.10  임도헌   Modified  post 타이포 정책에 맞춰 작성 헤더 타이틀 weight를 500 기준으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/add/layout.tsx 에서 app/(app)/posts/add/layout.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  모바일 작성 헤더 높이와 좌우 여백을 압축
*/

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

export default function AddPostLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <header
        className={cn(
          "sticky top-0 z-40 h-[52px] w-full",
          "bg-background/80 backdrop-blur-md border-b border-border-subtle",
          "transition-colors"
        )}
      >
        <div className="mx-auto flex h-full max-w-3xl items-center gap-2.5 px-3">
          <BackButton fallbackHref="/posts" variant="appbar" className="px-0" />
          <h1 className="text-base font-medium text-primary">게시글 작성</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl pb-20">{children}</main>
    </div>
  );
}

