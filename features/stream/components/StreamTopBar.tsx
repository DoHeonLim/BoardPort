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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  스트리머 차단 및 방송 신고 통합 메뉴 구현
 * 2026.02.13  임도헌   Modified  로컬 handleShare 제거 및 lib/utils 통합
 * 2026.03.04  임도헌   Modified  stream:chat:state/open CustomEvent 제거 및 useStreamChatUIStore 기반 채팅 열기 상태 연동
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useState, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleBlockAction } from "@/features/user/actions/block";
import {
  EllipsisVerticalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  LockClosedIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import BackButton from "@/components/global/BackButton";
import { useStreamChatUIStore } from "@/components/global/providers/StreamChatUIStoreProvider";
import {
  STREAM_VISIBILITY,
  STREAM_VISIBILITY_DISPLAY,
} from "@/features/stream/constants";
import { cn, handleShare } from "@/lib/utils";
import type { StreamVisibility } from "@/features/stream/types";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

type Props = {
  streamId: number;
  ownerId: number;
  ownerUsername: string;
  title: string;
  /** 접근 정책 (PUBLIC | PRIVATE | FOLLOWERS) */
  visibility: StreamVisibility;
  /** 본인 방송 여부 */
  isOwner?: boolean; // 본인 방송 여부
  /** 뒤로가기 폴백 경로 (기본 /streams) */
  backFallbackHref?: string;
  /** 상단/좌우 패딩 커스터마이즈 */
  className?: string;
};

/**
 * 스트리밍 상세 상단바(Topbar) 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - `useStreamChatUIStore` 전역 상태를 활용한 모바일 채팅창 토글(열기) 기능 제공
 * - 방송 권한(Public/Private/Followers) 속성에 따른 동적 뱃지 렌더링 적용
 * - 스트리머 차단(`toggleBlockAction`) 및 방송 신고 모달(`ReportModal`) 연동
 * - 뒤로가기 버튼(`BackButton`) 및 고유 URL 복사를 위한 공유하기(`handleShare`) 기능 포함
 */
export default function StreamTopbar({
  streamId,
  ownerId,
  ownerUsername,
  title,
  visibility,
  isOwner = false,
  backFallbackHref = "/streams",
  className = "",
}: Props) {
  const router = useRouter();
  // ---- 채팅 열림 상태: 채팅 컴포넌트가 브로드캐스트하는 이벤트를 수신해서 반영 ----
  const chatOpen = useStreamChatUIStore((s) => s.isChatOpen);
  const openChat = useStreamChatUIStore((s) => s.openChat);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const openChatFromTopbar = () => {
    openChat();
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

  const handleBlock = () => {
    startTransition(async () => {
      const result = await toggleBlockAction(ownerId, "block");
      if (result.success) {
        toast.success(`${ownerUsername}님을 차단했습니다.`);
        router.replace("/streams");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-14 w-full bg-surface/80 backdrop-blur-md border-b border-border transition-colors",
        className
      )}
      role="banner"
    >
      <div className="mx-auto w-full px-3 sm:px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton
            fallbackHref={backFallbackHref}
            variant="appbar"
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
            onClick={() => handleShare(`${ownerUsername}님의 방송: ${title}`)}
            className="p-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            aria-label="공유하기"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          {/* 스트리머 외 다른 유저 메뉴*/}
          {!isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-muted hover:text-primary rounded-full hover:bg-surface-dim"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2"
                  >
                    <UserMinusIcon className="size-4" /> 스트리머 차단하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-border"
                  >
                    <ExclamationTriangleIcon className="size-4" /> 방송 신고하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${ownerUsername}님을 차단할까요?`}
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={streamId}
        targetType="STREAM"
      />
    </header>
  );
}
