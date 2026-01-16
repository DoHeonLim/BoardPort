/**
 * File Name : components/notification/NotificationBoot.tsx
 * Description : 클라이언트에서 /api/me로 로그인 유저를 확인 후 NotificationListener를 부팅하는 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.12  임도헌   Created   RootLayout의 getSession 제거를 위해 NotificationBoot 추가
 * 2025.12.12  임도헌   Modified  cache:no-store 적용, 언마운트 가드 추가
 * 2025.12.12  임도헌   Modified  401(UNAUTHORIZED)도 JSON 파싱으로 명확히 처리, credentials 포함
 * 2026.01.16  임도헌   Moved     components/common -> components/notification
 */

"use client";

import { useEffect, useState } from "react";
import NotificationListener from "@/components/notification/NotificationListener";
import type { MeResponse } from "@/app/api/me/route";

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

        // 401이어도 JSON을 파싱해서 UNAUTHORIZED를 확실히 분기
        let data: MeResponse | null = null;
        try {
          data = (await res.json()) as MeResponse;
        } catch {
          // JSON이 아니거나 빈 바디면 실패로 처리
          data = null;
        }

        if (!mounted) return;

        if (!data) return; // 예기치 않은 응답(네트워크/서버 에러 등)

        if (data.ok) {
          setUserId(data.user.id);
          return;
        }

        // 여기서 명확히 "로그인 안 됨"을 확정
        // 현재 요구사항: 조용히 무시(알림 부팅 안 함)
        // 필요하면 추후 로그/메트릭을 여기서만 추가하면 됨.
        if (data.error === "UNAUTHORIZED") {
          setUserId(null);
        }
      } catch {
        // 네트워크 오류는 조용히 무시 (알림 부팅만 실패)
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!userId) return null;
  return <NotificationListener userId={userId} />;
}
