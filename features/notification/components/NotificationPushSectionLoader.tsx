/**
 * File Name : features/notification/components/NotificationPushSectionLoader.tsx
 * Description : 푸시 알림 설정의 브라우저 전용 지연 로딩 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   Next.js 16 Server Component의 ssr:false 제한에 맞춰 클라이언트 경계 분리
 */

"use client";

import dynamic from "next/dynamic";

const NotificationPushSection = dynamic(
  () => import("@/features/notification/components/NotificationPushSection"),
  {
    ssr: false,
    loading: () => (
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold text-primary">푸시 알림</h2>
        <div className="panel flex items-center justify-between p-4">
          <div className="space-y-1">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-dim/70" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-dim/50" />
          </div>
          <div className="h-6 w-11 animate-pulse rounded-full bg-surface-dim/70" />
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted">
          전체 푸시를 끄면 기기 알림은 오지 않습니다.
        </p>
      </section>
    ),
  }
);

/**
 * 브라우저 전용 Push 알림 설정 영역을 스켈레톤과 함께 지연 로딩한다.
 *
 * @returns Push 알림 설정 섹션의 클라이언트 로더
 */
export default function NotificationPushSectionLoader() {
  return <NotificationPushSection />;
}
