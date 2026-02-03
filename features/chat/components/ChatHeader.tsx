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
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import BackButton from "@/components/global/BackButton";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { formatToWon } from "@/lib/utils";
import type { ChatUser } from "@/features/chat/types";
import { leaveChatRoomAction } from "@/features/chat/actions/room";
import { updateProductStatusAction } from "@/features/product/actions/status";
import { deleteAllProductReviewsAction } from "@/features/review/actions/delete";
import { cn } from "@/lib/utils";

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
 * 1. 뒤로가기 및 상대방 프로필 표시
 * 2. 거래 중인 제품 정보(제목, 가격, 상태) 요약 표시
 * 3. 판매자 전용 액션 메뉴 (예약자 지정, 판매완료 처리, 상태 되돌리기)
 * 4. 채팅방 나가기 기능
 */
export default function ChatHeader({
  chatRoomId,
  viewerId,
  counterparty,
  product,
}: ChatHeaderProps) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null); // 메뉴 영역 참조
  const buttonRef = useRef<HTMLButtonElement>(null); // 버튼 영역 참조

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [isLeaving, startLeaveTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  // 로컬에서 상품 상태 추적
  const [productState, setProductState] = useState<ChatHeaderProduct>(product);

  const img = productState.images?.[0]?.url ?? "";
  const isSeller = viewerId === productState.userId;
  const isReserved =
    !!productState.reservation_userId && !productState.purchase_userId;
  const isSold = !!productState.purchase_userId;
  const isSelling = !isReserved && !isSold;
  const isCurrentReservationHolder =
    isReserved && productState.reservation_userId === counterparty.id;

  const productHref = `/products/view/${productState.id}`;
  const profileHref = `/profile/${counterparty.username}`;

  // 외부 클릭 감지 로직
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // 메뉴 내부나 버튼을 클릭한 경우는 무시
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // 판매중 → (이 유저를) 예약중
  const handleReserveCounterparty = () => {
    setMenuOpen(false);
    startStatusTransition(async () => {
      const res = await updateProductStatusAction(
        productState.id,
        "reserved",
        counterparty.id
      );
      if (!res?.success) {
        toast.error(res?.error ?? "예약자로 지정하는 데 실패했습니다.");
        return;
      }
      toast.success(`${counterparty.username}님을 예약자로 지정했어요.`);
      setProductState((prev) => ({
        ...prev,
        reservation_userId: counterparty.id,
        purchase_userId: null,
      }));
    });
  };

  // 예약중 → 판매중 (예약 해제 + 리뷰 초기화)
  const handleReservedToSelling = () => {
    setMenuOpen(false);
    startStatusTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "selling");
      if (!res?.success) {
        toast.error(res?.error ?? "판매중으로 변경하지 못했어요.");
        return;
      }

      await deleteAllProductReviewsAction(productState.id).catch((err) =>
        console.error("deleteAllProductReviewsAction error:", err)
      );

      toast.success("판매 중으로 변경했어요. 관련 리뷰가 초기화되었습니다.");
      setProductState((prev) => ({
        ...prev,
        reservation_userId: null,
        purchase_userId: null,
      }));
    });
  };

  // 예약중(현재 예약자 = 이 유저) → 판매완료
  const handleReservedToSold = () => {
    setMenuOpen(false);
    startStatusTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "sold");
      if (!res?.success) {
        toast.error(res?.error ?? "판매완료로 변경하지 못했어요.");
        return;
      }
      toast.success("판매 완료로 변경했어요.");
      setProductState((prev) => ({
        ...prev,
        purchase_userId: prev.reservation_userId ?? counterparty.id,
        reservation_userId: null,
      }));
    });
  };

  // 판매완료 → 판매중 (리뷰 삭제 + ConfirmDialog에서 호출)
  const handleSoldToSelling = () => {
    startStatusTransition(async () => {
      const res = await updateProductStatusAction(productState.id, "selling");
      if (!res?.success) {
        toast.error(res?.error ?? "판매중으로 되돌리지 못했어요.");
        return;
      }

      await deleteAllProductReviewsAction(productState.id).catch((err) =>
        console.error("deleteAllProductReviewsAction error:", err)
      );

      toast.success(
        "판매 중으로 되돌렸어요. 이 제품에 작성된 리뷰도 모두 삭제되었습니다."
      );
      setProductState((prev) => ({
        ...prev,
        reservation_userId: null,
        purchase_userId: null,
      }));
      setRevertDialogOpen(false);
    });
  };

  //채팅방 나가기
  const handleLeaveRoom = () => {
    startLeaveTransition(async () => {
      const res = await leaveChatRoomAction(chatRoomId);
      if (!res?.success) {
        toast.error(res?.error ?? "채팅방 나가기 중 오류가 발생했습니다.");
        return;
      }
      toast.success("대화방을 나갔어요.");
      router.replace("/chat");
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border shadow-sm">
      <div className="mx-auto w-full px-2 h-14 flex items-center justify-between gap-2">
        {/* 1. Left: Back + User Info */}
        <div className="flex justify-center items-center gap-1 min-w-0 shrink-0 max-w-[35%]">
          <BackButton
            fallbackHref="/chat"
            variant="appbar"
            className="h-10 w-8 px-0 shrink-0"
          />
          <UserAvatar
            avatar={counterparty.avatar}
            username={counterparty.username}
            showUsername={true}
            size="sm"
            className="shrink-0"
            compact // 패딩 제거 버전
          />
        </div>

        {/* 2. Center: Product Info Card (Link) */}
        <Link
          href={productHref}
          className={cn(
            "flex-1 flex items-center justify-end gap-2 min-w-0",
            "bg-surface-dim/60 rounded-lg p-1.5 hover:bg-surface-dim transition-colors",
            "border border-transparent hover:border-border"
          )}
        >
          {/* 상품 이미지: 화면이 340px 이상일 때만 표시 (xs:block) */}
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

          <div className="flex flex-col items-end min-w-0">
            {/* 제목 Truncate */}
            <span className="text-xs text-primary font-semibold truncate max-w-[120px]">
              {productState.title}
            </span>

            {/* 가격 & 배지 */}
            <div className="flex items-center gap-1.5">
              {/* 텍스트 배지 유지 및 스타일 최적화 (9px 폰트) */}
              {isReserved && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
                  예약중
                </span>
              )}
              {isSold && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                  판매완료
                </span>
              )}
              <span className="text-xs font-bold text-brand dark:text-brand-light">
                {`${formatToWon(productState.price)}원`}
              </span>
            </div>
          </div>
        </Link>

        {/* 3. Right: Menu Button */}
        <div className="relative shrink-0">
          <button
            ref={buttonRef} // [Add] 버튼 Ref 연결
            className="flex items-center justify-center size-9 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴 열기"
          >
            <EllipsisHorizontalIcon className="size-6" />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-1 w-48 origin-top-right rounded-xl bg-surface shadow-xl border border-border text-sm py-1 z-50 animate-fade-in"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push(profileHref);
                }}
                className="block w-full px-4 py-2.5 text-left text-primary hover:bg-surface-dim"
              >
                상대 프로필
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push(productHref);
                }}
                className="block w-full px-4 py-2.5 text-left text-primary hover:bg-surface-dim"
              >
                상품 상세
              </button>

              {isSeller && (
                <>
                  <div className="border-t border-border my-1" />
                  {isSelling && (
                    <button
                      className="block w-full px-3 py-2 text-left hover:bg-surface-dim text-primary"
                      onClick={handleReserveCounterparty}
                      disabled={isUpdatingStatus}
                    >
                      예약자로 지정
                    </button>
                  )}

                  {isReserved && (
                    <>
                      {isCurrentReservationHolder ? (
                        <>
                          <button
                            className="block w-full px-3 py-2 text-left hover:bg-surface-dim text-primary"
                            onClick={handleReservedToSelling}
                            disabled={isUpdatingStatus}
                          >
                            예약 취소 (판매중)
                          </button>
                          <button
                            className="block w-full px-3 py-2 text-left hover:bg-surface-dim text-primary font-medium"
                            onClick={handleReservedToSold}
                            disabled={isUpdatingStatus}
                          >
                            판매완료 처리
                          </button>
                        </>
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted">
                          다른 유저가 예약 중입니다
                        </div>
                      )}
                    </>
                  )}

                  {isSold && (
                    <button
                      className="block w-full px-3 py-2 text-left hover:bg-surface-dim text-amber-600 dark:text-amber-400"
                      onClick={() => {
                        setMenuOpen(false);
                        setRevertDialogOpen(true);
                      }}
                      disabled={isUpdatingStatus}
                    >
                      판매중으로 되돌리기
                    </button>
                  )}
                </>
              )}
              <div className="border-t border-border my-1" />
              <button
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

      {/* Dialogs */}
      <ConfirmDialog
        open={leaveDialogOpen}
        title="채팅방 나가기"
        description="대화 내용이 사라집니다."
        confirmLabel="나가기"
        onConfirm={handleLeaveRoom}
        onCancel={() => setLeaveDialogOpen(false)}
        loading={isLeaving}
      />
      <ConfirmDialog
        open={revertDialogOpen}
        onCancel={() => {
          if (!isUpdatingStatus) setRevertDialogOpen(false);
        }}
        onConfirm={handleSoldToSelling}
        loading={isUpdatingStatus}
        title="판매 상태를 되돌릴까요?"
        confirmLabel="판매중으로 변경"
        cancelLabel="취소"
        description="판매 완료를 취소하고 다시 '판매 중' 상태로 돌립니다. 리뷰도 삭제됩니다."
      />
    </header>
  );
}
