/**
 * File Name : components/global/LogoutButton.tsx
 * Description : 로그아웃 처리 버튼 (pending + toast + redirect)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   로그아웃 액션 피드백 정합성 보강용 공용 버튼 추가
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logOut } from "@/features/auth/service/logout";

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
  idleLabel?: string;
  pendingLabel?: string;
}

export default function LogoutButton({
  className,
  redirectTo = "/",
  idleLabel = "로그아웃",
  pendingLabel = "로그아웃 중...",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logOut();

      if (!result.success) {
        toast.error(result.error ?? "로그아웃에 실패했습니다.");
        return;
      }

      toast.success("로그아웃되었습니다.");
      router.replace(redirectTo);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? pendingLabel : idleLabel}
    </button>
  );
}
