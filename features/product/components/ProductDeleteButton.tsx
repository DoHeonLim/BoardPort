/**
 * File Name : features/product/components/ProductDeleteButton.tsx
 * Description : 제품 삭제 버튼 (ConfirmDialog 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   제품 수정 화면 삭제 액션을 ConfirmDialog 기반 클라이언트 버튼으로 분리
 * 2026.03.17  임도헌   Modified  상세에서 진입한 수정 흐름은 삭제 후 history back 기반 복귀와 목록 refresh 플래그를 함께 지원
 * 2026.03.18  임도헌   Modified  detail-edit와 modal-edit 삭제는 back 복귀를 지원해 stale history와 목록 히스토리 중복을 함께 완화
 * 2026.03.26  임도헌   Modified  수정 화면에서 삭제 CTA를 보조적인 파괴 액션으로 읽히도록 톤을 정리
 * 2026.04.02  임도헌   Modified  제품 삭제 버튼 JSDoc 보강
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { deleteProductAction } from "@/features/product/actions/delete";
import { setNavigationRefreshFlag } from "@/lib/navigationRefreshFlag";

interface ProductDeleteButtonProps {
  productId: number;
  nextHref: string;
  preferHistoryBack?: boolean;
  refreshFlagKey?: string;
}

/**
 * 제품 삭제 확인 및 후속 복귀 흐름을 담당하는 클라이언트 버튼
 *
 * [기능]
 * - ConfirmDialog를 통해 삭제 의도를 한 번 더 확인
 * - 삭제 성공 후 일반 편집은 replace 이동, 상세/모달 편집은 history back 복귀 지원
 * - history back 복귀 시 목록 새로고침이 필요하면 세션 refresh 플래그를 함께 기록
 *
 * @param {ProductDeleteButtonProps} props - 삭제 대상 제품 ID와 삭제 후 복귀 옵션
 */
export default function ProductDeleteButton({
  productId,
  nextHref,
  preferHistoryBack = false,
  refreshFlagKey,
}: ProductDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // detail/modal-edit 삭제는 history를 유지하고, 목록 freshness만 플래그 기반으로 보강
  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteProductAction(productId);

        if (!result.success) {
          toast.error(result.error ?? "제품 삭제에 실패했습니다.");
          return;
        }

        toast.success("제품이 삭제되었습니다.");
        setConfirmOpen(false);

        if (preferHistoryBack && typeof window !== "undefined") {
          // back 복귀 직후 목록만 1회 새로고침하도록 세션 플래그 기록
          if (refreshFlagKey) {
            setNavigationRefreshFlag(refreshFlagKey);
          }
          router.back();
          return;
        }

        router.replace(nextHref);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("제품 삭제 중 오류가 발생했습니다.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="w-full h-11 rounded-xl border border-danger/20 bg-danger/5 text-danger hover:bg-danger/10 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "삭제 중..." : "제품 삭제하기"}
      </button>

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
    </>
  );
}
