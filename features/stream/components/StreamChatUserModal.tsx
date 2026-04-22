/**
 * File Name : features/stream/components/StreamChatUserModal.tsx
 * Description : 채팅창 유저 클릭 시 뜨는 미니 프로필 모달 (프로필 이동/신고/차단/강제 퇴장)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   초기 생성
 * 2026.02.05  임도헌   Modified  방장(isHost) 여부에 따른 차단 안내 문구 분기 로직 추가
 * 2026.02.06  임도헌   Modified  차단 성공 시 부모에게 알리는 onBlockSuccess 콜백 추가
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.08  임도헌   Modified  아바타-닉네임 중복 표시와 액션 버튼 정렬 깨짐을 정리
 * 2026.03.13  임도헌   Modified  유저 프로필 진입 시 현재 방송 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  차단 성공 시 로컬 즉시 반영으로 router.refresh를 제거하고 현재 방송 경로 정규화로 nested returnTo 예외를 함께 완화
 * 2026.03.21  임도헌   Modified  createPortal 적용으로 플레이어 오버레이/채팅 패널과의 z-index 충돌을 방지
 * 2026.03.23  임도헌   Modified  최근 스트림 상세 모달 톤에 맞춰 유저 미니 모달 외곽선 강도 정리
 * 2026.04.03  임도헌   Modified  호스트는 전역 차단 대신 방송 전용 강제 퇴장 액션을 사용하도록 분리
 * 2026.04.03  임도헌   Modified  호스트가 강제 퇴장과 유저 차단을 모두 선택할 수 있도록 분리하고 액션 의미 설명을 보강
 * 2026.04.03  임도헌   Modified  호스트용 채팅 금지/해제 액션과 차이 설명을 추가
 * 2026.04.03  임도헌   Modified  라이트/다크 모두에서 액션 의미가 더 분명하게 읽히도록 버튼 톤과 위계를 정리
 * 2026.04.03  임도헌   Modified  전역 유저 차단 확인 문구를 다른 도메인과 같은 정책 설명 톤으로 정리
 * 2026.04.04  임도헌   Modified  호스트 운영 안내 문구를 confirm 문구와 같은 차단 정책 톤으로 미세 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 운영 안내와 액션 버튼 weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 */

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { toggleBlockAction } from "@/features/user/actions/block";
import {
  kickStreamViewerAction,
  toggleStreamChatMuteAction,
} from "@/features/stream/actions/chat";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import {
  ExclamationTriangleIcon,
  NoSymbolIcon,
  UserMinusIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface ChatUser {
  id: number;
  username: string;
  avatar: string | null;
}

interface StreamChatUserModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 함수 */
  onClose: () => void;
  /** 대상 유저 정보 */
  targetUser: ChatUser | null;
  /** 현재 로그인한 유저(나) ID */
  viewerId: number;
  /** 현재 사용자가 이 방송의 호스트(방장)인지 여부 */
  isHost: boolean;
  /** 현재 방송 ID */
  streamId: number;
  /** 대상 유저가 현재 방송에서 채팅 금지 상태인지 여부 */
  isTargetMuted?: boolean;
  /** 차단/강제 퇴장/채팅 금지 성공 시 부모 로컬 상태 즉시 반영용 콜백 */
  onModerationSuccess?: (payload: {
    targetId: number;
    kind: "block" | "kick" | "mute";
    muted?: boolean;
  }) => void;
}

type ModerationIntent = "kick" | "block" | "mute";

/**
 * 스트리밍 채팅방 유저 미니 프로필 모달
 *
 * [기능]
 * 1. 유저의 기본 정보(아바타, 닉네임)를 확인
 * 2. 해당 유저의 전체 프로필 페이지로 이동
 * 3. 일반 시청자는 유저 차단/신고 액션 실행
 * 4. 방장(isHost: true)은 현재 방송 기준 강제 퇴장과 채팅 금지/해제 실행
 * 5. 방장도 라이브 운영 액션과 별개로 전역 유저 차단을 선택할 수 있음
 */
