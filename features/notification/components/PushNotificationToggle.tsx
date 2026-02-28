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
 * 2026.02.28  임도헌   Modified  iOS 사파리 가이드 제공
 */

"use client";

import { useState, useEffect } from "react";
import { usePushNotification } from "@/features/notification/hooks/usePushNotification";
import { ShareIcon } from "@heroicons/react/24/outline";
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
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. iOS 계열 기기인지 확인
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 2. 현재 '홈 화면에 추가'된 PWA 모드로 실행 중인지 확인
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // [Case 1] iOS/사파리 브라우저에서 접속했을 때 (앱 설치 유도)
  if (isIOS && !isStandalone) {
    return (
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-brand/5 border border-dashed border-brand/20 animate-fade-in">
        <div className="flex items-center gap-2 text-xs font-bold text-brand dark:text-brand-light">
          <ShareIcon className="size-4" />
          <span>알림을 켜는 방법</span>
        </div>
        <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
          아이폰(iOS) 사파리에서는{" "}
          <span className="text-primary font-bold">공유</span> 버튼 클릭 후
          <br />
          <span className="text-primary font-bold underline underline-offset-2">
            '홈 화면에 추가'
          </span>
          를 먼저 진행해 주세요.
          <br />
          설치된 앱을 실행하면 알림을 활성화할 수 있습니다. ⚓
        </p>
      </div>
    );
  }

  // [Case 2] 브라우저가 푸시를 아예 지원하지 않는 경우
  if (!isSupported) {
    return (
      <div className="text-xs sm:text-sm text-muted text-center sm:text-left py-2">
        이 브라우저는 푸시 알림을 지원하지 않습니다.
      </div>
    );
  }

  // [Case 3] 프라이빗 모드(시크릿 모드)인 경우
  if (isPrivateMode) {
    return (
      <div className="text-sm text-muted text-center sm:text-left py-2">
        프라이빗 모드에서는 푸시 알림을 사용할 수 없습니다.
      </div>
    );
  }

  // [Case 4] 정상 동작 (안드로이드 크롬 또는 설치된 iOS PWA)
  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isSubscribed) await unsubscribe();
      else await subscribe();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted">
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
