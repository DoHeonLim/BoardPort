/**
 * File Name : features/notification/components/NotificationBoot.tsx
 * Description : 클라이언트에서 /api/me로 로그인 유저를 확인 후 NotificationListener를 부팅하는 컴포넌트
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
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { MeResponse } from "@/app/api/me/route";

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

/**
 * 알림 시스템 부트스트랩 컴포넌트
 *
 * - `RootLayout`에 배치되어 앱이 로드될 때 실행
 * - 기본 경로에서는 앱 진입 직후가 아닌 유휴 시점에 `/api/me`를 1회 호출하여 현재 로그인된 유저 ID를 확인
 * - 스트림 상세 경로에서는 운영 액션 실시간 반영을 위해 지연 없이 즉시 부팅
 * - 유저 ID가 확인되면 `NotificationListener`를 렌더링하여 실시간 알림 구독을 시작
 * - 비로그인 상태이거나 에러 발생 시 아무것도 렌더링하지 않음
 */
export default function NotificationBoot() {
  const [userId, setUserId] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    let removeLoadListener: (() => void) | null = null;

    const bootstrap = async () => {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });

        // 401(Unauthorized) 응답도 JSON으로 파싱하여 정확한 에러 타입 확인
        let data: MeResponse | null = null;
        try {
          data = (await res.json()) as MeResponse;
        } catch {
          // JSON 파싱 실패 시 (예: 서버 에러 페이지 등)
          data = null;
        }

        if (!mounted) return;

        if (!data) return;

        if (data.ok) {
          setUserId(data.user.id);
          return;
        }

        // 로그인되지 않은 경우
        if (data.error === "UNAUTHORIZED") {
          setUserId(null);
        }
      } catch {
        // 네트워크 오류 등 발생 시 조용히 무시 (알림 시스템만 비활성)
      }
    };

    const shouldBootstrapImmediately = pathname?.startsWith("/streams/");

    if (shouldBootstrapImmediately) {
      void bootstrap();
      return () => {
        mounted = false;
      };
    }

    const idleWindow = window as IdleWindow;
    const scheduleBootstrap = () => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(
          () => {
            void bootstrap();
          },
          { timeout: 3000 }
        );
        return;
      }

      timeoutId = window.setTimeout(() => {
        void bootstrap();
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
  }, [pathname]);

  if (!userId) return null;
  return <NotificationListener userId={userId} />;
}
