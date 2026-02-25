/**
 * File Name : features/user/components/profile/WithdrawalModal.tsx
 * Description : 회원 탈퇴 확인 및 실행 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created    ProfileEditForm에서 분리하여 독립 컴포넌트화
 */
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { withdrawAction } from "@/features/user/actions/withdraw";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawalModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleWithdraw = () => {
    startTransition(async () => {
      try {
        const res = await withdrawAction();
        if (res && !res.success) {
          toast.error(res.error);
        }
      } catch {
        toast.error("탈퇴 처리에 실패했습니다.");
      }
    });
  };

  return (
    <ConfirmDialog
      open={isOpen}
      title="정말 떠나시겠습니까?"
      description={
        <div className="space-y-2">
          <p>계정을 삭제하면 모든 활동 내역이 영구적으로 사라집니다.</p>
          <p className="text-danger font-bold text-xs">
            * 작성한 게시글, 댓글, 채팅, 거래 내역 등 복구 불가
          </p>
        </div>
      }
      confirmLabel="삭제 (탈퇴)"
      cancelLabel="취소"
      onConfirm={handleWithdraw}
      onCancel={onClose}
      loading={isPending}
    />
  );
}