export default function StreamChatUserModal({
  isOpen,
  onClose,
  targetUser,
  viewerId,
  isHost,
  streamId,
  isTargetMuted = false,
  onModerationSuccess,
}: StreamChatUserModalProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [moderationIntent, setModerationIntent] =
    useState<ModerationIntent | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !targetUser || !mounted) return null;
  const isMe = viewerId === targetUser.id;
  const currentSearch = searchParams?.toString();
  const returnTo = sanitizeCallbackUrl(
    `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
  );

  /**
   * 전역 유저 차단 실행
   * - 개인 보호 목적의 차단 관계를 만들고, 팔로우도 함께 정리
   * - 호스트가 실행해도 라이브 운영 액션이 아니라 전역 관계 차단으로 취급
   */
  const handleBlock = () => {
    startTransition(async () => {
      if (!targetUser) return;

      const result = await toggleBlockAction(targetUser.id, "block");

      if (result.success) {
        toast.success(`${targetUser.username}님을 유저 차단했습니다.`);

        onModerationSuccess?.({ targetId: targetUser.id, kind: "block" });

        setIsConfirmOpen(false);
        setModerationIntent(null);
        onClose();
      } else {
        toast.error(result.error ?? "차단 처리에 실패했습니다.");
      }
    });
  };

  /**
   * 방장 전용 강제 퇴장 실행
   * - 전역 차단을 만들지 않고 현재 방송에서만 즉시 이탈시킴
   */
  const handleKick = () => {
    startTransition(async () => {
      if (!targetUser) return;

      const result = await kickStreamViewerAction(streamId, targetUser.id);

      if (result.success) {
        toast.success(`${targetUser.username}님을 방송에서 내보냈습니다.`);
        onModerationSuccess?.({ targetId: targetUser.id, kind: "kick" });
        setIsConfirmOpen(false);
        setModerationIntent(null);
        onClose();
      } else {
        toast.error(
          result.error === "FORBIDDEN"
            ? "호스트만 강제 퇴장을 실행할 수 있습니다."
            : "강제 퇴장 처리에 실패했습니다."
        );
      }
    });
  };

  /**
   * 방장 전용 채팅 금지/해제 실행
   * - 시청은 허용하고 현재 방송에서만 채팅 전송 권한만 토글
   */
  const handleToggleMute = () => {
    startTransition(async () => {
      if (!targetUser) return;

      const intent = isTargetMuted ? "unmute" : "mute";
      const result = await toggleStreamChatMuteAction(
        streamId,
        targetUser.id,
        intent
      );

      if (result.success) {
        toast.success(
          result.muted
            ? `${targetUser.username}님의 채팅을 금지했습니다.`
            : `${targetUser.username}님의 채팅 금지를 해제했습니다.`
        );
        onModerationSuccess?.({
          targetId: targetUser.id,
          kind: "mute",
          muted: result.muted,
        });
        setIsConfirmOpen(false);
        setModerationIntent(null);
        onClose();
      } else {
        toast.error(
          result.error === "FORBIDDEN"
            ? "호스트만 채팅 금지를 변경할 수 있습니다."
            : "채팅 금지 상태를 변경하지 못했습니다."
        );
      }
    });
  };

  const resolvedIntent: ModerationIntent = moderationIntent ?? "block";
  const moderationTitle =
    resolvedIntent === "kick"
      ? `${targetUser.username}님을 강제 퇴장할까요?`
      : resolvedIntent === "mute"
        ? isTargetMuted
          ? `${targetUser.username}님의 채팅 금지를 해제할까요?`
          : `${targetUser.username}님의 채팅을 금지할까요?`
        : `${targetUser.username}님을 유저 차단할까요?`;
  const moderationDescription =
    resolvedIntent === "kick"
      ? "강제 퇴장하면 이 유저는 현재 방송에서 즉시 나가게 됩니다. 전역 차단은 적용되지 않습니다."
      : resolvedIntent === "mute"
        ? isTargetMuted
          ? "채팅 금지를 해제하면 이 유저는 현재 방송에서 다시 메시지를 보낼 수 있습니다."
          : "채팅 금지는 현재 방송에서만 메시지 전송을 막습니다. 시청과 전역 관계에는 영향을 주지 않습니다."
        : "차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.";
  const moderationLabel =
    resolvedIntent === "kick"
      ? "강제 퇴장"
      : resolvedIntent === "mute"
        ? isTargetMuted
          ? "채팅 금지 해제"
          : "채팅 금지"
        : "유저 차단";

  const openConfirm = (intent: ModerationIntent) => {
    setModerationIntent(intent);
    setIsConfirmOpen(true);
  };

  const actionButtonBaseClass =
    "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border px-4 text-sm font-medium transition-colors";
  const profileActionClass =
    "border-brand/15 bg-brand/[0.04] text-brand hover:bg-brand/[0.08] dark:border-brand-light/15 dark:bg-brand-light/[0.08] dark:text-brand-light dark:hover:bg-brand-light/[0.12]";
  const kickActionClass =
    "border-danger/18 bg-danger/[0.045] text-danger hover:bg-danger/[0.08] dark:border-danger/25 dark:bg-danger/[0.1] dark:text-red-300 dark:hover:bg-danger/[0.14]";
  const muteActionClass = isTargetMuted
    ? "border-border bg-surface-dim/70 text-primary hover:bg-surface-dim dark:border-border dark:bg-surface-dim/80 dark:text-primary dark:hover:bg-surface"
    : "border-amber-300/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100/90 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-amber-200 dark:hover:bg-amber-500/[0.12]";
  const blockActionClass =
    "border-border bg-slate-50/95 text-primary hover:bg-slate-100 dark:border-slate-700/85 dark:bg-slate-800/45 dark:text-primary dark:hover:bg-slate-800/60";
  const reportActionClass =
    "border-border bg-surface text-slate-600 hover:bg-surface-dim hover:text-primary dark:border-slate-700/85 dark:bg-surface dark:text-slate-300 dark:hover:bg-surface-dim dark:hover:text-primary";

  const modalContent = (
    <>
      {/* 배경 레이어 */}
      <div
        className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6"
        onClick={onClose}
      >
        {/* 모달 본체 */}
        <div
          className={cn(
            "relative my-auto w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl",
            "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]",
            "bg-surface border border-border-subtle"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <div className="flex justify-end p-2">
            <button
              onClick={onClose}
              className="focus-ring-soft rounded-full p-1 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>

          {/* 프로필 정보 */}
          <div className="flex max-h-[calc(100dvh-2rem)] flex-col items-center overflow-y-auto px-6 pb-7 sm:max-h-[calc(100dvh-3rem)] sm:pb-6">
            <UserAvatar
              avatar={targetUser.avatar}
              username={targetUser.username}
              showUsername={false}
              size="lg"
              disabled
              className="mb-3 ring-1 ring-brand/10 dark:ring-white/6"
            />
            <h3 className="mb-6 text-lg font-bold text-primary">
              {targetUser.username}
            </h3>

            {isHost && !isMe && (
              <div className="mb-5 w-full rounded-2xl border border-border-subtle bg-surface-dim/70 px-4 py-3 text-left dark:bg-surface-dim/55">
                <p className="text-xs font-medium tracking-[0.08em] text-primary">
                  호스트 운영 액션 안내
                </p>
                <div className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
                  <p>
                    <span className="font-medium text-primary">강제 퇴장</span>:
                    현재 방송에서만 즉시 내보냅니다.
                  </p>
                  <p>
                    <span className="font-medium text-primary">채팅 금지</span>:
                    현재 방송에서만 메시지 전송을 막습니다.
                  </p>
                  <p>
                    <span className="font-medium text-primary">유저 차단</span>:
                    라이브 밖 관계까지 끊는 전역 차단입니다.
                  </p>
                </div>
              </div>
            )}

            {/* 액션 버튼 그룹 */}
            <div className="flex w-full flex-col gap-2 px-6 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] sm:pb-6">
              <Link
                href={`/profile/${targetUser.username}?returnTo=${encodeURIComponent(returnTo)}`}
                className={cn(actionButtonBaseClass, profileActionClass)}
              >
                <UserCircleIcon className="size-5" />
                프로필 보기
              </Link>

              {!isMe && (
                <>
                  {isHost ? (
                    <>
                      <button
                        onClick={() => openConfirm("kick")}
                        className={cn(actionButtonBaseClass, kickActionClass)}
                      >
                        <UserMinusIcon className="size-5" />
                        강제 퇴장
                      </button>
                      <button
                        onClick={() => openConfirm("mute")}
                        className={cn(actionButtonBaseClass, muteActionClass)}
                      >
                        <NoSymbolIcon className="size-5" />
                        {isTargetMuted ? "채팅 금지 해제" : "채팅 금지"}
                      </button>
                      <button
                        onClick={() => openConfirm("block")}
                        className={cn(actionButtonBaseClass, blockActionClass)}
                      >
                        <UserMinusIcon className="size-5" />
                        유저 차단
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openConfirm("block")}
                      className={cn(actionButtonBaseClass, blockActionClass)}
                    >
                      <UserMinusIcon className="size-5" />
                      차단하기
                    </button>
                  )}
                  <button
                    onClick={() => setReportOpen(true)}
                    className={cn(actionButtonBaseClass, reportActionClass)}
                  >
                    <ExclamationTriangleIcon className="size-5" />
                    신고하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 차단 최종 확인 다이얼로그 */}
      <ConfirmDialog
        open={isConfirmOpen}
        title={moderationTitle}
        description={moderationDescription}
        confirmLabel={moderationLabel}
        cancelLabel="취소"
        onConfirm={
          resolvedIntent === "kick"
            ? handleKick
            : resolvedIntent === "mute"
              ? handleToggleMute
              : handleBlock
        }
        onCancel={() => {
          setIsConfirmOpen(false);
          setModerationIntent(null);
        }}
        loading={isPending}
      />
      {/* 신고 모달 */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => {
          setReportOpen(false);
          onClose();
        }}
        targetId={targetUser.id}
        targetType="USER"
      />
    </>
  );

  return createPortal(modalContent, document.body);
}
