/**
 * File Name : components/global/SubpageHeader.tsx
 * Description : 하위 작성·수정 화면 공통 앱바
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.13  임도헌   Created   화면별 뒤로가기 동작을 유지한 공통 헤더 구조 추가
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SubpageHeaderProps {
  title: string;
  backAction: ReactNode;
  contentClassName?: string;
}

/** 하위 화면의 높이·경계선·제목 정렬 통일 */
export default function SubpageHeader({
  title,
  backAction,
  contentClassName,
}: SubpageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 h-[52px] w-full bg-background transition-colors"
      role="banner"
    >
      <div
        className={cn(
          "mx-auto flex h-full items-center gap-3 border-b border-border-subtle px-3 sm:px-4",
          contentClassName
        )}
      >
        {backAction}
        <h1 className="min-w-0 truncate text-base font-medium text-primary">
          {title}
        </h1>
      </div>
    </header>
  );
}
