/**
 * File Name : features/chat/components/ChatHeader.tsx
 * Description : 채팅 상단 헤더 (상대 유저 + 제품 정보 + 앱바 액션)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.14  임도헌   Created   ChatMessagesList에서 분리
 * 2025.07.15  임도헌   Modified  UI 변경
 * 2025.11.13  임도헌   Modified  BackButton 도입, 앱바/접근성/다크모드 정합
 * 2025.12.02  임도헌   Modified  counterparty/미트볼 메뉴/채팅방 나가기/상품 상태 변경 기능 추가
 * 2026.01.12  임도헌   Modified  [UI] 320px 대응 레이아웃 최적화 & 텍스트 배지 스타일 개선
 * 2026.01.12  임도헌   Modified  [Interaction] 외부 클릭 시 메뉴 닫기 로직 추가
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.24  임도헌   Modified  deleteAllProductReviewsAction Import 및 호출
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  상대방 차단 및 신고 통합 메뉴 구현
 * 2026.02.26  임도헌   Modified  좁은 화면에서 UI깨짐 방지
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet로 전환하고 44px 터치 타겟 기준을 적용
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  EllipsisHorizontalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { formatToWon } from "@/lib/utils";
import type { ChatUser } from "@/features/chat/types";
import { leaveChatRoomAction } from "@/features/chat/actions/room";
import { updateProductStatusAction } from "@/features/product/actions/status";
import { toggleBlockAction } from "@/features/user/actions/block";
import { useIsMobile } from "@/hooks/useIsMobile";

// 신고 모달 Dynamic Import
const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface ChatHeaderProduct {
  id: number;
  title: string;
  images: { url: string }[];
  price: number;
  userId: number; // 판매자 ID
  reservation_userId: number | null;
  purchase_userId: number | null;
}

interface ChatHeaderProps {
  chatRoomId: string;
  viewerId: number;
  counterparty: ChatUser;
  product: ChatHeaderProduct;
}

/**
 * 채팅방 상단 헤더
 *
 * [기능]
 * 1. 뒤로가기 및 상대방 프로필 표시 (상대가 나갔으면 비활성)
 * 2. 거래 중인 제품 정보(제목, 가격, 상태) 요약 표시
 * 3. 판매자 전용 액션 메뉴 (예약자 지정, 판매완료 처리, 상태 되돌리기)
 * 4. 채팅방 나가기, 차단, 신고 기능 (상대가 나갔으면 일부 제한)
 */
