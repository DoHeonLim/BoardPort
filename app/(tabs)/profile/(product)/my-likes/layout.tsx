/**
 * File Name : app/(tabs)/profile/(product)/my-likes/layout.tsx
 * Description : '나의 찜한 내역' 섹션 공통 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   섹션 전용 레이아웃 추가 (상단 앱바 + BackButton)
 * 2026.03.12  임도헌   Modified  프로필 찜한 내역 헤더를 flat 톤과 border-border-subtle 기준으로 통일
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";

export default function MyLikesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <header className="sticky top-0 z-40 h-14 w-full border-b border-border-subtle bg-background shadow-sm">
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton
            fallbackHref="/profile"
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-semibold text-primary">찜한 내역</h1>
        </div>
      </header>
      <main className="mx-auto max-w-mobile pb-24">{children}</main>
    </div>
  );
}
