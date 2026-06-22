/**
 * File Name : features/chat/components/ChatHeaderMenuItems.tsx
 * Description : 채팅 헤더 액션 메뉴 항목 묶음 (데스크톱 드롭다운 + 모바일 시트 공용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ChatHeader의 데스크톱/모바일 액션 메뉴 중복 UI를 공통 컴포넌트로 분리
 * 2026.06.18  임도헌   Modified  데스크톱 액션 메뉴의 아이콘/라벨을 한 줄 정렬로 고정
 * 2026.06.21  임도헌   Modified  채팅 헤더 메뉴 항목을 아이콘+텍스트 문법으로 통일
 */

import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ChatHeaderMenuItemsProps {
  isGhost: boolean;
  isSeller: boolean;
  isSelling: boolean;
  isReserved: boolean;
  isSold: boolean;
  isCurrentReservationHolder: boolean;
  variant: "desktop" | "mobile";
  onGoToProfile: () => void;
  onGoToProduct: () => void;
  onReserveCounterparty: () => void;
  onReservedToSelling: () => void;
  onReservedToSold: () => void;
  onOpenRevertDialog: () => void;
  onOpenBlockConfirm: () => void;
  onOpenReport: () => void;
  onOpenLeaveDialog: () => void;
}

/**
 * 채팅 헤더 액션 메뉴 항목 묶음
 *
 * [역할]
 * - 데스크톱 드롭다운과 모바일 BottomSheet가 같은 액션 목록/표시 조건을 공유
 * - 판매자 전용 상태 전이 메뉴와 일반 사용자 액션을 한 곳에서 관리해 분기 중복을 줄인다
 */
export default function ChatHeaderMenuItems({
  isGhost,
  isSeller,
  isSelling,
  isReserved,
  isSold,
  isCurrentReservationHolder,
  variant,
  onGoToProfile,
  onGoToProduct,
  onReserveCounterparty,
  onReservedToSelling,
  onReservedToSold,
  onOpenRevertDialog,
  onOpenBlockConfirm,
  onOpenReport,
  onOpenLeaveDialog,
}: ChatHeaderMenuItemsProps) {
  const isDesktop = variant === "desktop";

  const desktopActionClass =
    "focus-ring-soft flex w-full items-center gap-3 px-4 py-2.5 text-left text-primary hover:bg-surface-dim";
  const mobileActionClass =
    "focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim";

  const actionClass = isDesktop ? desktopActionClass : mobileActionClass;
  const dividerClass = isDesktop
    ? "my-1 border-t border-border-subtle"
    : "my-2 border-t border-border-subtle";
  const iconClass = isDesktop ? "size-4 shrink-0" : "size-5 shrink-0";

  const renderActionButton = (
    label: string,
    onClick: () => void,
    options?: {
      icon?: React.ReactNode;
      danger?: boolean;
      emphasize?: boolean;
    }
  ) => (
    <button
      type="button"
      role={isDesktop ? "menuitem" : undefined}
      onClick={onClick}
      className={cn(
        actionClass,
        options?.danger &&
          (isDesktop
            ? "text-danger hover:bg-danger/10"
            : "text-danger hover:bg-danger/10"),
        options?.emphasize && isDesktop && "font-medium"
      )}
    >
      {options?.icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <>
      {!isGhost &&
        renderActionButton("상대 프로필", onGoToProfile, {
          icon: <UserCircleIcon className={iconClass} />,
        })}

      {renderActionButton("상품 상세", onGoToProduct, {
        icon: <ShoppingBagIcon className={iconClass} />,
      })}

      {isSeller && (
        <>
          <div className={dividerClass} />

          {/* 판매자만 현재 대화 상대를 예약자/구매자로 전환 가능 */}
          {isSelling &&
            !isGhost &&
            renderActionButton("예약자로 지정", onReserveCounterparty, {
              icon: <UserPlusIcon className={iconClass} />,
            })}

          {isReserved && isCurrentReservationHolder && (
            <>
              {renderActionButton("예약 취소 (판매중)", onReservedToSelling, {
                icon: <ArrowUturnLeftIcon className={iconClass} />,
              })}
              {renderActionButton("판매완료 처리", onReservedToSold, {
                icon: <CheckCircleIcon className={iconClass} />,
                emphasize: true,
              })}
            </>
          )}

          {isSold &&
            renderActionButton("판매중으로 되돌리기", onOpenRevertDialog, {
              icon: <ArrowPathIcon className={iconClass} />,
            })}
        </>
      )}

      {!isGhost && (
        <>
          <div className={dividerClass} />
          {renderActionButton("상대방 차단하기", onOpenBlockConfirm, {
            icon: <UserMinusIcon className={iconClass} />,
          })}
          {renderActionButton("사용자 신고하기", onOpenReport, {
            icon: <ExclamationTriangleIcon className={iconClass} />,
          })}
        </>
      )}

      <div className={dividerClass} />
      {renderActionButton("채팅방 나가기", onOpenLeaveDialog, {
        icon: <ArrowRightOnRectangleIcon className={iconClass} />,
        danger: true,
      })}
    </>
  );
}
