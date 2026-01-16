/**
 * File Name : components/profile/SelectUserModal
 * Description : 예약자 선택 모달 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.02  임도헌   Created
 * 2024.12.02  임도헌   Modified  예약자 선택 모달 컴포넌트 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.22  임도헌   Modified  이벤트 버블링을 방지하기 위해 e.stopPropagation() 추가
 * 2024.12.29  임도헌   Modified  예약자 선택 모달 스타일 수정
 * 2025.10.19  임도헌   Modified  lib 분리(getProductChatUsers) + UX 보강(ESC/오버레이/로딩/오류/중복방지) + onSelected 콜백
 * 2025.10.20  임도헌   Modified  서버호출 상위 위임(onConfirm)으로 낙관/롤백 일관화
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 디자인 시스템 통일
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "../global/UserAvatar";
import {
  getProductChatUsers,
  type ChatUser,
} from "@/lib/product/getProductChatUsers";
import { cn } from "@/lib/utils";

interface SelectUserModalProps {
  productId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // 상위에서 서버 처리 후, 닫아도 되는지(true) 아닌지(false) 결정
  onConfirm?: (reservationUserId: number) => Promise<boolean> | boolean;
}
export default function SelectUserModal({
  productId,
  isOpen,
  onOpenChange,
  onConfirm,
}: SelectUserModalProps) {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onOpenChange]);

  // 열릴 때만 채팅 유저 로드
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const users = await getProductChatUsers(productId);
        if (mounted) setChatUsers(users);
      } catch (e) {
        console.error("Failed to fetch chat users:", e);
        if (mounted) setError("채팅 유저를 불러오지 못했어요.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, productId]);

  const handleUserSelect = useCallback(
    async (selectUserId: number) => {
      if (isProcessingId !== null) return;
      setIsProcessingId(selectUserId);
      setError(null);
      try {
        const ok = await onConfirm?.(selectUserId);
        if (ok) onOpenChange(false);
        onOpenChange(false);
      } catch (e) {
        console.error("예약 처리 중 오류:", e);
        setError(
          "예약 처리에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
        );
      } finally {
        setIsProcessingId(null);
      }
    },
    [isProcessingId, onOpenChange, onConfirm]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="select-user-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-md rounded-2xl shadow-xl animate-fade-in mx-4 overflow-hidden",
          "bg-surface border border-border"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-dim/30">
          <h2 id="select-user-title" className="text-lg font-bold text-primary">
            예약자 선택
          </h2>
          <p className="mt-1 text-xs text-muted">
            이 제품에 대해 채팅한 유저 중 예약자를 선택해주세요.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center text-sm text-muted py-8">
              <span className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2 align-middle" />
              로딩 중...
            </div>
          ) : error ? (
            <div className="text-center text-sm text-danger py-4">{error}</div>
          ) : chatUsers.length === 0 ? (
            <div className="text-center text-muted py-8 bg-surface-dim rounded-xl border border-border border-dashed">
              <p className="text-sm">아직 채팅한 유저가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {chatUsers.map((user) => {
                const busy = isProcessingId === user.id;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-dim hover:bg-border/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatar={user.avatar}
                        username={user.username}
                        size="md"
                        disabled
                      />
                    </div>
                    <button
                      className="btn-primary h-9 text-xs px-4 shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserSelect(user.id);
                      }}
                      disabled={busy || isProcessingId !== null}
                      aria-busy={busy}
                    >
                      {busy ? "처리중..." : "선택"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-dim/30 flex justify-end">
          <button
            className="btn-secondary h-10 text-sm border-transparent hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
