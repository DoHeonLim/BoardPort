/**
 * File Name : app/(tabs)/profile/notifications/page.tsx
 * Description : 알림 설정 페이지 (NotificationPreferences + 푸시 구독)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   알림 설정 전용 페이지 추가
 * 2025.12.03  임도헌   Modified  stream 알림 추가
 * 2026.01.16  임도헌   Modified  [Rule 3.2] max-w-mobile 및 시맨틱 토큰 적용
 * 2026.01.29  임도헌   Modified  알림 설정 페이지 주석 보강 및 구조 설명 추가
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import db from "@/lib/db";
import NotificationSettingsClient from "@/features/notification/components/NotificationSettingsClient";
import BackButton from "@/components/global/BackButton";

/**
 * 알림 수신 설정 페이지
 *
 * [기능]
 * 1. 사용자의 알림 수신 동의 여부(채팅, 거래, 리뷰 등)와 방해 금지 시간을 설정합니다.
 * 2. DB에 설정 정보가 없는 경우 `upsert`를 통해 기본값을 생성하여 불러옵니다.
 * 3. 클라이언트 컴포넌트(`NotificationSettingsClient`)에 초기 설정값을 전달합니다.
 */
export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session.id) {
    redirect("/login?callbackUrl=/profile/notifications");
  }

  const userId = session.id;

  // 1. 알림 설정 정보 조회 또는 초기화 (Default: 모두 True)
  const prefs = await db.notificationPreferences.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      chat: true,
      trade: true,
      review: true,
      badge: true,
      stream: true,
      system: true,
      pushEnabled: true,
    },
  });

  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border h-14 w-full">
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton fallbackHref="/profile" variant="appbar" />
          <h1 className="text-lg font-bold text-primary">알림 설정</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-mobile px-page-x py-6">
        <NotificationSettingsClient prefs={prefs} />
      </div>
    </div>
  );
}
