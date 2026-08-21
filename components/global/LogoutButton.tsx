/**
 * File Name : components/global/LogoutButton.tsx
 * Description : 로그아웃 처리 버튼 (pending + toast + redirect)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   로그아웃 액션 피드백 정합성 보강용 공용 버튼 추가
 * 2026.04.04  임도헌   Modified  props/export 주석을 보강해 공용 로그아웃 CTA의 책임을 더 명확히 정리
 * 2026.08.13  임도헌   Modified  로그아웃 기기의 Push 구독과 사용자 Query cache 격리
 * 2026.08.21  임도헌   Modified  인증 종료 후 다른 탭에도 cache 초기화 신호 전파
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logOut } from "@/features/auth/actions/logout";
import { finalizeClientAuthExit } from "@/features/auth/utils/authContextReset";

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
  idleLabel?: string;
  pendingLabel?: string;
}

/**
 * 현재 origin에 연결된 PushSubscription을 조회한다.
 *
 * Push API를 지원하지 않거나 등록된 Service Worker가 없으면 이 기기는 정리할
 * 구독이 없는 것으로 간주한다. 조회 자체가 실패한 경우에는 기존 구독의 존재
 * 여부를 확정할 수 없으므로 호출자에게 예외를 전달한다.
 */
async function getCurrentPushSubscription() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;

  return registration.pushManager.getSubscription();
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
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      let currentPushSubscription: PushSubscription | null;

      try {
        currentPushSubscription = await getCurrentPushSubscription();
      } catch (error) {
        console.error("[logout] failed to inspect device push state:", error);
        toast.error(
          "이 기기의 알림 연결을 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      let result;

      try {
        result = await logOut(currentPushSubscription?.toJSON() ?? null);
      } catch (error) {
        console.error("[logout] server action failed:", error);
        toast.error("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      if (!result.success) {
        toast.error(result.error ?? "로그아웃에 실패했습니다.");
        return;
      }

      // 서버가 이 endpoint를 현재 계정에서 분리한 뒤 브라우저 구독도 정리한다.
      // 브라우저 정리 실패가 다른 기기의 구독이나 이미 완료된 로그아웃을 되돌리지는 않는다.
      if (currentPushSubscription) {
        try {
          await currentPushSubscription.unsubscribe();
        } catch (error) {
          console.warn("[logout] browser push cleanup failed:", error);
        }
      }

      toast.success("로그아웃되었습니다.");
      finalizeClientAuthExit(queryClient, router, redirectTo);
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
