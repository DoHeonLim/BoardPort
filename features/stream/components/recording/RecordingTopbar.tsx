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
 * 2026.03.13  임도헌   Modified  스트리머 차단 성공 후 returnTo 또는 다시보기 목록 fallback 경로로 복귀하도록 보강
 * 2026.03.14  임도헌   Modified  녹화 상세 상단바를 flat 헤더 톤으로 정리하고 subtle 보더 기준으로 통일
 * 2026.03.18  임도헌   Modified  차단 후 다른 경로로 이동하는 흐름에서 중복 router.refresh를 제거해 재요청 최소화
 * 2026.03.19  임도헌   Modified  카테고리 칩과 공유 버튼의 시각적 가중치를 한 단계 낮춰 모바일 우측 액션 밀도를 완화
 * 2026.03.25  임도헌   Modified  owner 전용 녹화 삭제 액션을 상단 메뉴로 이동해 상세 본문 시청 흐름을 단순화
 * 2026.04.03  임도헌   Modified  다시보기 상단 옵션의 차단/신고 위계와 삭제 문구를 다른 도메인과 같은 액션 문법으로 정리
 * 2026.04.08  임도헌   Modified  녹화 삭제 후 목록/채널 진입 문맥이면 back + 1회 refresh로 복귀하도록 정리
 * 2026.04.24  임도헌   Modified  녹화 삭제의 back/replace 복귀 조건이 현재 정책 기준으로 드러나도록 주석 보강
 * 2026.04.24  임도헌   Modified  내 프로필 방송국에서 진입한 녹화 삭제도 back + refresh 복귀 대상으로 포함
 * 2026.04.24  임도헌   Modified  navigation refresh helper 기준으로 녹화 삭제 후 back 복귀 플래그 기록 중복을 정리
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
  TrashIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import UserAvatar from "@/components/global/UserAvatar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn, handleShare } from "@/lib/utils";
import {
  canUseBrowserBack,
  markNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

/**
 * 녹화 삭제 후 `router.back()`으로 복귀해도 안전한 내부 목록 문맥인지 판별
 *
 * - `/streams...`: 메인 라이브/다시보기 목록
 * - `/profile`: 내 프로필의 "내 방송국" 섹션
 * - `/profile/{username}/channel`: 유저 채널 다시보기 섹션
 *
 * 그 외 경로는 삭제 후 복귀 위치를 예측하기 어려우므로 replace fallback 사용
 */
function isSafeRecordingReturnTarget(href: string) {
  return (
    href.startsWith("/streams") ||
    /^\/profile(?:\?|$)/.test(href) ||
    /^\/profile\/[^/]+\/channel(?:\?|$)/.test(href)
  );
}

interface RecordingTopbarProps {
  broadcastId: number;
  ownerId: number;
  username: string;
  avatar: string | null;
  isOwner?: boolean;
  /** 뒤로가기/삭제 완료 후 돌아갈 내부 경로. 기본값은 다시보기 목록이다. */
  backHref?: string;
  liveInputUid?: string | null;
  /** 방송 카테고리 표시용 라벨 */
  categoryLabel?: string | null;
  categoryIcon?: string | null;
  /** 명시적 returnTo 문맥에서 삭제 후 router.back() 복귀를 허용할지 여부 */
  preferHistoryBack?: boolean;
}

/**
 * 녹화본 상세 페이지 상단바
 * - 좌측에 뒤로가기 버튼과 작성자 프로필을 배치
 * - 우측에 카테고리 칩, 공유 버튼, 소유자/시청자별 옵션 메뉴를 노출
 * - 소유자는 녹화 삭제, 시청자는 스트리머 차단/다시보기 신고 액션을 실행
 * - 녹화 삭제는 목록/채널/내 프로필 문맥이 명시된 경우에만 back을 재사용하고, 그 외에는 replace 복귀를 사용
 * - 스크롤 중에도 상단에 고정되어 상세 액션 접근을 유지
 */
export default function RecordingTopbar({
  broadcastId,
  ownerId,
  username,
  avatar,
  isOwner,
  backHref = "/streams",
  liveInputUid,
  categoryLabel,
  categoryIcon,
  preferHistoryBack = false,
}: RecordingTopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
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
      const nextHref = backHref;

      const res = await toggleBlockAction(ownerId, "block", nextHref);
      if (res.success) {
        toast.success(`${username}님을 차단했습니다.`);
        router.replace(nextHref);
      } else {
        toast.error(res.error);
      }
      setBlockConfirmOpen(false);
      setMenuOpen(false);
    });
  };

  const handleDelete = async () => {
    if (!liveInputUid) {
      toast.error("삭제할 녹화 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/streams/${broadcastId}/delete?uid=${encodeURIComponent(liveInputUid)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        toast.error(
          data?.error ??
            "녹화 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      toast.success("녹화를 삭제했습니다.");
      setDeleteConfirmOpen(false);
      setMenuOpen(false);

      const canReturnWithHistory =
        preferHistoryBack &&
        canUseBrowserBack() &&
        isSafeRecordingReturnTarget(backHref);

      if (canReturnWithHistory) {
        // 삭제 후에는 기존 목록/채널/프로필 히스토리 엔트리로 돌아가고,
        // 복귀 화면에서만 1회 router.refresh()를 실행해 stale 목록 보정
        markNavigationRefresh(NAVIGATION_REFRESH_SCOPES.RECORDING_LIST, backHref);
        router.back();
        return;
      }

      router.replace(backHref || `/profile/${username}/channel`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        "녹화 삭제 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full h-14",
        "border-b border-border-subtle bg-background shadow-sm transition-colors"
      )}
      role="banner"
    >
      <div className="mx-auto w-full max-w-mobile h-full flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton
            fallbackHref={backHref}
            variant="appbar"
            className="px-0"
          />
          <UserAvatar username={username} avatar={avatar} size="sm" compact />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {categoryLabel && (
            <div
              className={cn(
                "appbar-chip hidden px-2.5 sm:inline-flex",
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
            className="appbar-icon-btn text-muted/80 hover:bg-surface-dim/70"
            aria-label="다시보기 공유하기"
          >
            <ShareIcon className="size-5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={isOwner ? "녹화 관리 메뉴 열기" : "다시보기 옵션 열기"}
              aria-expanded={menuOpen}
              aria-haspopup={isMobile ? "dialog" : "menu"}
              className="appbar-icon-btn"
            >
              <EllipsisVerticalIcon className="size-5" />
            </button>
            {!isMobile && menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl"
              >
                {isOwner ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/5"
                  >
                    <TrashIcon className="size-4" /> 녹화 삭제
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setBlockConfirmOpen(true);
                      }}
                      role="menuitem"
                      className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/5"
                    >
                      <UserMinusIcon className="size-4" /> 스트리머 차단
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                      role="menuitem"
                      className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
                    >
                      <ExclamationTriangleIcon className="size-4" /> 다시보기 신고
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomSheet
        open={isMobile && menuOpen}
        title={isOwner ? "녹화 관리" : "다시보기 옵션"}
        description={
          isOwner
            ? "이 녹화본을 삭제할 수 있습니다."
            : "스트리머 차단 또는 다시보기 신고를 진행할 수 있습니다."
        }
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          {isOwner ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <TrashIcon className="size-5 shrink-0" />
              녹화 삭제
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setBlockConfirmOpen(true);
                }}
                className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
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
                className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
              >
                <ExclamationTriangleIcon className="size-5 shrink-0" />
                다시보기 신고
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="녹화를 삭제할까요?"
        description="삭제한 녹화는 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={isDeleting}
      />

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${username}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`}
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
