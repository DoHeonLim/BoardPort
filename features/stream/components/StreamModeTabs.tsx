/**
 * File Name : features/stream/components/StreamModeTabs.tsx
 * Description : 스트림 탭 상단 모드 전환(라이브/다시보기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   스트림 탭 최상단 모드 전환용 공용 탭 추가
 */
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StreamMode } from "@/features/stream/types";

interface StreamModeTabsProps {
  mode: StreamMode;
  liveHref: string;
  recordingsHref: string;
  compact?: boolean;
}

export default function StreamModeTabs({
  mode,
  liveHref,
  recordingsHref,
  compact = false,
}: StreamModeTabsProps) {
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
            className={cn(
              "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-all",
              compact && "flex-1 text-[11px] py-1.5",
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
