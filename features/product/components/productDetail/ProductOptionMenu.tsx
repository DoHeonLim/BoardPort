/**
 * File Name : features/product/components/productDetail/ProductOptionMenu.tsx
 * Description : 상품 상세 옵션 메뉴
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   상품 신고 기능 구현
 * 2026.02.05  임도헌   Modified  판매자 차단 기능 추가 (신고와 통합)
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet로 전환하고 트리거 접근성을 보강
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleBlockAction } from "@/features/user/actions/block";
import {
  EllipsisVerticalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { useIsMobile } from "@/hooks/useIsMobile";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface productOptionMenuProps {
  productId: number;
  sellerId: number;
  sellerName: string;
}

/**
 * 상품 상세 페이지 옵션 메뉴
 * - 판매자 차단 및 상품 신고 기능을 제공
 * - 드롭다운 형태로 메뉴를 노출하고 각 액션에 대한 모달을 연결
 *
 * @param productId - 상품 ID
 * @param sellerId - 판매자 ID
 * @param sellerName - 판매자 닉네임 (차단 확인 메시지용)
 */
export default function ProductOptionMenu({
  productId,
  sellerId,
  sellerName,
}: productOptionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (isMobile) return;

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, isOpen]);

  const handleBlock = () => {
    startTransition(async () => {
      const result = await toggleBlockAction(sellerId, "block");
      if (result.success) {
        toast.success("판매자를 차단했습니다.");
        router.replace("/products"); // 차단 후 목록으로 이동
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setBlockConfirmOpen(false);
      setIsOpen(false);
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="상품 옵션 열기"
        aria-expanded={isOpen}
        aria-haspopup={isMobile ? "dialog" : "menu"}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
      >
        <EllipsisVerticalIcon className="size-6" />
      </button>

      {!isMobile && isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in"
        >
          <button
            onClick={() => {
              setIsOpen(false);
              setBlockConfirmOpen(true);
            }}
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10 dark:hover:bg-danger/20 flex items-center gap-2"
          >
            <UserMinusIcon className="size-4" />
            판매자 차단하기
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setReportOpen(true);
            }}
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2 border-t border-border"
          >
            <ExclamationTriangleIcon className="size-4" />
            상품 신고하기
          </button>
        </div>
      )}

      <BottomSheet
        open={isMobile && isOpen}
        title="상품 옵션"
        description="판매자 차단 또는 상품 신고를 진행할 수 있습니다."
        onClose={() => setIsOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setBlockConfirmOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <UserMinusIcon className="size-5 shrink-0" />
            판매자 차단하기
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setReportOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <ExclamationTriangleIcon className="size-5 shrink-0" />
            상품 신고하기
          </button>
        </div>
      </BottomSheet>

      {/* 차단 확인 모달 */}
      <ConfirmDialog
        open={blockConfirmOpen}
        title="판매자 차단"
        description={`${sellerName}님을 차단하시겠습니까?`}
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />

      {/* 신고 모달 */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={productId}
        targetType="PRODUCT"
      />
    </div>
  );
}
