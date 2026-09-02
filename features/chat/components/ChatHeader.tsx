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
 * 2026.01.24  임도헌   Modified  판매 상태 되돌리기와 후속 정리 흐름을 채팅 헤더 액션에 통합
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  상대방 차단 및 신고 통합 메뉴 구현
 * 2026.02.26  임도헌   Modified  좁은 화면에서 UI깨짐 방지
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet로 전환하고 44px 터치 타겟 기준을 적용
 * 2026.03.12  임도헌   Modified  채팅방 내부 검색 모드와 결과 이동 액션을 헤더에 통합하고 flat 톤으로 정리
 * 2026.03.12  임도헌   Modified  거래 상품 썸네일 GIF 예외 처리(imageAnimated)와 상태/액션 색 정합을 함께 보강
 * 2026.03.13  임도헌   Modified  채팅방 복귀와 상대 프로필/상품 상세 진입에 현재 채팅 경로 returnTo를 함께 전달하도록 정리
 * 2026.03.14  임도헌   Modified  헤더 상품 요약 카드 톤을 과하지 않게 재정리
 * 2026.03.18  임도헌   Modified  채팅 내부 returnTo 인코딩을 정리하고 차단 후 복귀 경로 revalidate + 중복 router.refresh 제거로 링크 안전성과 재요청을 함께 정리
 * 2026.03.27  임도헌   Modified  모바일 채팅 옵션 시트 설명을 간결화해 액션 목록 집중도를 높임
 * 2026.03.28  임도헌   Modified  모바일 검색 헤더는 카운터 중심으로 단순화하고 이동 액션은 하단 플로팅 컨트롤·순환형 내비게이션과 연동하도록 정리
 * 2026.04.02  임도헌   Modified  검색/메뉴 액션과 상품 요약 카드 대비를 한 단계 보강
 * 2026.04.03  임도헌   Modified  전역 유저 차단 확인 문구를 다른 도메인과 같은 정책 설명 톤으로 통일
 * 2026.04.10  임도헌   Modified  채팅 타이포 정책에 맞춰 검색 카운터와 상품 요약 카드 메타 weight/크기를 400/500/700 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.14  임도헌   Modified  채팅 상세 최적화 대응으로 링크 선행 prefetch를 조정해 초기 요청을 줄임
 * 2026.04.15  임도헌   Modified  채팅 헤더 상품 요약을 반응형 정보열로 재구성하고 초소형 화면 정보 우선순위를 정리
 * 2026.04.16  임도헌   Modified  채팅 헤더 높이와 안쪽 여백을 공통 상세 appbar 패턴과 같은 56px 기준으로 통일
 * 2026.04.17  임도헌   Modified  채팅방 상단 검색창 스타일을 정리
 * 2026.04.21  임도헌   Modified  데스크톱/모바일 액션 메뉴 항목을 공통 컴포넌트로 분리하고 주석 정합을 보강
 * 2026.05.30  임도헌   Modified  채팅 상세 헤더 높이를 모바일 서브 헤더 기준으로 정리
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.09.02  임도헌   Modified  로그인 복귀 후 앱 뒤로가기가 방문 기록 대신 채팅의 안전한 returnTo를 사용하도록 보완
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import ChatHeaderMenuItems from "@/features/chat/components/ChatHeaderMenuItems";
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
 * 1. 검증된 returnTo 기반 뒤로가기 및 상대방 프로필 표시 (상대가 나갔으면 비활성)
 * 2. 거래 중인 제품 정보(제목, 가격, 상태) 요약 표시
 * 3. 검색 모드 전환, 검색어 입력, 결과 인디케이터 및 이전/다음 이동 제공
 * 4. 판매자 전용 옵션 메뉴 (예약자 지정, 판매완료 처리, 상태 되돌리기)
 * 5. 채팅방 나가기, 차단, 신고 기능 (상대가 나갔으면 일부 제한)
 * 6. 상품 상세/상대 프로필 진입 시 현재 채팅 경로를 안전한 returnTo로 전달
 * 7. 채팅 최초 진입에서는 불필요한 링크 선행 요청을 줄이고, 실제 이동 의도가 생길 때만 라우팅
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

  // 현재 채팅 경로의 returnTo 재전달 시 내부 쿼리 문자열까지 유지
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
          "판매 중으로 되돌렸어요. 이 상품에 작성된 리뷰도 모두 삭제되었습니다."
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

  /**
   * 거래 상품 상세 진입
   * - 현재 채팅 경로를 returnTo로 넘겨 상세에서 다시 채팅으로 복귀할 수 있게 유지
   */
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

  const headerIconButtonClass = cn(
    "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border bg-background/88 text-muted transition-colors",
    "border-border dark:border-border-strong/80",
    "hover:bg-surface hover:text-primary"
  );
  return (
    <header className="sticky top-0 z-40 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm transition-colors">
      {searchOpen ? (
        <div className="mx-auto flex h-full w-full items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={onSearchClose}
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border-subtle bg-surface text-muted transition-colors hover:bg-surface-dim hover:text-primary"
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
              className="searchbar-compact-input h-11 rounded-2xl bg-surface pl-10 pr-3"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-border-subtle bg-surface px-1.5 py-1 shadow-sm">
            <span className="min-w-[40px] text-center text-xs font-medium text-primary">
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
                  className="focus-ring-soft inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="이전 검색 결과"
                >
                  <ChevronUpIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={onSearchNext}
                  disabled={!searchCanGoNext}
                  className="focus-ring-soft inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="다음 검색 결과"
                >
                  <ChevronDownIcon className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto flex h-full w-full items-center justify-between gap-2 px-3 sm:px-4">
          {/* 좌측 영역: 뒤로가기 + 사용자 */}
          <div className="flex min-w-0 shrink-0 items-center gap-1 max-w-[40%] min-[400px]:max-w-[46%] md:max-w-none">
            <BackButton
              fallbackHref={returnTo}
              preferFallback
              variant="appbar"
              className="size-10 px-0 shrink-0"
            />
            {/* Ghost User(나간 유저)인 경우 프로필 링크 비활성화 */}
            <UserAvatar
              avatar={counterparty.avatar}
              username={counterparty.username}
              showUsername={true}
              size="sm"
              className="min-w-0 shrink max-w-[112px] min-[400px]:max-w-[132px]"
              usernameClassName="max-[399px]:hidden"
              avatarClassName="max-[399px]:size-7"
              compact
              disabled={isGhost}
              prefetch={false}
            />
          </div>

          {/* 중앙 영역: 상품 정보 링크 */}
          <Link
            href={productHref}
            prefetch={false}
            className="focus-ring-soft flex min-w-0 flex-1 items-center gap-2 rounded-[20px] border border-border bg-surface-dim/60 px-2.5 py-1.5 transition-colors hover:bg-surface-dim/85"
          >
            <div className="relative hidden size-7 shrink-0 overflow-hidden rounded-xl border border-border bg-surface min-[400px]:block">
              {img ? (
                <Image
                  src={`${img}/avatar`}
                  alt=""
                  fill
                  sizes="32px"
                  unoptimized={imgAnimated}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-surface-dim" />
              )}
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
              {isReserved && (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded border border-brand/20 bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-dark dark:border-brand-light/25 dark:bg-brand-light/20 dark:text-gray-100">
                  예약중
                </span>
              )}
              {isSold && (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-surface-dim px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  판매완료
                </span>
              )}
              <span className="min-w-0 truncate text-xs font-medium text-muted">
                {productState.title}
              </span>
              <span className="shrink-0 text-sm font-semibold text-primary">
                {formatToWon(productState.price)}원
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 md:hidden">
              <span className="min-w-0 truncate text-[11px] font-medium leading-none text-primary">
                {productState.title}
              </span>
              {isReserved && (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-brand/20 bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-brand-dark dark:border-brand-light/25 dark:bg-brand-light/20 dark:text-gray-100">
                  예약중
                </span>
              )}
              {isSold && (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-surface-dim px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted">
                  판매완료
                </span>
              )}
              {isSelling && (
                <span className="shrink-0 text-xs font-semibold leading-none text-primary">
                  {formatToWon(productState.price)}원
                </span>
              )}
            </div>
          </Link>

          {/* 우측 영역: 메뉴 */}
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
                <ChatHeaderMenuItems
                  variant="desktop"
                  isGhost={isGhost}
                  isSeller={isSeller}
                  isSelling={isSelling}
                  isReserved={isReserved}
                  isSold={isSold}
                  isCurrentReservationHolder={isCurrentReservationHolder}
                  onGoToProfile={handleGoToProfile}
                  onGoToProduct={handleGoToProduct}
                  onReserveCounterparty={handleReserveCounterparty}
                  onReservedToSelling={handleReservedToSelling}
                  onReservedToSold={handleReservedToSold}
                  onOpenRevertDialog={() => {
                    setMenuOpen(false);
                    setRevertDialogOpen(true);
                  }}
                  onOpenBlockConfirm={() => {
                    setMenuOpen(false);
                    setBlockConfirmOpen(true);
                  }}
                  onOpenReport={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  onOpenLeaveDialog={() => {
                    setMenuOpen(false);
                    setLeaveDialogOpen(true);
                  }}
                />
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
          <ChatHeaderMenuItems
            variant="mobile"
            isGhost={isGhost}
            isSeller={isSeller}
            isSelling={isSelling}
            isReserved={isReserved}
            isSold={isSold}
            isCurrentReservationHolder={isCurrentReservationHolder}
            onGoToProfile={handleGoToProfile}
            onGoToProduct={handleGoToProduct}
            onReserveCounterparty={handleReserveCounterparty}
            onReservedToSelling={handleReservedToSelling}
            onReservedToSold={handleReservedToSold}
            onOpenRevertDialog={() => {
              setMenuOpen(false);
              setRevertDialogOpen(true);
            }}
            onOpenBlockConfirm={() => {
              setMenuOpen(false);
              setBlockConfirmOpen(true);
            }}
            onOpenReport={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            onOpenLeaveDialog={() => {
              setMenuOpen(false);
              setLeaveDialogOpen(true);
            }}
          />
        </div>
      </BottomSheet>

      {/* 다이얼로그 영역 */}
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
