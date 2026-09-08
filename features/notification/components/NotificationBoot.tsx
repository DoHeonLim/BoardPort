/**
 * File Name : features/notification/components/NotificationBoot.tsx
 * Description : 서버 세션 사용자 ID로 NotificationListener를 지연 부팅하는 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.12  임도헌   Created   RootLayout의 getSession 제거를 위해 NotificationBoot 추가
 * 2025.12.12  임도헌   Modified  cache:no-store 적용, 언마운트 가드 추가
 * 2025.12.12  임도헌   Modified  401(UNAUTHORIZED)도 JSON 파싱으로 명확히 처리, credentials 포함
 * 2026.01.16  임도헌   Moved     components/common -> components/notification
 * 2026.01.17  임도헌   Moved     components/notification -> features/notification/components
 * 2026.02.24  임도헌   Modified  퍼블릭 경로 가드 추가 (불필요한 /api/me 401 호출 방지)
 * 2026.04.13  임도헌   Modified  앱 진입 후 유휴 시점에만 부트스트랩을 시작하도록 지연하여 초기 메인스레드 부담 완화
 * 2026.04.13  임도헌   Modified  경로 변경마다 반복되던 /api/me 조회를 제거하고 1회 부팅으로 정리
 * 2026.04.13  임도헌   Modified  NotificationListener를 동적 로딩으로 전환해 초기 공통 번들에서 실시간 구독 코드를 분리
 * 2026.04.13  임도헌   Modified  window load 이후 idle 시점으로 부팅을 더 미뤄 초기 products 렌더 경쟁을 완화
 * 2026.04.22  임도헌   Modified  스트림 상세에서는 운영 액션(강제 퇴장/채팅 금지/유저 차단) 실시간 반영을 위해 NotificationListener 부팅을 지연하지 않도록 보강
 * 2026.08.13  임도헌   Modified  인증된 앱 진입 시 Push endpoint 계정 소유권 재확인 추가
 * 2026.08.28  임도헌   Modified  서버 세션 ID를 재사용해 navigation별 /api/me 조회 제거
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { usePushNotification } from "@/features/notification/hooks/usePushNotification";

const NotificationListener = dynamic(
  () => import("@/features/notification/components/NotificationListener"),
  { ssr: false, loading: () => null }
);

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

interface NotificationBootProps {
  userId: number | null;
}

/**
 * migration에서 fail-closed로 비활성화된 기기를 포함해, 인증된
 * 사용자가 앱에 진입하면 현재 endpoint+키 소유권을 재확인한다.
 * 상태 UI는 설정 화면이 담당하므로 이 컴포넌트는 표시 요소가 없다.
 */
function PushSubscriptionReconciler() {
  usePushNotification();
  return null;
}

/**
 * 알림 시스템 부트스트랩 컴포넌트
 *
 * - 로그인 후 `AppLayout`에 배치되어 앱이 로드될 때 실행
 * - 서버 앱 레이아웃에서 이미 확인한 세션 사용자 ID를 재사용해 별도 `/api/me` 조회를 만들지 않음
 * - 기본 경로에서는 앱 진입 직후가 아닌 유휴 시점까지 실시간 알림 구독을 지연
 * - 스트림 상세 경로에서는 운영 액션 실시간 반영을 위해 지연 없이 즉시 부팅
 * - 유저 ID가 확인되면 Push 기기 소유권을 재확인하고 `NotificationListener`를 렌더링해 실시간 알림 구독을 시작
 * - 유효한 세션 사용자 ID가 없으면 아무것도 렌더링하지 않음
 *
 * @param props - 서버 세션에서 확인한 사용자 ID
 * @returns 준비 완료 후 렌더링되는 푸시 조정기와 실시간 알림 리스너
 */
export default function NotificationBoot({ userId }: NotificationBootProps) {
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!userId || isReady) return;

    let mounted = true;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    let removeLoadListener: (() => void) | null = null;

    /** 예약된 시점에도 마운트 상태가 유지되면 알림 구독 렌더링을 허용한다. */
    const bootstrap = () => {
      if (mounted) setIsReady(true);
    };

    const shouldBootstrapImmediately = pathname?.startsWith("/streams/");

    if (shouldBootstrapImmediately) {
      bootstrap();
      return () => {
        mounted = false;
      };
    }

    const idleWindow = window as IdleWindow;
    const scheduleBootstrap = () => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(
          () => {
            bootstrap();
          },
          { timeout: 3000 }
        );
        return;
      }

      timeoutId = window.setTimeout(() => {
        bootstrap();
      }, 1800);
    };

    if (document.readyState === "complete") {
      scheduleBootstrap();
    } else {
      const handleLoad = () => {
        scheduleBootstrap();
      };
      window.addEventListener("load", handleLoad, { once: true });
      removeLoadListener = () => {
        window.removeEventListener("load", handleLoad);
      };
    }

    return () => {
      mounted = false;
      removeLoadListener?.();
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId != null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [isReady, pathname, userId]);

  if (!userId || !isReady) return null;
  return (
    <>
      <PushSubscriptionReconciler key={userId} />
      <NotificationListener userId={userId} />
    </>
  );
}
