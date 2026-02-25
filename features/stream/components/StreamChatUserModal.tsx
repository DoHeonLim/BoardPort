/**
 * File Name : features/stream/components/StreamChatUserModal.tsx
 * Description : 채팅창 유저 클릭 시 뜨는 미니 프로필 모달 (차단/프로필 이동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   초기 생성
 * 2026.02.05  임도헌   Modified  방장(isHost) 여부에 따른 차단 안내 문구 분기 로직 추가
 * 2026.02.06  임도헌   Modified  차단 성공 시 부모에게 알리는 onBlockSuccess 콜백 추가
 */

"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleBlockAction } from "@/features/user/actions/block";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import {
  ExclamationTriangleIcon,
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
  /** 차단 성공 시 호출할 콜백 */
  onBlockSuccess?: (targetId: number) => void;
}

/**
 * 스트리밍 채팅방 유저 미니 프로필 모달
 *
 * [기능]
 * 1. 유저의 기본 정보(아바타, 닉네임)를 확인
 * 2. 해당 유저의 전체 프로필 페이지로 이동
 * 3. 유저 차단 가능
 *    - 방장(isHost: true)이 차단할 경우: 유저는 즉시 강제 퇴장(Kick) 처리
 *    - 일반 시청자가 차단할 경우: 개인적인 차단(Mute) 처리가 수행
 */
export default function StreamChatUserModal({
  isOpen,
  onClose,
  targetUser,
  viewerId,
  isHost,
  onBlockSuccess,
}: StreamChatUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!isOpen || !targetUser) return null;
  const isMe = viewerId === targetUser.id;

  /**
   * 차단 실행 로직
   * 1. toggleBlockAction(Server Action)을 호출
   * 2. 성공 시 토스트 메시지를 표시하고 모달을 닫음
   * 3. 방장이 차단한 경우, 대상 유저의 화면에서는 StreamBlockGuard가 작동하여 즉시 퇴장 처리
   */
  const handleBlock = () => {
    startTransition(async () => {
      if (!targetUser) return;

      const result = await toggleBlockAction(targetUser.id, "block");

      if (result.success) {
        toast.success(`${targetUser.username}님을 차단했습니다.`);

        // 차단 성공 시 부모에게 알림
        onBlockSuccess?.(targetUser.id);

        setIsConfirmOpen(false);
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "차단 처리에 실패했습니다.");
      }
    });
  };

  // 방장 여부에 따른 안내 문구 결정
  const blockDescription = isHost
    ? "차단하면 이 유저는 방송에서 강제 퇴장되며, 더 이상 방송을 시청하거나 채팅에 참여할 수 없습니다."
    : "차단하면 이 유저의 채팅이 보이지 않으며, 서로 팔로우가 취소됩니다.";

  return (
    <>
      {/* 배경 레이어 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        {/* 모달 본체 */}
        <div
          className={cn(
            "relative w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl animate-fade-in",
            "bg-surface border border-border"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <div className="flex justify-end p-2">
            <button
              onClick={onClose}
              className="p-1 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>

          {/* 프로필 정보 */}
          <div className="flex flex-col items-center px-6 pb-6">
            <UserAvatar
              avatar={targetUser.avatar}
              username={targetUser.username}
              size="lg"
              disabled
              className="mb-3 ring-4 ring-surface-dim"
            />
            <h3 className="mb-6 text-lg font-bold text-primary">
              {targetUser.username}
            </h3>

            {/* 액션 버튼 그룹 */}
            <div className="flex w-full flex-col gap-2 px-6 pb-6">
              <Link
                href={`/profile/${targetUser.username}`}
                className="btn-secondary h-11 w-full gap-2"
              >
                <UserCircleIcon className="size-5" />
                프로필 보기
              </Link>

              {!isMe && (
                <>
                  <button
                    onClick={() => setIsConfirmOpen(true)}
                    className="btn-secondary h-11 w-full gap-2 text-danger border-danger/30 hover:bg-danger/5"
                  >
                    <UserMinusIcon className="size-5" />
                    차단하기
                  </button>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="btn-secondary h-11 w-full gap-2 text-muted hover:text-primary"
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
        title={`${targetUser.username}님을 차단할까요?`}
        description={blockDescription}
        confirmLabel="차단"
        cancelLabel="취소"
        onConfirm={handleBlock}
        onCancel={() => setIsConfirmOpen(false)}
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
}
