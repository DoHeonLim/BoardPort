/**
 * File Name : features/stream/components/StreamTopbar.tsx
 * Description : 스트리밍 상세 상단바(뒤로가기 + 가시성 칩 + 공유 + 채팅 토글 버튼)
 * Author : 임도헌
 *
 * History
 * 2025.11.15  임도헌   Created   최소 props 구성으로 재작성(BackButton/Visibility/Share)
 * 2025.11.15  임도헌   Modified  채팅 열기 버튼(닫힘 상태에서만 노출) - 이벤트 버스 연동
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useState } from "react";
import {
  STREAM_VISIBILITY,
  STREAM_VISIBILITY_DISPLAY,
  type StreamVisibility,
} from "@/lib/constants";
import BackButton from "@/components/global/BackButton";
import { toast } from "sonner";
import {
  ShareIcon,
  LockClosedIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Props = {
  /** 접근 정책 (PUBLIC | PRIVATE | FOLLOWERS) */
  visibility: string;
  /** 뒤로가기 폴백 경로 (기본 /streams) */
  backFallbackHref?: string;
  /** sticky 해제 옵션 */
  sticky?: boolean;
  /** 상단/좌우 패딩 커스터마이즈 */
  className?: string;
};

export default function StreamTopbar({
  visibility,
  backFallbackHref = "/streams",
  sticky = true,
  className = "",
}: Props) {
  // ---- 채팅 열림 상태: 채팅 컴포넌트가 브로드캐스트하는 이벤트를 수신해서 반영 ----
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      if (typeof detail?.open === "boolean") setChatOpen(detail.open);
    };
    window.addEventListener("stream:chat:state", onState as EventListener);
    return () =>
      window.removeEventListener("stream:chat:state", onState as EventListener);
  }, []);

  const openChatFromTopbar = () => {
    // 채팅에게 열라고 브로드캐스트
    const evt = new CustomEvent("stream:chat:open");
    window.dispatchEvent(evt);
    setChatOpen(true);
  };

  // --- 가시성 라벨(타입 안전) ---
  const visLabel =
    STREAM_VISIBILITY_DISPLAY[visibility as StreamVisibility] ?? "공개";

  // --- 가시성 칩 아이콘/색상 ---
  const visChip = (() => {
    if (visibility === STREAM_VISIBILITY.PRIVATE) {
      return {
        icon: <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />,
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      };
    }
    if (visibility === STREAM_VISIBILITY.FOLLOWERS) {
      return {
        icon: <UserGroupIcon className="h-3.5 w-3.5" aria-hidden="true" />,
        className:
          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      };
    }
    // PUBLIC
    return {
      icon: <GlobeAltIcon className="h-3.5 w-3.5" aria-hidden="true" />,
      className:
        "bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light",
    };
  })();

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("링크를 복사했어요.");
      }
    } catch {
      // ignore
    }
  };

  return (
    <header
      className={cn(
        sticky ? "sticky top-0 z-40" : "",
        "h-14 w-full bg-surface/80 backdrop-blur-md border-b border-border transition-colors",
        className
      )}
      role="banner"
    >
      <div className="mx-auto w-full px-3 sm:px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton
            fallbackHref={backFallbackHref}
            variant="inline"
            className="px-0"
          />
          {!chatOpen && (
            <button
              type="button"
              onClick={openChatFromTopbar}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-surface-dim hover:bg-border text-primary transition-colors"
              aria-label="채팅 열기"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              <span>채팅</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              visChip.className
            )}
          >
            {visChip.icon}
            {visLabel}
          </span>

          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            aria-label="공유하기"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
