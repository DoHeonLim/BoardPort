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
 */

"use client";

import { useEffect, useState } from "react";
import NotificationListener from "@/features/notification/components/NotificationListener";
import type { MeResponse } from "@/app/api/me/route";

/**
 * 알림 시스템 부트스트랩 컴포넌트
 *
 * - `RootLayout`에 배치되어 앱이 로드될 때 실행됩니다.
 * - `/api/me`를 호출하여 현재 로그인된 유저 ID를 확인합니다. (캐시 방지를 위해 `no-store` 사용)
 * - 유저 ID가 확인되면 `NotificationListener`를 렌더링하여 실시간 알림 구독을 시작합니다.
 * - 비로그인 상태이거나 에러 발생 시 아무것도 렌더링하지 않습니다.
 */
export default function NotificationBoot() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
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
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!userId) return null;
  return <NotificationListener userId={userId} />;
}
