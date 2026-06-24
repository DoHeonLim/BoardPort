/**
 * File Name : features/stream/components/StreamModeTabs.tsx
 * Description : 스트림 탭 상단 모드 전환(라이브/다시보기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   스트림 탭 최상단 모드 전환용 공용 탭 추가
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 compact 탭 타이포를 text-xs 기준으로 정리
 * 2026.04.16  임도헌   Modified  초기 로드 경합은 줄이되 탭 전환 체감 속도는 유지하도록 의도 기반 프리패치 추가
 * 2026.04.17  임도헌   Modified  모드 탭의 의도 기반 프리패치와 compact 분기 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.05.30  임도헌   Modified  모바일 스트림 필터 헤더 압축에 맞춰 compact 탭 높이 완화
 */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { StreamMode } from "@/features/stream/types";

interface StreamModeTabsProps {
  mode: StreamMode;
  liveHref: string;
  recordingsHref: string;
  compact?: boolean;
}

/**
 * 스트림 상단 라이브/다시보기 모드 전환 탭
 *
 * - 현재 모드에 맞는 active 스타일을 적용
 * - 기본 렌더에서는 `prefetch={false}`로 두고 hover/focus/touch 시점에만 의도 기반 프리패치를 수행
 * - `compact` 모드에서는 모바일 헤더 폭에 맞는 밀도로 같은 컴포넌트를 재사용
 */
export default function StreamModeTabs({
  mode,
  liveHref,
  recordingsHref,
  compact = false,
}: StreamModeTabsProps) {
  const router = useRouter();
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());

  // 사용자가 탭 전환 의도를 보인 링크만 선행 준비, 초기 경합 감소 및 체감 전환 속도 유지
  const prefetchOnIntent = (href: string) => {
    if (prefetchedHrefsRef.current.has(href)) {
      return;
    }
    prefetchedHrefsRef.current.add(href);
    router.prefetch(href);
  };

  return (
    <nav
      aria-label="스트림 모드"
      className={cn(
        "rounded-xl border border-border-subtle bg-background p-0.5",
        compact ? "w-full" : "inline-flex"
      )}
    >
      <div className="flex items-center">
        {(
          [
            { value: "live" as const, label: "라이브", href: liveHref },
            {
              value: "recordings" as const,
              label: "다시보기",
              href: recordingsHref,
            },
          ] satisfies { value: StreamMode; label: string; href: string }[]
        ).map((item) => (
          <Link
            key={item.value}
            href={item.href}
            prefetch={false}
            onMouseEnter={() => prefetchOnIntent(item.href)}
            onFocus={() => prefetchOnIntent(item.href)}
            onTouchStart={() => prefetchOnIntent(item.href)}
            className={cn(
              "focus-ring-soft flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,border-color,box-shadow]",
              compact && "flex-1 text-xs py-1",
              mode === item.value
                ? "bg-surface text-brand shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                : "text-muted hover:bg-surface/80 hover:text-primary"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
