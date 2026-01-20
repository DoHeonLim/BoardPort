/**
 * File Name : features/stream/components/StreamDetail/StreamEndedOverlay.tsx
 * Description : 방송 종료 시 iframe 위에 표시되는 오버레이 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   컴포넌트 분리
 * 2025.09.09  임도헌   Modified  a11y(role=status/aria-live) 및 링크 자동 포커스, username 가드/인코딩
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StreamEndedOverlayProps {
  username: string;
}

export default function StreamEndedOverlay({
  username,
}: StreamEndedOverlayProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const t = setTimeout(() => linkRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const safeHref = username
    ? `/profile/${encodeURIComponent(username)}/channel`
    : "/streams";

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm z-20"
      role="status"
      aria-live="polite"
    >
      <p className="mb-4 text-xl font-bold">방송이 종료되었습니다</p>
      <Link
        ref={linkRef}
        href={safeHref}
        className={cn(
          "rounded-lg px-5 py-2.5 font-semibold transition-colors",
          "bg-white text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
        )}
      >
        다시보기 목록으로 이동
      </Link>
    </div>
  );
}
