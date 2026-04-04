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
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet로 전환하고 트리거 접근성을 보강
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 버튼/칩 스타일을 공통 규칙으로 통일
 * 2026.03.13  임도헌   Modified  차단/복귀 흐름에서 returnTo fallback을 정리
 * 2026.03.20  임도헌   Modified  full-width 스트림 셸에 맞춰 상단바 톤과 정렬 폭을 현재 상세 구조에 맞게 재정리
 * 2026.03.24  임도헌   Modified  스트림 상세 전용 로컬 state로 채팅 열림 상태를 props 기반으로 단순화
 * 2026.04.03  임도헌   Modified  스트리머 차단/방송 신고 액션 색 위계를 다른 도메인 옵션 메뉴와 같은 문법으로 정리
 * 2026.04.03  임도헌   Modified  스트리머 차단 확인 문구를 다른 도메인과 같은 전역 차단 정책 톤으로 정리
 */

"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
import BottomSheet from "@/components/global/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  /** 채팅 열림 상태 */
  isChatOpen: boolean;
  /** 상단바 채팅 열기 */
  onOpenChat: () => void;
};

/**
 * 스트리밍 상세 상단바(Topbar) 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - 스트림 상세 Client Shell에서 내려주는 채팅 열림 상태를 기반으로 상단바 채팅 열기 버튼 노출 여부를 제어
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
  isChatOpen,
  onOpenChat,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const openChatFromTopbar = () => {
    onOpenChat();
  };

  useEffect(() => {
    if (isMobile || !menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, menuOpen]);

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
      const nextHref = backFallbackHref;

      const result = await toggleBlockAction(ownerId, "block", nextHref);
      if (result.success) {
        toast.success(`${ownerUsername}님을 차단했습니다.`);
        router.replace(nextHref);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-14 w-full border-b border-border-subtle bg-background/95 transition-colors",
        className
      )}
      role="banner"
    >
      <div className="flex h-full w-full items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <BackButton
            fallbackHref={backFallbackHref}
            variant="appbar"
            className="px-0"
          />
          {!isChatOpen && (
            <button
              type="button"
              onClick={openChatFromTopbar}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3.5 text-sm font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
              aria-label="채팅 열기"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              <span>실시간 채팅</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
              visChip.className
            )}
          >
            {visChip.icon}
            {visLabel}
          </span>

          <button
            type="button"
            onClick={() => handleShare(`${ownerUsername}님의 방송: ${title}`)}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-muted/80 transition-colors hover:bg-surface-dim hover:text-primary"
            aria-label="공유하기"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          {/* 스트리머 외 다른 유저 메뉴*/}
          {!isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="방송 옵션 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>
              {!isMobile && menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl z-50"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2"
                  >
                    <UserMinusIcon className="size-4" /> 스트리머 차단하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2 border-t border-border-subtle"
                  >
                    <ExclamationTriangleIcon className="size-4" /> 방송 신고하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomSheet
        open={isMobile && menuOpen}
        title="방송 옵션"
        description="스트리머 차단 또는 방송 신고를 진행할 수 있습니다."
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setBlockConfirmOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <UserMinusIcon className="size-5 shrink-0" />
            스트리머 차단하기
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <ExclamationTriangleIcon className="size-5 shrink-0" />
            방송 신고하기
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${ownerUsername}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`}
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
