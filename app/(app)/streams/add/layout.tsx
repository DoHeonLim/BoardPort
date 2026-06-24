/**
 * File Name : app/(app)/streams/add/layout.tsx
 * Description : 스트리밍 생성 페이지 레이아웃 (공통 헤더 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2026.01.14  임도헌   Created    [Rule 3.2] 다른 Add 페이지와 레이아웃 통일
 * 2026.03.12  임도헌   Modified   스트리밍 생성 헤더를 flat 톤과 border-border-subtle 기준으로 통일
 * 2026.04.10  임도헌   Modified   Pretendard subset 3-weight 정책에 맞춰 헤더 타이포를 500 기준으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/add/layout.tsx 에서 app/(app)/streams/add/layout.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified   스트리밍 생성 상단 헤더 높이를 모바일 서브 헤더 기준으로 정리
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
      {/* 고정 헤더 */}
      <header
        className={cn(
          "sticky top-0 z-40 h-[52px] w-full",
          "border-b border-border-subtle bg-background shadow-sm",
          "transition-colors"
        )}
      >
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton
            fallbackHref="/streams"
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-medium text-primary">스트리밍 시작</h1>
        </div>
      </header>

      {/* 본문 */}
      <main className="mx-auto max-w-mobile pb-20">{children}</main>
    </div>
  );
}

