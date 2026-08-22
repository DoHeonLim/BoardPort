/**
 * File Name : features/user/components/profile/WithdrawalModal.tsx
 * Description : 회원 탈퇴 확인 및 실행 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created    ProfileEditForm에서 분리하여 독립 컴포넌트화
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.08.13  임도헌   Modified  탈퇴 성공 시 사용자 Query cache를 비운 뒤 홈으로 이동
 * 2026.08.21  임도헌   Modified  탈퇴 완료 후 다른 탭에도 인증 cache 초기화 신호 전파
 * 2026.08.22  임도헌   Modified  탈퇴 성공 시 삭제 계정의 Realtime JWT 캐시 폐기
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { withdrawAction } from "@/features/user/actions/withdraw";
import { finalizeClientAuthExit } from "@/features/auth/utils/authContextReset";
import { invalidateRealtimeAccessToken } from "@/lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawalModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const handleWithdraw = () => {
    startTransition(async () => {
      try {
        const res = await withdrawAction();
        if (!res.success) {
          toast.error(res.error);
          return;
        }

        toast.success("회원 탈퇴가 완료되었습니다.");
        invalidateRealtimeAccessToken();
        finalizeClientAuthExit(queryClient, router);
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