export default function ChatHeader({
  chatRoomId,
  viewerId,
  counterparty,
  product
}: ChatHeaderProps) {
  const router = useRouter();

  // --- UI States ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // --- Logic States ---
  const [isPending, startTransition] = useTransition();
  const [productState, setProductState] = useState<ChatHeaderProduct>(product);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  // 상대방 이탈 여부 체크 (Ghost User)
  const isGhost = !!counterparty.hasLeft;

  const img = productState.images?.[0]?.url ?? "";
  const isSeller = viewerId === productState.userId;
  const isReserved =
    !!productState.reservation_userId && !productState.purchase_userId;
  const isSold = !!productState.purchase_userId;
  const isSelling = !isReserved && !isSold;

  // 현재 대화 상대가 예약자인지 확인
  const isCurrentReservationHolder =
    isReserved && productState.reservation_userId === counterparty.id;

  const productHref = `/products/view/${productState.id}`;
  // Ghost면 프로필 링크 무효화
  const profileHref = isGhost ? "#" : `/profile/${counterparty.username}`;

  // 외부 클릭 감지
  useEffect(() => {
    if (isMobile || !menuOpen) return;

    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, menuOpen]);

  // --- Handlers ---

  /**
   * 1. 예약자로 지정 (판매중 -> 예약중)
   */
  const handleReserveCounterparty = () => {
    if (isGhost) return toast.error("대화 상대가 없어 예약할 수 없습니다.");

    setMenuOpen(false);
    startTransition(async () => {
      const res = await updateProductStatusAction(
        productState.id,
        "reserved",
        counterparty.id
      );
      if (res?.success) {
        toast.success(`${counterparty.username}님을 예약자로 지정했어요.`);
        setProductState((prev) => ({
          ...prev,
          reservation_userId: counterparty.id,
          purchase_userId: null
        }));
      } else {
        toast.error(res?.error ?? "예약자로 지정하는 데 실패했습니다.");
      }
    });
  };

  /**
   * 2. 예약 취소 (예약중 -> 판매중)
   */
  const handleReservedToSelling = () => {
    setMenuOpen(false);
    startTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "selling");
      if (res?.success) {
        // 리뷰 삭제 로직은 서버 트랜잭션으로 이관됨 (여기선 상태만 갱신)
        toast.success("판매 중으로 변경했어요.");
        setProductState((prev) => ({
          ...prev,
          reservation_userId: null,
          purchase_userId: null
        }));
      } else {
        toast.error(res?.error ?? "판매중으로 변경하지 못했어요.");
      }
    });
  };

  /**
   * 3. 판매 완료 처리 (예약중 -> 판매완료)
   */
  const handleReservedToSold = () => {
    setMenuOpen(false);
    startTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "sold");
      if (res?.success) {
        toast.success("판매 완료로 변경했어요.");
        setProductState((prev) => ({
          ...prev,
          purchase_userId: prev.reservation_userId ?? counterparty.id,
          reservation_userId: null
        }));
      } else {
        toast.error(res?.error ?? "판매완료로 변경하지 못했어요.");
      }
    });
  };

  /**
   * 4. 판매중으로 되돌리기 (판매완료 -> 판매중)
   * - 서버에서 트랜잭션으로 리뷰 삭제까지 처리함
   */
  const handleSoldToSelling = () => {
    startTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "selling");
      if (res?.success) {
        // 리뷰 삭제 로직은 서버 트랜잭션으로 이관됨
        toast.success(
          "판매 중으로 되돌렸어요. 이 제품에 작성된 리뷰도 모두 삭제되었습니다."
        );
        setProductState((prev) => ({
          ...prev,
          reservation_userId: null,
          purchase_userId: null
        }));
        setRevertDialogOpen(false);
        setMenuOpen(false);
      } else {
        toast.error(res?.error ?? "판매중으로 되돌리지 못했어요.");
      }
    });
  };

  /**
   * 5. 상대방 차단
   */
  const handleBlockCounterparty = () => {
    if (isGhost) return; // 나간 유저는 차단 불가 (이미 나감)

    startTransition(async () => {
      const result = await toggleBlockAction(counterparty.id, "block");
      if (result.success) {
        toast.success(`${counterparty.username}님을 차단했습니다.`);
        setBlockConfirmOpen(false);
        setMenuOpen(false);
        router.replace("/chat");
        router.refresh();
      } else {
        toast.error(result.error ?? "차단 처리에 실패했습니다.");
      }
    });
  };

  /**
   * 6. 채팅방 나가기
   */
  const handleLeaveRoom = () => {
    startTransition(async () => {
      const res = await leaveChatRoomAction(chatRoomId);
      if (res?.success) {
        toast.success("대화방을 나갔어요.");
        router.replace("/chat");
      } else {
        toast.error(res?.error ?? "채팅방 나가기 중 오류가 발생했습니다.");
      }
    });
  };

  const handleGoToProfile = () => {
    setMenuOpen(false);
    router.push(profileHref);
  };

  const handleGoToProduct = () => {
    setMenuOpen(false);
    router.push(productHref);
  };

  const desktopActionClass =
    "block w-full px-4 py-2.5 text-left text-primary hover:bg-surface-dim";
  const mobileActionClass =
    "flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim";

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border shadow-sm">
      <div className="mx-auto w-full px-2 h-14 flex items-center justify-between gap-2">
        {/* Left Section: Back + User */}
        <div className="flex justify-center items-center ml-2 gap-1 min-w-0 shrink-0 max-w-[50%]">
          <BackButton
            fallbackHref="/chat"
            variant="appbar"
            className="size-10 px-0 shrink-0"
          />
          {/* Ghost User(나간 유저)일 경우 프로필 링크 비활성화 */}
          <UserAvatar
            avatar={counterparty.avatar}
            username={counterparty.username}
            showUsername={true}
            size="sm"
            className="shrink-0"
            compact
            disabled={isGhost}
          />
        </div>

        {/* Center Section: Product Info Link */}
        <Link
          href={productHref}
          className="flex-1 flex items-center justify-end gap-1.5 min-w-0 bg-surface-dim/60 rounded-lg p-1.5 hover:bg-surface-dim transition-colors border border-transparent hover:border-border"
        >
          <div className="relative size-8 shrink-0 rounded bg-surface border border-border overflow-hidden hidden xs:block">
            {img ? (
              <Image
                src={`${img}/avatar`}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-neutral-200 dark:bg-neutral-700 w-full h-full" />
            )}
          </div>

          <div className="flex flex-1 flex-col items-end min-w-0">
            <span className="text-xs text-primary font-semibold truncate w-full block text-right">
              {productState.title}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isReserved && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                  예약중
                </span>
              )}
              {isSold && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                  판매완료
                </span>
              )}
              <span className="text-xs font-bold text-brand dark:text-brand-light truncate">
                {formatToWon(productState.price)}원
              </span>
            </div>
          </div>
        </Link>

        {/* Right Section: Menu */}
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            aria-haspopup={isMobile ? "dialog" : "menu"}
          >
            <EllipsisHorizontalIcon className="size-6" />
          </button>

          {!isMobile && menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 mt-1 w-48 origin-top-right rounded-xl bg-surface shadow-xl border border-border text-sm py-1 z-50 animate-fade-in"
            >
              {/* Ghost가 아닐 때만 프로필 이동 가능 */}
              {!isGhost && (
                <button
                  role="menuitem"
                  onClick={handleGoToProfile}
                  className={desktopActionClass}
                >
                  상대 프로필
                </button>
              )}

              <button
                role="menuitem"
                onClick={handleGoToProduct}
                className={desktopActionClass}
              >
                상품 상세
              </button>

              {/* [판매자 전용 메뉴] */}
              {isSeller && (
                <>
                  <div className="border-t border-border my-1" />

                  {/* 판매중 -> 예약자 지정 (Ghost면 불가) */}
                  {isSelling && !isGhost && (
                    <button
                      role="menuitem"
                      className={desktopActionClass}
                      onClick={handleReserveCounterparty}
                    >
                      예약자로 지정
                    </button>
                  )}

                  {/* 예약중 -> 취소 or 판매완료 (현재 예약자인 경우만) */}
                  {isReserved && isCurrentReservationHolder && (
                    <>
                      <button
                        role="menuitem"
                        className={desktopActionClass}
                        onClick={handleReservedToSelling}
                      >
                        예약 취소 (판매중)
                      </button>
                      <button
                        role="menuitem"
                        className={`${desktopActionClass} font-medium`}
                        onClick={handleReservedToSold}
                      >
                        판매완료 처리
                      </button>
                    </>
                  )}

                  {/* 판매완료 -> 되돌리기 */}
                  {isSold && (
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-amber-600 hover:bg-surface-dim"
                      onClick={() => {
                        setMenuOpen(false);
                        setRevertDialogOpen(true);
                      }}
                    >
                      판매중으로 되돌리기
                    </button>
                  )}
                </>
              )}

              <div className="border-t border-border my-1" />

              {/* 차단/신고 (Ghost면 불가) */}
              {!isGhost && (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-surface-dim"
                  >
                    <UserMinusIcon className="size-4" /> 상대방 차단하기
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-surface-dim"
                  >
                    <ExclamationTriangleIcon className="size-4" /> 사용자
                    신고하기
                  </button>
                  <div className="border-t border-border my-1" />
                </>
              )}

              {/* 채팅방 나가기 (항상 가능) */}
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setLeaveDialogOpen(true);
                }}
                className="block w-full px-4 py-2.5 text-left text-danger hover:bg-danger/10"
              >
                채팅방 나가기
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomSheet
        open={isMobile && menuOpen}
        title="채팅 옵션"
        description="상대 프로필 이동, 거래 상태 변경, 차단/신고, 채팅방 나가기 기능을 제공합니다."
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          {!isGhost && (
            <button
              type="button"
              onClick={handleGoToProfile}
              className={mobileActionClass}
            >
              상대 프로필
            </button>
          )}

          <button
            type="button"
            onClick={handleGoToProduct}
            className={mobileActionClass}
          >
            상품 상세
          </button>

          {isSeller && (
            <>
              <div className="my-2 border-t border-border" />

              {isSelling && !isGhost && (
                <button
                  type="button"
                  onClick={handleReserveCounterparty}
                  className={mobileActionClass}
                >
                  예약자로 지정
                </button>
              )}

              {isReserved && isCurrentReservationHolder && (
                <>
                  <button
                    type="button"
                    onClick={handleReservedToSelling}
                    className={mobileActionClass}
                  >
                    예약 취소 (판매중)
                  </button>
                  <button
                    type="button"
                    onClick={handleReservedToSold}
                    className={mobileActionClass}
                  >
                    판매완료 처리
                  </button>
                </>
              )}

              {isSold && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setRevertDialogOpen(true);
                  }}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50"
                >
                  판매중으로 되돌리기
                </button>
              )}
            </>
          )}

          {!isGhost && (
            <>
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setBlockConfirmOpen(true);
                }}
                className={mobileActionClass}
              >
                <UserMinusIcon className="size-5 shrink-0" />
                상대방 차단하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className={mobileActionClass}
              >
                <ExclamationTriangleIcon className="size-5 shrink-0" />
                사용자 신고하기
              </button>
            </>
          )}

          <div className="my-2 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setLeaveDialogOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            채팅방 나가기
          </button>
        </div>
      </BottomSheet>

      {/* --- Dialogs --- */}
      <ConfirmDialog
        open={blockConfirmOpen}
        title="상대방 차단"
        description={`${counterparty.username}님을 차단하시겠습니까? 차단하면 이 채팅방에서 나가게 되며 서로 대화할 수 없습니다.`}
        confirmLabel="차단"
        onConfirm={handleBlockCounterparty}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />
      <ConfirmDialog
        open={leaveDialogOpen}
        title="채팅방 나가기"
        description="대화 내용이 사라집니다."
        confirmLabel="나가기"
        onConfirm={handleLeaveRoom}
        onCancel={() => setLeaveDialogOpen(false)}
        loading={isPending}
      />
      <ConfirmDialog
        open={revertDialogOpen}
        title="판매 상태를 되돌릴까요?"
        description="판매 완료를 취소하고 '판매 중' 상태로 돌립니다. 관련 리뷰도 모두 삭제됩니다."
        confirmLabel="변경"
        onConfirm={handleSoldToSelling}
        onCancel={() => setRevertDialogOpen(false)}
        loading={isPending}
      />

      {/* 신고 모달 (Ghost가 아닐 때만 렌더링) */}
      {!isGhost && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetId={counterparty.id}
          targetType="USER"
        />
      )}
    </header>
  );
}
