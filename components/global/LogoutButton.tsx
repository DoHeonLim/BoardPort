/**
 * File Name : components/global/LogoutButton.tsx
 * Description : 로그아웃 처리 버튼 (pending + toast + redirect)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   로그아웃 액션 피드백 정합성 보강용 공용 버튼 추가
 * 2026.04.04  임도헌   Modified  props/export 주석을 보강해 공용 로그아웃 CTA의 책임을 더 명확히 정리
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logOut } from "@/features/auth/actions/logout";

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
  idleLabel?: string;
  pendingLabel?: string;
}

/**
 * 로그아웃 액션의 pending, toast, redirect 흐름을 공통 처리하는 버튼 컴포넌트
 *
 * - 로그아웃 서비스 호출
 * - 성공/실패 toast 처리
 * - 로그아웃 후 redirect 및 refresh 처리
 *
 * @param {LogoutButtonProps} props - 버튼 스타일과 문구, 이동 경로 설정
 * @returns {JSX.Element} 로그아웃 액션 버튼
 */
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
