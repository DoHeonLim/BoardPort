/**
 * File Name : features/stream/components/StreamTopBar.tsx
 * Description : 스트리밍 상세 상단바(뒤로가기 + 가시성 칩 + 공유 + 데스크톱 채팅/옵션 액션)
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
 * 2026.04.07  임도헌   Modified  호스트가 라이브 중 제목/설명만 빠르게 수정할 수 있는 상단 관리 메뉴를 추가
 * 2026.04.08  임도헌   Modified  방송 정보 수정 결과를 로컬 상태와 실시간 브로드캐스트 흐름에 맞춰 즉시 반영하도록 보강
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.20  임도헌   Modified  스트림 상세 상단바 배경을 surface 톤으로 맞춰 플레이어 위에서도 더 단단한 표면으로 읽히게 정리
 * 2026.05.28  임도헌   Modified  모바일 방송 정보 진입을 상단바 상태로 이관하고 상단 액션 밀도 축소
 * 2026.05.29  임도헌   Modified  상단 옵션 메뉴에 방송국 이동 액션 추가
 * 2026.05.29  임도헌   Modified  모바일 옵션 메뉴 판정과 모바일/데스크톱 채팅 진입점 분리
 * 2026.09.03  임도헌   Modified  방송 상세 뒤로가기가 정규화된 목록 문맥을 우선하도록 고정
 */

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
  PencilSquareIcon,
  LockClosedIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
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
import EditStreamMetaModal from "@/features/stream/components/EditStreamMetaModal";

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
  /** 현재 방송 설명 */
  description?: string | null;
  /** 본인 방송 여부 */
  isOwner?: boolean;
  /** 뒤로가기 폴백 경로 (기본 /streams) */
  backFallbackHref?: string;
  /** 상단/좌우 패딩 커스터마이즈 */
  className?: string;
  /** 채팅 열림 상태 */
  isChatOpen: boolean;
  /** 채팅 열기 핸들러 */
  onOpenChat: () => void;
  /** 방송 메타 수정 직후 로컬 상태 반영 */
  onStreamMetaUpdated?: (next: {
    title: string;
    description: string | null;
  }) => void;
};

/**
 * 스트리밍 상세 상단바(Topbar) 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - 스트림 상세 Client Shell에서 내려주는 채팅 열림 상태를 기반으로 데스크톱 상단바 채팅 열기 버튼 노출 여부를 제어
 * - 방송 권한(Public/Private/Followers) 속성에 따른 동적 뱃지 렌더링 적용
 * - 방송국 이동, 스트리머 차단(`toggleBlockAction`), 방송 신고 모달(`ReportModal`) 연동
 * - 호스트는 상단 메뉴에서 방송국 이동과 방송 제목/설명 수정을 수행하고 저장 직후 로컬 상세 상태를 즉시 갱신
 * - 뒤로가기 버튼(`BackButton`) 및 고유 URL 복사를 위한 공유하기(`handleShare`) 기능 포함
 */
export default function StreamTopbar({
  streamId,
  ownerId,
  ownerUsername,
  title,
  visibility,
  description,
  isOwner = false,
  backFallbackHref = "/streams",
  className = "",
  isChatOpen,
  onOpenChat,
  onStreamMetaUpdated,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile(1024);
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

  const handleOpenEdit = () => {
    setMenuOpen(false);
    setEditOpen(true);
  };

  const handleGoToChannel = () => {
    setMenuOpen(false);
    router.push(`/profile/${encodeURIComponent(ownerUsername)}/channel`);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-12 w-full border-b border-border-subtle bg-surface transition-colors lg:h-14",
        className
      )}
      role="banner"
    >
      <div className="flex h-full w-full items-center justify-between px-2.5 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <BackButton
            fallbackHref={backFallbackHref}
            preferFallback
            variant="appbar"
            className="h-10 w-10 rounded-lg px-0 lg:h-11 lg:w-11 lg:rounded-xl"
          />
          {!isChatOpen && (
            <button
              type="button"
              onClick={openChatFromTopbar}
              className="focus-ring-soft hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-border-subtle bg-surface text-muted transition-colors hover:bg-surface-dim hover:text-primary lg:inline-flex lg:px-3.5"
              aria-label="채팅 열기"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              <span className="hidden lg:inline">채팅</span>
            </button>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span
            className={cn(
              "inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium sm:px-3.5 lg:min-h-[36px]",
              visChip.className
            )}
          >
            {visChip.icon}
            {visLabel}
          </span>

          <button
            type="button"
            onClick={() => handleShare(`${ownerUsername}님의 방송: ${title}`)}
            className="focus-ring-soft inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-muted/80 transition-colors hover:bg-surface-dim hover:text-primary lg:min-h-[40px] lg:min-w-[40px]"
            aria-label="공유하기"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
          {/* 호스트/시청자별 상단 옵션 메뉴 */}
          {isOwner ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="방송 관리 메뉴 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
                className="focus-ring-soft inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary lg:min-h-[40px] lg:min-w-[40px]"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>
              {!isMobile && menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl"
                >
                  <button
                    type="button"
                    onClick={handleGoToChannel}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
                  >
                    <HomeIcon className="size-4" />
                    방송국으로 이동
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
                  >
                    <PencilSquareIcon className="size-4" />
                    방송 정보 수정
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="방송 옵션 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
                className="focus-ring-soft inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary lg:min-h-[40px] lg:min-w-[40px]"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>
              {!isMobile && menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl z-50"
                >
                  <button
                    type="button"
                    onClick={handleGoToChannel}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
                  >
                    <HomeIcon className="size-4" />
                    방송국으로 이동
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/5"
                  >
                    <UserMinusIcon className="size-4" /> 스트리머 차단하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
                  >
                    <ExclamationTriangleIcon className="size-4" /> 방송 신고하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwner ? (
        <BottomSheet
          open={isMobile && menuOpen}
          title="방송 관리"
          description="방송국으로 이동하거나 라이브 중 제목과 설명을 수정할 수 있습니다."
          onClose={() => setMenuOpen(false)}
        >
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleGoToChannel}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              <HomeIcon className="size-5 shrink-0" />
              방송국으로 이동
            </button>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              <PencilSquareIcon className="size-5 shrink-0" />
              방송 정보 수정
            </button>
          </div>
        </BottomSheet>
      ) : (
        <BottomSheet
          open={isMobile && menuOpen}
          title="방송 옵션"
          description="방송국으로 이동하거나 스트리머 차단, 방송 신고를 진행할 수 있습니다."
          onClose={() => setMenuOpen(false)}
        >
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleGoToChannel}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              <HomeIcon className="size-5 shrink-0" />
              방송국으로 이동
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setBlockConfirmOpen(true);
              }}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
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
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              <ExclamationTriangleIcon className="size-5 shrink-0" />
              방송 신고하기
            </button>
          </div>
        </BottomSheet>
      )}

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
      <EditStreamMetaModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        streamId={streamId}
        initialTitle={title}
        initialDescription={description}
        onSaved={(next) => onStreamMetaUpdated?.(next)}
      />
    </header>
  );
}
