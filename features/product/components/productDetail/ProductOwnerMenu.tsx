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
 * 2026.04.24  임도헌   Modified  내 판매 목록 삭제 복귀는 replace+refresh를 우선 적용하고 일반 back 분기와 주석을 현재 정책 기준으로 정리
 * 2026.04.24  임도헌   Modified  내 판매 목록도 전용 refresh relay를 통해 back + 1회 refresh 복귀를 사용하도록 조정
 * 2026.04.24  임도헌   Modified  returnTo 문맥 분류와 navigation refresh helper로 삭제/숨김 복귀 분기 중복을 정리
 * 2026.05.23  임도헌   Modified  삭제 성공 시 제품 infinite query 캐시와 stale cursor를 즉시 정리
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.08.28  임도헌   Modified  상품 복귀 문맥과 삭제 함수 JSDoc 보강
 */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  canUseBrowserBack,
  markNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";
import { queryKeys } from "@/lib/queryKeys";
import {
  removeProductFromInfiniteCache,
  type ProductInfiniteCache,
} from "@/features/product/utils/productQueryCache";

interface ProductOwnerMenuProps {
  productId: number;
  isModalContext?: boolean;
  isSold?: boolean;
  isHidden?: boolean;
}

type ProductReturnContext = "products" | "my-sales" | "chats" | "other";

/**
 * 상품 상세 진입 경로를 삭제·숨김 후 복귀 정책에 사용하는 문맥으로 분류한다.
 *
 * @param rawReturnTo - 상세 화면에 전달된 원본 복귀 경로
 * @returns 상품 목록·내 판매·채팅 또는 기타 문맥
 */
function getProductReturnContext(
  rawReturnTo: string | null
): ProductReturnContext {
  if (rawReturnTo?.startsWith("/products")) return "products";
  if (rawReturnTo?.startsWith("/profile/my-sales")) return "my-sales";
  if (rawReturnTo?.startsWith("/chats/")) return "chats";
  return "other";
}

/**
 * 상품 상세 owner 전용 관리 메뉴
 *
 * [기능]
 * - 상단 메뉴 버튼 하나로 수정/숨기기/삭제 관리 액션 제공
 * - 판매완료 상품만 숨기기/숨김 해제를 허용
 * - 모바일은 BottomSheet, 데스크톱은 드롭다운 메뉴 사용
 * - `/products` 문맥은 삭제 후 back 복귀를 우선하고, 목록 mixed tree 정리는 ProductListRefreshRelay에 위임
 * - `/profile/my-sales` 문맥도 back 복귀를 우선하고, 내 판매 mixed tree 정리는 MySalesRefreshRelay에 위임
 * - 숨기기/숨김 해제는 공개 목록(/products) 또는 내 판매(/profile/my-sales) 문맥으로 자연스럽게 복귀
 */
export default function ProductOwnerMenu({
  productId,
  isModalContext = false,
  isSold = false,
  isHidden = false,
}: ProductOwnerMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rawReturnTo = searchParams.get("returnTo");
  const returnTo = rawReturnTo ? sanitizeCallbackUrl(rawReturnTo) : "/products";
  const returnContext = getProductReturnContext(rawReturnTo);
  const nextAfterDelete = returnContext !== "chats" ? returnTo : "/products";
  const hasBackHistory = canUseBrowserBack();
  // 모달 상세는 목록 위에 열린 상태가 정상 문맥이므로 제품 목록 returnTo에서만 back 복귀 허용
  const canGoBackToProductsListModal =
    isModalContext && returnContext === "products" && hasBackHistory;
  const canGoBackToMySales = returnContext === "my-sales" && hasBackHistory;
  // rawReturnTo가 있어야 내부 문맥에서 온 복귀로 판단하고 history 재사용 허용
  // full-page 상세 삭제는 모바일 퍼스트 기준으로 back UX 우선
  const canGoBackAfterDelete =
    !!rawReturnTo &&
    returnContext !== "chats" &&
    returnContext !== "my-sales" &&
    hasBackHistory;
  const editFlow = isModalContext ? "modal-edit" : "detail-edit";
  const editHref = `/products/view/${productId}/edit?returnTo=${encodeURIComponent(
    returnTo
  )}&flow=${editFlow}`;

  // 데스크톱 드롭다운만 외부 클릭으로 닫고, 모바일 BottomSheet는 자체 닫기 UX 사용
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

  const goBackWithRefresh = (
    scope:
      | typeof NAVIGATION_REFRESH_SCOPES.PRODUCTS_LIST
      | typeof NAVIGATION_REFRESH_SCOPES.MY_SALES
  ) => {
    // 복귀 대상 화면의 relay가 flag를 소비해 stale/mixed tree 상태 정리
    markNavigationRefresh(scope, NAVIGATION_REFRESH_ROOT_ID);
    router.back();
  };

  const replaceReturnToAndRefresh = () => {
    // 안전한 back 대상이 없을 때는 명시 경로로 이동 후 현재 트리 재요청
    router.replace(returnTo);
    router.refresh();
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

      if (returnContext === "products") {
        // 공개 목록/모달 문맥은 back 복귀 후 제품 목록 relay에서 mixed tree 정리
        if (canGoBackToProductsListModal) {
          goBackWithRefresh(NAVIGATION_REFRESH_SCOPES.PRODUCTS_LIST);
          return;
        }

        replaceReturnToAndRefresh();
        return;
      }

      if (returnContext === "my-sales") {
        // 내 판매 문맥은 전용 relay가 my-sales 화면의 stale/mixed tree 정리
        if (canGoBackToMySales) {
          goBackWithRefresh(NAVIGATION_REFRESH_SCOPES.MY_SALES);
          return;
        }

        replaceReturnToAndRefresh();
        return;
      }

      router.refresh();
    });
  };

  /** 상품을 삭제하고 관련 목록 캐시를 정리한 뒤 진입 문맥에 맞게 복귀한다. */
  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProductAction(productId);

      if (!result.success) {
        toast.error(result.error ?? "상품 삭제에 실패했습니다.");
        return;
      }

      toast.success("상품이 삭제되었습니다.");
      setConfirmOpen(false);
      setIsOpen(false);
      removeRecentViewedProduct(productId);
      queryClient.setQueriesData(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "products" &&
            (query.queryKey[1] === "list" || query.queryKey[1] === "userScope"),
        },
        (oldData: ProductInfiniteCache<{ id: number }> | undefined) =>
          removeProductFromInfiniteCache(oldData, productId)
      );
      queryClient.removeQueries({
        queryKey: queryKeys.products.detail(productId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.products.likeStatus(productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      if (returnContext === "products") {
        // 제품 목록에서 진입한 상세 삭제는 모바일 back UX를 우선 유지
        if (canGoBackToProductsListModal) {
          goBackWithRefresh(NAVIGATION_REFRESH_SCOPES.PRODUCTS_LIST);
          return;
        }

        if (canGoBackAfterDelete) {
          goBackWithRefresh(NAVIGATION_REFRESH_SCOPES.PRODUCTS_LIST);
          return;
        }

        replaceReturnToAndRefresh();
        return;
      }

      if (returnContext === "my-sales") {
        // 내 판매에서 진입한 상세 삭제도 back 복귀 후 relay reload로 잔상 제거
        if (canGoBackToMySales) {
          goBackWithRefresh(NAVIGATION_REFRESH_SCOPES.MY_SALES);
          return;
        }

        replaceReturnToAndRefresh();
        return;
      }

      if (canGoBackAfterDelete) {
        router.back();
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
        title="상품을 삭제할까요?"
        description="삭제한 상품은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isPending}
      />
    </div>
  );
}
