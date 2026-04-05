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
 * 2026.03.27  임도헌   Modified  토글은 상태만 담당하고 설치/재연결 안내는 부모 섹션이 아래에 쌓아 주도록 구조 정리
 * 2026.04.02  임도헌   Modified  푸시 상태 타입 import를 notification/types 공용 정의로 정리
 */

"use client";

import { useState, useEffect } from "react";
import { usePushNotification } from "@/features/notification/hooks/usePushNotification";
import type { PushNotificationStatus } from "@/features/notification/types";
import { cn } from "@/lib/utils";

type PushNotificationToggleProps = {
  onStatusChange?: (status: PushNotificationStatus) => void;
};

/**
 * 푸시 알림 전역 ON/OFF 스위치 컴포넌트
 *
 * [기능]
 * - `usePushNotification` 훅을 사용하여 현재 구독 상태를 조회하고 제어
 * - 브라우저 미지원 또는 프라이빗 모드일 경우 안내 메시지를 표시
 * - 토글 클릭 시 구독(subscribe) 또는 구독 해제(unsubscribe)를 수행
 */
export function PushNotificationToggle({
  onStatusChange,
}: PushNotificationToggleProps) {
  const {
    isSupported,
    isSubscribed,
    isPrivateMode,
    status,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const effectiveStatus: PushNotificationStatus =
    isIOS && !isStandalone
      ? "ios_install_required"
      : !isSupported
        ? "unsupported"
        : isPrivateMode
          ? "private_mode"
          : status;

  useEffect(() => {
    onStatusChange?.(effectiveStatus);
  }, [effectiveStatus, onStatusChange]);

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

  const canToggle =
    effectiveStatus !== "ios_install_required" &&
    effectiveStatus !== "unsupported" &&
    effectiveStatus !== "private_mode";

  const handleToggle = async () => {
    if (loading || !canToggle) return;
    setLoading(true);
    try {
      if (isSubscribed) await unsubscribe();
      else await subscribe();
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = loading
    ? null
    : effectiveStatus === "ios_install_required"
      ? "설치 필요"
      : effectiveStatus === "needs_reconnect"
      ? "재연결 필요"
      : effectiveStatus === "permission_denied"
        ? "권한 필요"
        : effectiveStatus === "unsupported"
          ? "미지원"
          : effectiveStatus === "private_mode"
            ? "프라이빗 모드"
        : isSubscribed
          ? "켜짐"
          : "꺼짐";

  const statusClassName =
    effectiveStatus === "ios_install_required" ||
    effectiveStatus === "needs_reconnect"
      ? "text-brand dark:text-brand-light"
      : effectiveStatus === "permission_denied"
        ? "text-danger"
        : "text-muted";

  return (
    <div className="flex items-center gap-3">
      <span className={cn("text-xs font-medium", statusClassName)}>
        {loading ? (
          <span className="inline-block size-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin mr-1" />
        ) : (
          statusLabel
        )}
      </span>

      {canToggle ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          role="switch"
          aria-checked={isSubscribed}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isSubscribed
              ? "bg-brand"
              : effectiveStatus === "needs_reconnect"
                ? "border-brand/25 bg-brand/15 dark:border-brand-light/25 dark:bg-brand-light/15"
                : "bg-neutral-300 dark:bg-neutral-600",
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
      ) : null}
    </div>
  );
}
