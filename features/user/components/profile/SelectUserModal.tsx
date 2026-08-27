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
 * 2026.03.22  임도헌   Modified  최근 프로필 모달 톤에 맞춰 외곽선/헤더/푸터 보더 강도와 높이 제한 정리
 * 2026.03.23  임도헌   Modified  데스크톱에서 리스트형 모달이 답답하지 않도록 폭을 한 단계 확장
 * 2026.03.26  임도헌   Modified  예약자 선택 모달의 정보 위계, 로딩/에러 상태, 모바일 터치 밀도 정리
 * 2026.03.26  임도헌   Modified  UserAvatar가 이미 닉네임을 표시하므로 예약자 행의 중복 이름 표시 제거
 * 2026.03.26  임도헌   Modified  유저 행 설명 문구를 제거해 예약자 선택 리스트를 더 간결하게 정리
 * 2026.03.26  임도헌   Modified  보조 버튼/카운트 칩의 외곽선 대비를 보강해 라이트모드 가시성 개선
 * 2026.03.26  임도헌   Modified  다크모드에서 선택 버튼이 과하게 검게 떠 보이지 않도록 표면 톤 정리
 * 2026.04.07  임도헌   Modified  모바일에서는 BottomSheet를 사용해 예약자 선택 흐름을 하단 시트로 정리
 * 2026.04.10  임도헌   Modified  profile 타이포 정책에 맞춰 예약자 선택 모달의 상태 라벨과 CTA weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.06.18  임도헌   Modified  모달 보조/닫기 버튼 톤을 공통 secondary modal 스타일로 통일
 * 2026.06.19  임도헌   Modified  데스크톱 X 닫기를 추가하고 푸터 닫기 버튼을 제거해 닫기 동작 통일
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 */

import { useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/global/UserAvatar";
import BottomSheet from "@/components/global/BottomSheet";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { getProductChatUsersAction } from "@/features/product/actions/chat";
import { ChatUser } from "@/features/chat/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";

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
 * 1. 특정 제품에 대해 판매자와 채팅을 나눈 유저 목록을 조회
 * 2. 판매자가 목록 중 한 명을 선택하여 '예약자'로 지정
 * 3. 중복 선택 방지 및 로딩/에러 상태를 처리
 */
export default function SelectUserModal({
  productId,
  isOpen,
  onOpenChange,
  onConfirm,
}: SelectUserModalProps) {
  const isMobile = useIsMobile();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null); // 현재 처리 중인 유저 ID
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const quietButtonClass =
    "btn-secondary-modal inline-flex items-center justify-center text-sm font-medium";

  const loadChatUsers = useCallback(
    async (mounted?: { current: boolean }) => {
      const isMounted = () => mounted?.current ?? true;

      setIsLoading(true);
      setError(null);

      try {
        const users = await getProductChatUsersAction(productId);
        if (isMounted()) setChatUsers(users);
      } catch (e) {
        console.error("Failed to fetch chat users:", e);
        if (isMounted()) {
          setChatUsers([]);
          setError("채팅 유저를 불러오지 못했어요.");
        }
      } finally {
        if (isMounted()) setIsLoading(false);
      }
    },
    [productId]
  );

  useModalFocus({
    open: isOpen,
    enabled: !isMobile,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    onClose: () => onOpenChange(false),
  });

  // 2. 모달 오픈 시 채팅 참여 유저 목록 로드 (Lazy Loading)
  useEffect(() => {
    if (!isOpen) return;
    const mounted = { current: true };

    void loadChatUsers(mounted);

    return () => {
      mounted.current = false;
    };
  }, [isOpen, loadChatUsers]);

  /**
   * 유저 선택 핸들러
   * - `onConfirm` 콜백을 호출하여 부모 컴포넌트에서 비즈니스 로직(상태 변경 등)을 수행하도록 위임
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

  const bodyContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-border-subtle bg-surface-dim/70 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-background/80" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-24 rounded-full bg-background/80" />
                  <div className="h-2.5 w-36 rounded-full bg-background/60" />
                </div>
                <div className="h-9 w-16 rounded-xl bg-background/80" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-5 text-center">
          <p className="text-sm font-medium text-danger">{error}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            네트워크 상태를 확인한 뒤 다시 불러와 주세요.
          </p>
          <button
            type="button"
            className={cn(quietButtonClass, "mt-4 h-10")}
            onClick={() => void loadChatUsers()}
          >
            다시 불러오기
          </button>
        </div>
      ) : chatUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-dim/70 px-4 py-8 text-center text-muted">
          <p className="text-sm font-medium text-primary">
            아직 채팅한 유저가 없습니다.
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            예약 가능한 대화 상대가 생기면 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-border-subtle bg-surface-dim/70 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">
                  대화 이력이 있는 사용자만 표시됩니다.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  선택 즉시 예약 상태로 변경되며, 이후 판매 완료 처리 대상으로
                  이어집니다.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted shadow-sm">
                {chatUsers.length}명
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-hide">
            {chatUsers.map((user) => {
              const busy = isProcessingId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void handleUserSelect(user.id)}
                  disabled={isProcessingId !== null}
                  aria-busy={busy}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                    busy
                      ? "border-border-strong bg-surface"
                      : "border-border-subtle bg-surface-dim/60 hover:border-border hover:bg-surface"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      avatar={user.avatar}
                      username={user.username}
                      size="md"
                      disabled
                      className="pointer-events-none min-w-0"
                    />
                  </div>
                  <div className="min-w-0 flex-1" />
                  <span
                    className={cn(
                      "inline-flex min-h-[36px] min-w-[64px] items-center justify-center rounded-xl border px-3 text-xs font-medium shadow-sm",
                      busy
                        ? "border-brand/20 bg-brand/10 text-brand dark:border-brand-light/20 dark:bg-brand-light/15 dark:text-brand-light"
                        : "border-border bg-background text-brand dark:border-border-strong dark:bg-surface-dim dark:text-brand-light dark:hover:bg-surface"
                    )}
                  >
                    {busy ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light" />
                    ) : (
                      "선택"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={isOpen}
        title="예약자 선택"
        description="이 상품으로 대화를 나눈 사용자 중 한 명을 예약자로 지정합니다."
        onClose={() => onOpenChange(false)}
        contentClassName="pt-4"
      >
        {bodyContent}
      </BottomSheet>
    );
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="select-user-title"
      aria-describedby="select-user-description"
      tabIndex={-1}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div
        className={cn(
          "relative mx-4 flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl sm:max-w-lg",
          "bg-surface border border-border-subtle"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle bg-surface px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="select-user-title"
              className="text-lg font-bold text-primary"
            >
              예약자 선택
            </h2>
            <p
              id="select-user-description"
              className="mt-1 text-sm leading-5 text-muted"
            >
              이 상품으로 대화를 나눈 사용자 중 한 명을 예약자로 지정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isProcessingId !== null}
            aria-label="예약자 선택 모달 닫기"
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-50"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Body (User List) */}
        <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
          {bodyContent}
        </div>
      </div>
    </div>
  );
}
