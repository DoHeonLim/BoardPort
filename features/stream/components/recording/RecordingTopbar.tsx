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
 * 2026.02.05  임도헌   Modified  스트리머 차단 및 VOD 신고 통합 메뉴 구현
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 버튼/칩 스타일을 공통 규칙으로 통일하고 모바일 옵션 시트를 추가
 */

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleBlockAction } from "@/features/user/actions/block";
import {
  EllipsisVerticalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import UserAvatar from "@/components/global/UserAvatar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn, handleShare } from "@/lib/utils";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface RecordingTopbarProps {
  broadcastId: number;
  ownerId: number;
  username: string;
  avatar: string | null;
  isOwner?: boolean;
  backHref?: string; // 기본: /streams
  categoryLabel?: string | null; /** 방송 카테고리 표시용 (선택) */
  categoryIcon?: string | null;
}

/**
 * 녹화본 상세 페이지 상단바
 * - 좌측: 뒤로가기 버튼 + 작성자 프로필(아바타)
 * - 우측: 카테고리 칩 (선택적)
 * - 스크롤 시 상단에 고정(Sticky)
 */
export default function RecordingTopbar({
  broadcastId,
  ownerId,
  username,
  avatar,
  isOwner,
  categoryLabel,
  categoryIcon,
}: RecordingTopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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

  const handleBlock = () => {
    startTransition(async () => {
      const res = await toggleBlockAction(ownerId, "block");
      if (res.success) {
        toast.success(`${username}님을 차단했습니다.`);
        router.replace("/streams");
        router.refresh();
      } else {
        toast.error(res.error);
      }
      setBlockConfirmOpen(false);
      setMenuOpen(false);
    });
  };

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
            fallbackHref="/streams"
            variant="appbar"
            className="px-0"
          />
          <UserAvatar username={username} avatar={avatar} size="sm" compact />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {categoryLabel && (
            <div
              className={cn(
                "appbar-chip hidden sm:inline-flex",
                "bg-surface-dim text-muted border border-transparent"
              )}
            >
              {categoryIcon && <span aria-hidden="true">{categoryIcon}</span>}
              <span>{categoryLabel}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => handleShare(`${username}님의 다시보기`)}
            className="appbar-icon-btn"
            aria-label="다시보기 공유하기"
          >
            <ShareIcon className="size-5" />
          </button>
          {!isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="다시보기 옵션 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
                className="appbar-icon-btn"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>
              {!isMobile && menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2"
                  >
                    <UserMinusIcon className="size-4" /> 스트리머 차단
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-border"
                  >
                    <ExclamationTriangleIcon className="size-4" /> 다시보기 신고
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomSheet
        open={isMobile && menuOpen}
        title="다시보기 옵션"
        description="스트리머 차단 또는 다시보기 신고를 진행할 수 있습니다."
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setBlockConfirmOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <UserMinusIcon className="size-5 shrink-0" />
            스트리머 차단
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <ExclamationTriangleIcon className="size-5 shrink-0" />
            다시보기 신고
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${username}님을 차단할까요?`}
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />
      {/* VOD 신고는 부모 Broadcast ID 또는 VOD ID를 targetId로 사용 (여기선 STREAM 타입 활용) */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={broadcastId}
        targetType="STREAM"
      />
    </header>
  );
}
