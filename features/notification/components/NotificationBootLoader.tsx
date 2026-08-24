/**
 * File Name : features/notification/components/NotificationBootLoader.tsx
 * Description : 알림 부트스트랩의 브라우저 전용 지연 로딩 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   Next.js 16 Server Component의 ssr:false 제한에 맞춰 클라이언트 경계 분리
 */

"use client";

import dynamic from "next/dynamic";

const NotificationBoot = dynamic(
  () => import("@/features/notification/components/NotificationBoot"),
  { ssr: false, loading: () => null }
);

/**
 * 브라우저 환경에서만 알림 부트스트랩을 지연 로딩한다.
 *
 * @returns 클라이언트에서 로드되는 알림 부트스트랩
 */
export default function NotificationBootLoader() {
  return <NotificationBoot />;
}
