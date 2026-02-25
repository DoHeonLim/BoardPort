/**
 * File Name : app/(tabs)/profile/notifications/list/page.tsx
 * Description : 사용자의 알림 목록 페이지 (읽음 처리 기능 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 페이지 구현
 * 2026.02.13  임도헌   Modified  키워드 알림 관리 섹션 추가
 * 2026.02.21  임도헌   Modified  유저 위치 정보(getUserLocation) 로드 및 주입
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import BackButton from "@/components/global/BackButton";
import NotificationListContainer from "@/features/notification/components/NotificationListContainer";
import KeywordAlertManager from "@/features/notification/components/KeywordAlertManager";
import { getUserLocation } from "@/features/user/service/profile";
import { getMyKeywordAlerts } from "@/features/notification/service/keyword";
import { getNotificationsAction } from "@/features/notification/actions/list";

export const dynamic = "force-dynamic";

/**
 * 내 알림함 페이지
 * - 수신한 알림 목록을 확인하고 읽음 처리를 수행
 * - 상단에서 키워드 알림을 등록 시 사용할 유저의 지역 정보(행정동명 등)를 함께 로드하여 주입
 */
export default async function NotificationListPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/notifications/list");
  }

  const page = Number(searchParams.page) || 1;

  // 병렬 데이터 로딩 (알림 + 키워드 + 유저 위치)
  const [notiResult, keywordAlerts, userLocation] = await Promise.all([
    getNotificationsAction(page),
    getMyKeywordAlerts(session.id),
    getUserLocation(session.id),
  ]);

  if (!notiResult.success) {
    return <div>알림을 불러오는 데 실패했습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border h-14 w-full">
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton fallbackHref="/profile" variant="appbar" />
          <h1 className="text-lg font-bold text-primary">알림 센터</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-mobile px-page-x py-6 space-y-8">
        {/* 1. 키워드 알림 관리 섹션 */}
        <section>
          <KeywordAlertManager
            initialKeywords={keywordAlerts}
            userLocation={userLocation ?? { regionRange: "ALL" }}
          />
        </section>

        {/* 2. 알림 목록 섹션 */}
        <section>
          <NotificationListContainer data={notiResult.data} />
        </section>
      </div>
    </div>
  );
}
