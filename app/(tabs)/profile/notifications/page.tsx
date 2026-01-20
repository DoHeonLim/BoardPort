/**
 * File Name : app/(tabs)/profile/notifications/page
 * Description : 알림 설정 페이지 (NotificationPreferences + 푸시 구독)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   알림 설정 전용 페이지 추가
 * 2025.12.03  임도헌   Modified  stream 알림 추가
 * 2026.01.16  임도헌   Modified  [Rule 3.2] max-w-mobile 및 시맨틱 토큰 적용
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import db from "@/lib/db";
import NotificationSettingsClient from "@/features/notification/components/NotificationSettingsClient";
import BackButton from "@/components/global/BackButton";

export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session.id) {
    redirect("/login?callbackUrl=/profile/notifications");
  }

  const userId = session.id;

  // 존재하지 않으면 기본값으로 생성 후 불러오기
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
