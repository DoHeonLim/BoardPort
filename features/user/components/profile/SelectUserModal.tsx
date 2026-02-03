/**
 * File Name : features/user/components/profile/SelectUserModal.tsx
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
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/global/UserAvatar";
import { cn } from "@/lib/utils";
import { getProductChatUsersAction } from "@/features/product/actions/chat";
import { ChatUser } from "@/features/chat/types";

interface SelectUserModalProps {
  productId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 상위에서 서버 처리(상태 변경) 후, 닫아도 되는지(true/false)를 결정하는 콜백 */
  onConfirm?: (reservationUserId: number) => Promise<boolean> | boolean;
}

/**
 * 예약자 선택 모달
 *
 * [기능]
 * 1. 특정 제품에 대해 판매자와 채팅을 나눈 유저 목록을 조회합니다.
 * 2. 판매자가 목록 중 한 명을 선택하여 '예약자'로 지정할 수 있게 합니다.
 * 3. 중복 선택 방지 및 로딩/에러 상태를 처리합니다.
 */
export default function SelectUserModal({
  productId,
  isOpen,
  onOpenChange,
  onConfirm,
}: SelectUserModalProps) {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null); // 현재 처리 중인 유저 ID
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 1. ESC 키 이벤트 리스너 (모달 닫기)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onOpenChange]);

  // 2. 모달 오픈 시 채팅 참여 유저 목록 로드 (Lazy Loading)
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 서버 액션을 통해 해당 상품의 채팅 참여자 목록을 가져옴
        const users = await getProductChatUsersAction(productId);
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

  /**
   * 유저 선택 핸들러
   * - `onConfirm` 콜백을 호출하여 부모 컴포넌트에서 비즈니스 로직(상태 변경 등)을 수행하도록 위임합니다.
   */
  const handleUserSelect = useCallback(
    async (selectUserId: number) => {
      if (isProcessingId !== null) return; // 중복 클릭 방지
      setIsProcessingId(selectUserId);
      setError(null);
      try {
        const ok = await onConfirm?.(selectUserId);
        // 부모의 처리가 성공적이면 모달을 닫음
        if (ok) onOpenChange(false);
      } catch (e) {
        console.error("예약 처리 중 오류:", e);
        setError("예약 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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

      {/* Dialog Content */}
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

        {/* Body (User List) */}
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
