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
 * 2026.03.12  임도헌   Modified  채팅방 내부 검색 모드를 추가하고 헤더를 flat 톤으로 통일
 * 2026.03.12  임도헌   Modified  라이트모드 헤더/검색바 대비를 높여 배경 일러스트 위 가시성 강화
 * 2026.03.12  임도헌   Modified  검색 모드 결과 인디케이터와 이전/다음 이동 액션을 헤더에 통합
 * 2026.03.12  임도헌   Modified  거래 상품 썸네일에 GIF 조건부 최적화 예외 처리를 imageAnimated 메타로 연동
 * 2026.03.12  임도헌   Modified  채팅 헤더 상태 배지와 메뉴 액션 색을 시맨틱 토큰 기준으로 통일
 * 2026.03.12  임도헌   Modified  채팅 헤더 보더를 border-border-subtle 기준으로 정리
 * 2026.03.13  임도헌   Modified  채팅방 복귀와 상대 프로필/상품 상세 진입에 현재 채팅 경로 returnTo를 함께 전달하도록 정리
 * 2026.03.14  임도헌   Modified  헤더 상품 요약 카드 톤을 과하지 않게 재정리
 * 2026.03.18  임도헌   Modified  채팅 내부 returnTo 인코딩을 정리하고 차단 후 복귀 경로 revalidate + 중복 router.refresh 제거로 링크 안전성과 재요청을 함께 정리
 * 2026.03.27  임도헌   Modified  모바일 채팅 옵션 시트 설명을 간결화해 액션 목록 집중도를 높임
 * 2026.03.28  임도헌   Modified  모바일 검색 헤더는 카운터 중심으로 단순화하고 이동 액션은 하단 플로팅 컨트롤·순환형 내비게이션과 연동하도록 정리
 * 2026.04.02  임도헌   Modified  채팅 배경 위에서도 검색/메뉴 액션과 상품 요약 카드가 또렷하게 보이도록 대비를 한 단계 보강
 * 2026.04.03  임도헌   Modified  전역 유저 차단 확인 문구를 다른 도메인과 같은 정책 설명 톤으로 통일
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserMinusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { cn, formatToWon } from "@/lib/utils";
import type { ChatHeaderProduct, ChatUser } from "@/features/chat/types";
import { leaveChatRoomAction } from "@/features/chat/actions/room";
import { updateProductStatusAction } from "@/features/product/actions/status";
import { toggleBlockAction } from "@/features/user/actions/block";
import { useIsMobile } from "@/hooks/useIsMobile";

// 신고 모달 Dynamic Import
const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface ChatHeaderProps {
  chatRoomId: string;
  viewerId: number;
  counterparty: ChatUser;
  product: ChatHeaderProduct;
  returnTo: string;
  searchOpen: boolean;
  searchQuery: string;
  searchResultCount: number;
  searchCurrentIndex: number;
  searchCanGoPrev: boolean;
  searchCanGoNext: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  onSearchNext: () => void;
  onSearchPrev: () => void;
}

/**
 * 채팅방 상단 헤더
 *
 * [기능]
 * 1. 뒤로가기 및 상대방 프로필 표시 (상대가 나갔으면 비활성)
 * 2. 거래 중인 제품 정보(제목, 가격, 상태) 요약 표시
 * 3. 검색 모드 전환, 검색어 입력, 결과 인디케이터 및 이전/다음 이동 제공
 * 4. 판매자 전용 옵션 메뉴 (예약자 지정, 판매완료 처리, 상태 되돌리기)
 * 5. 채팅방 나가기, 차단, 신고 기능 (상대가 나갔으면 일부 제한)
 * 6. 상품 상세/상대 프로필 진입 시 현재 채팅 경로를 안전한 returnTo로 전달
 */
