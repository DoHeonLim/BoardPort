/**
 * File Name : features/stream/components/recording/RecordingTopbar.tsx
 * Description : 스트리밍 녹화본 상단바(뒤로가기 + 작성자 정보 + 카테고리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.26  임도헌   Created   녹화본 상세 상단바 분리(뒤로가기/유저/카테고리)
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import BackButton from "@/components/global/BackButton";
import UserAvatar from "@/components/global/UserAvatar";
import { cn } from "@/lib/utils";

interface RecordingTopbarProps {
  /** 뒤로가기 기본 경로 (히스토리 없을 때 폴백) */
  backHref?: string; // 기본: /streams
  /** 방송 소유자 정보 */
  username: string;
  avatar: string | null;
  /** 방송 카테고리 표시용 (선택) */
  categoryLabel?: string | null;
  categoryIcon?: string | null;
}

/**
 * 녹화본 상세 페이지 상단바
 * - 좌측: 뒤로가기 버튼 + 작성자 프로필(아바타)
 * - 우측: 카테고리 칩 (선택적)
 * - 스크롤 시 상단에 고정(Sticky)됩니다.
 */
export default function RecordingTopbar({
  backHref,
  username,
  avatar,
  categoryLabel,
  categoryIcon,
}: RecordingTopbarProps) {
  const safeBack = backHref ?? "/streams";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full h-14",
        "bg-surface/80 backdrop-blur-md border-b border-border transition-colors"
      )}
      role="banner"
    >
      <div className="mx-auto w-full max-w-mobile h-full flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton
            fallbackHref={safeBack}
            variant="appbar"
            className="px-0"
          />

          <UserAvatar username={username} avatar={avatar} size="sm" compact />
        </div>

        {categoryLabel && (
          <div
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors",
              "bg-surface-dim text-muted border border-transparent"
            )}
          >
            {categoryIcon && <span aria-hidden="true">{categoryIcon}</span>}
            <span>{categoryLabel}</span>
          </div>
        )}
      </div>
    </header>
  );
}
