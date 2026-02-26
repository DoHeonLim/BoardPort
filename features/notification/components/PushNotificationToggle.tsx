/**
 * File Name : features/notification/components/PushNotificationToggle.tsx
 * Description : 푸시 알림 토글 컴포넌트 (전역 ON/OFF)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.20  임도헌   Created
 * 2024.12.20  임도헌   Modified  푸시 알림 토글 컴포넌트 추가
 * 2025.12.21  임도헌   Modified  기준 문구/동작 확정(훅 usePushNotification의 글로벌 OFF와 동기화)
 * 2026.01.10  임도헌   Modified  시맨틱 컬러 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/notification
 * 2026.01.17  임도헌   Moved     components/notification -> features/notification/components
 * 2026.02.25  임도헌   Modified  구독/해제 중 로딩 상태(isLoading) 및 스피너 UI 추가
 * 2026.02.26  임도헌   Modified  좁은 화면에서 UI 깨짐 수정
 */

"use client";

import { useState } from "react";
import { usePushNotification } from "@/features/notification/hooks/usePushNotification";
import { cn } from "@/lib/utils";

/**
 * 푸시 알림 전역 ON/OFF 스위치 컴포넌트
 *
 * [기능]
 * - `usePushNotification` 훅을 사용하여 현재 구독 상태를 조회하고 제어
 * - 브라우저 미지원 또는 프라이빗 모드일 경우 안내 메시지를 표시
 * - 토글 클릭 시 구독(subscribe) 또는 구독 해제(unsubscribe)를 수행
 */
export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isPrivateMode, subscribe, unsubscribe } =
    usePushNotification();

  const [loading, setLoading] = useState(false);

  // 브라우저 미지원 처리
  if (!isSupported) {
    return (
      <div className="text-[11px] sm:text-xs text-muted text-right leading-tight max-w-[160px]">
        이 브라우저에서는 푸시 알림을 지원하지 않습니다.
      </div>
    );
  }

  // 프라이빗 모드 처리 (Service Worker 제한)
  if (isPrivateMode) {
    return (
      <div className="text-[11px] sm:text-xs text-muted text-right leading-tight max-w-[160px]">
        프라이빗 모드에서는 사용할 수 없습니다.
      </div>
    );
  }

  const handleToggle = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs font-medium text-muted whitespace-nowrap">
        {loading ? (
          <span className="inline-block size-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin mr-1" />
        ) : isSubscribed ? (
          "켜짐"
        ) : (
          "꺼짐"
        )}
      </span>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={isSubscribed}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          isSubscribed ? "bg-brand" : "bg-neutral-300 dark:bg-neutral-600",
          loading && "opacity-50 cursor-wait"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            isSubscribed ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
