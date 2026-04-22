/**
 * File Name : features/product/components/productDetail/ProductOwnerMenu.tsx
 * Description : 상품 상세 owner 전용 관리 메뉴
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.06  임도헌   Created   상세/모달 상세의 수정/삭제 액션을 상단 메뉴로 통합
 * 2026.04.08  임도헌   Modified  삭제 후 최근 본 상품에서 제거하고 목록 진입 문맥이면 back + 목록 refresh로 복귀하도록 보강
 * 2026.04.09  임도헌   Modified  판매완료 상품 숨기기/숨김 해제 액션과 복귀 분기 추가
 */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  EllipsisVerticalIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { deleteProductAction } from "@/features/product/actions/delete";
import { toggleProductHiddenAction } from "@/features/product/actions/visibility";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { useIsMobile } from "@/hooks/useIsMobile";
import { removeRecentViewedProduct } from "@/features/product/utils/recentViewed";
import {
  createNavigationRefreshFlagKey,
  setNavigationRefreshFlag,
} from "@/lib/navigationRefreshFlag";

interface ProductOwnerMenuProps {
  productId: number;
  isModalContext?: boolean;
  isSold?: boolean;
  isHidden?: boolean;
}

/**
 * 상품 상세 owner 전용 관리 메뉴
 *
 * [기능]
 * - 상단 메뉴 버튼 하나로 수정/숨기기/삭제 관리 액션 제공
 * - 판매완료 상품만 숨기기/숨김 해제를 허용
 * - 모바일은 BottomSheet, 데스크톱은 드롭다운 메뉴 사용
 * - 목록에서 진입한 상세/모달은 삭제 후 history back으로 목록 문맥 유지
 * - 숨기기/숨김 해제는 공개 목록(/products) 또는 내 판매(/profile/my-sales) 문맥으로 자연스럽게 복귀
 */
export default function ProductOwnerMenu({
  productId,
  isModalContext = false,
  isSold = false,
  isHidden = false,
}: ProductOwnerMenuProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rawReturnTo = searchParams.get("returnTo");
  const returnTo = rawReturnTo
    ? sanitizeCallbackUrl(rawReturnTo)
    : "/products";
  const nextAfterDelete =
    returnTo && !returnTo.startsWith("/chats/") ? returnTo : "/products";
  const editFlow = isModalContext ? "modal-edit" : "detail-edit";
  const editHref = `/products/view/${productId}/edit?returnTo=${encodeURIComponent(
    returnTo
  )}&flow=${editFlow}`;

  useEffect(() => {
    if (isMobile) return;

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    router.push(editHref);
  };

  const handleToggleHidden = () => {
    startTransition(async () => {
      const nextHidden = !isHidden;
      const result = await toggleProductHiddenAction(productId, nextHidden);

      if (!result.success) {
        toast.error(
          result.error ??
            "상품 숨김 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      toast.success(
        nextHidden
          ? "판매완료 상품을 공개 목록에서 숨겼습니다."
          : "숨김을 해제해 다시 공개 목록에 노출합니다."
      );
      setIsOpen(false);

      if (nextHidden) {
        removeRecentViewedProduct(productId);
      }

      if (rawReturnTo?.startsWith("/products")) {
        setNavigationRefreshFlag(
          createNavigationRefreshFlagKey("products-list-refresh", "root")
        );

        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.replace(returnTo);
        router.refresh();
        return;
      }

      if (rawReturnTo?.startsWith("/profile/my-sales")) {
        router.replace(returnTo);
        router.refresh();
        return;
      }

      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProductAction(productId);

      if (!result.success) {
        toast.error(result.error ?? "제품 삭제에 실패했습니다.");
        return;
      }

      toast.success("제품이 삭제되었습니다.");
      setConfirmOpen(false);
      setIsOpen(false);
      removeRecentViewedProduct(productId);

      if (rawReturnTo?.startsWith("/products")) {
        setNavigationRefreshFlag(
          createNavigationRefreshFlagKey("products-list-refresh", "root")
        );

        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.replace(returnTo);
        router.refresh();
        return;
      }

      if (rawReturnTo?.startsWith("/profile/my-sales")) {
        router.replace(returnTo);
        router.refresh();
        return;
      }

      router.replace(nextAfterDelete);
      router.refresh();
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="상품 관리 메뉴 열기"
        aria-expanded={isOpen}
        aria-haspopup={isMobile ? "dialog" : "menu"}
        className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
      >
        <EllipsisVerticalIcon className="size-6" />
      </button>

      {!isMobile && isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xl"
        >
          <button
            type="button"
            onClick={handleEdit}
            role="menuitem"
            className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
          >
            <PencilSquareIcon className="size-4" />
            수정하기
          </button>
          {isSold && (
            <button
              type="button"
              onClick={handleToggleHidden}
              role="menuitem"
              className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
            >
              <EyeSlashIcon className="size-4" />
              {isHidden ? "숨김 해제" : "숨기기"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setConfirmOpen(true);
            }}
            role="menuitem"
            className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/10 dark:hover:bg-danger/20"
          >
            <TrashIcon className="size-4" />
            삭제하기
          </button>
        </div>
      )}

      <BottomSheet
        open={isMobile && isOpen}
        title="상품 관리"
        description="수정, 숨기기 또는 삭제를 진행할 수 있습니다."
        onClose={() => setIsOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleEdit}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <PencilSquareIcon className="size-5 shrink-0" />
            수정하기
          </button>
          {isSold && (
            <button
              type="button"
              onClick={handleToggleHidden}
              className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              <EyeSlashIcon className="size-5 shrink-0" />
              {isHidden ? "숨김 해제" : "숨기기"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setConfirmOpen(true);
            }}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <TrashIcon className="size-5 shrink-0" />
            삭제하기
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmOpen}
        title="제품을 삭제할까요?"
        description="삭제한 제품은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isPending}
      />
    </div>
  );
}
