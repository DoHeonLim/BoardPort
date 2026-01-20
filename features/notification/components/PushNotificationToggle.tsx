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
 */

"use client";

import { usePushNotification } from "@/features/notification/hooks/usePushNotification";
import { cn } from "@/lib/utils";

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isPrivateMode, subscribe, unsubscribe } =
    usePushNotification();

  if (!isSupported) {
    return (
      <div className="text-xs sm:text-sm text-muted text-center sm:text-left">
        이 브라우저에서는 푸시 알림을 지원하지 않습니다.
      </div>
    );
  }

  if (isPrivateMode) {
    return (
      <div className="text-sm text-muted text-center sm:text-left">
        프라이빗 모드에서는 푸시 알림을 사용할 수 없습니다.
      </div>
    );
  }

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (error) {
      console.error("Push notification toggle error:", error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted">
        {isSubscribed ? "켜짐" : "꺼짐"}
      </span>

      <button
        type="button"
        onClick={handleToggle}
        role="switch"
        aria-checked={isSubscribed}
        aria-label="푸시 알림 설정"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
          isSubscribed ? "bg-brand" : "bg-neutral-300 dark:bg-neutral-600"
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