export default function ChatHeader({
  chatRoomId,
  viewerId,
  counterparty,
  product,
  returnTo,
  searchOpen,
  searchQuery,
  searchResultCount,
  searchCurrentIndex,
  searchCanGoPrev,
  searchCanGoNext,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  onSearchNext,
  onSearchPrev,
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // 상대방 이탈 여부 체크 (Ghost User)
  const isGhost = !!counterparty.hasLeft;

  const img = productState.images?.[0]?.url ?? "";
  const imgAnimated = productState.images?.[0]?.isAnimated ?? false;
  const isSeller = viewerId === productState.userId;
  const isReserved =
    !!productState.reservation_userId && !productState.purchase_userId;
  const isSold = !!productState.purchase_userId;
  const isSelling = !isReserved && !isSold;

  // 현재 대화 상대가 예약자인지 확인
  const isCurrentReservationHolder =
    isReserved && productState.reservation_userId === counterparty.id;

  // 현재 채팅 경로를 다시 returnTo로 넘길 때 내부 쿼리 문자열 보존
  const currentChatHref = `/chats/${chatRoomId}?returnTo=${encodeURIComponent(
    returnTo
  )}`;
  const productHref = `/products/view/${productState.id}?returnTo=${encodeURIComponent(
    currentChatHref
  )}`;
  // Ghost면 프로필 링크 무효화
  const profileHref = isGhost
    ? "#"
    : `/profile/${counterparty.username}?returnTo=${encodeURIComponent(
        currentChatHref
      )}`;

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

  useEffect(() => {
    if (!searchOpen) return;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchOpen]);

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
          purchase_userId: null,
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
          purchase_userId: null,
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
          reservation_userId: null,
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
          purchase_userId: null,
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
      // 차단 후 돌아갈 채팅 목록/상세 경로를 서버에서 먼저 revalidate
      const result = await toggleBlockAction(
        counterparty.id,
        "block",
        returnTo
      );
      if (result.success) {
        toast.success(`${counterparty.username}님을 차단했습니다.`);
        setBlockConfirmOpen(false);
        setMenuOpen(false);
        router.replace(returnTo);
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
        router.replace(returnTo);
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

  /**
   * 대화 검색 모드 진입
   * - 메뉴가 열려 있으면 먼저 닫고 검색 UI로 전환
   */
  const handleOpenSearch = () => {
    setMenuOpen(false);
    onSearchOpen();
  };

  const desktopActionClass =
    "block w-full px-4 py-2.5 text-left text-primary hover:bg-surface-dim";
  const mobileActionClass =
    "flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim";
  const headerIconButtonClass = cn(
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-colors",
    "border-border/75 dark:border-border-subtle",
    "bg-background/82 text-primary/85 dark:bg-surface-dim/82",
    "hover:bg-surface hover:text-primary dark:hover:bg-surface-dim"
  );
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background shadow-sm">
      {searchOpen ? (
        <div className="mx-auto flex h-14 w-full items-center gap-2 px-3">
          <button
            type="button"
            onClick={onSearchClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border-subtle bg-surface text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            aria-label="검색 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>

          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="현재 대화 검색"
              className="h-11 w-full rounded-2xl border border-border-subtle bg-surface pl-10 pr-3 text-sm text-primary shadow-sm outline-none transition-colors placeholder:text-muted focus:border-brand/60 focus:bg-background"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-border-subtle bg-surface px-1.5 py-1 shadow-sm">
            <span className="min-w-[40px] text-center text-xs font-semibold text-primary">
              {searchResultCount > 0
                ? `${searchCurrentIndex}/${searchResultCount}`
                : "0"}
            </span>
            {!isMobile && (
              <>
                <button
                  type="button"
                  onClick={onSearchPrev}
                  disabled={!searchCanGoPrev}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="이전 검색 결과"
                >
                  <ChevronUpIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={onSearchNext}
                  disabled={!searchCanGoNext}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="다음 검색 결과"
                >
                  <ChevronDownIcon className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full px-2 h-14 flex items-center justify-between gap-2">
          {/* Left Section: Back + User */}
          <div className="flex justify-center items-center ml-2 gap-1 min-w-0 shrink-0 max-w-[50%]">
            <BackButton
              fallbackHref={returnTo}
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
            className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border-subtle bg-surface-dim/80 px-2.5 py-1.5 shadow-sm transition-colors hover:bg-surface"
          >
            <div className="relative hidden size-8 shrink-0 overflow-hidden rounded border border-border-subtle bg-surface xs:block">
              {img ? (
                <Image
                  src={`${img}/avatar`}
                  alt=""
                  fill
                  unoptimized={imgAnimated}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-surface-dim" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="block w-full truncate text-xs font-semibold text-primary">
                {productState.title}
              </span>
              <div className="mt-0.5 flex items-center gap-1.5">
                {isReserved && (
                  <span className="shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold bg-brand/10 text-brand dark:bg-brand-light/15 dark:text-brand-light">
                    예약중
                  </span>
                )}
                {isSold && (
                  <span className="shrink-0 whitespace-nowrap rounded bg-surface-dim px-1.5 py-0.5 text-[9px] font-bold text-muted">
                    판매완료
                  </span>
                )}
                <span className="truncate text-xs font-bold text-brand dark:text-brand-light">
                  {formatToWon(productState.price)}원
                </span>
              </div>
            </div>
          </Link>

          {/* Right Section: Menu */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={headerIconButtonClass}
                onClick={handleOpenSearch}
                aria-label="대화 검색 열기"
              >
                <MagnifyingGlassIcon className="size-5" />
              </button>
              <button
                ref={buttonRef}
                className={headerIconButtonClass}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="메뉴 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
              >
                <EllipsisHorizontalIcon className="size-6" />
              </button>
            </div>

            {!isMobile && menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-xl border border-border-subtle bg-surface py-1 text-sm shadow-xl"
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
                    <div className="my-1 border-t border-border-subtle" />

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
                        className={desktopActionClass}
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

                <div className="my-1 border-t border-border-subtle" />

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
                    <div className="my-1 border-t border-border-subtle" />
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
      )}

      <BottomSheet
        open={isMobile && menuOpen}
        title="채팅 옵션"
        description="필요한 채팅 관리 작업을 선택하세요."
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
              <div className="my-2 border-t border-border-subtle" />

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
                  className={mobileActionClass}
                >
                  판매중으로 되돌리기
                </button>
              )}
            </>
          )}

          {!isGhost && (
            <>
              <div className="my-2 border-t border-border-subtle" />
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

          <div className="my-2 border-t border-border-subtle" />
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
        description={`${counterparty.username}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 현재 채팅방에서 나가게 되며 서로의 글과 채팅을 볼 수 없고 팔로우가 취소됩니다.`}
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
