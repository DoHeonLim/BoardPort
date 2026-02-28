/**
 * File Name : app/(tabs)/profile/page.tsx
 * Description : 내 프로필 메인 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.10.05  임도헌   Created
 * 2024.10.05  임도헌   Modified   프로필 페이지 추가
 * 2024.10.07  임도헌   Modified   로그아웃 버튼 추가
 * 2024.11.25  임도헌   Modified   프로필 페이지 레이아웃 추가
 * 2024.11.28  임도헌   Modified   클라이언트 코드 분리
 * 2024.12.07  임도헌   Modified   리뷰 초깃값 이름 변경(initialReviews)
 * 2024.12.16  임도헌   Modified   테마 변경 버튼 추가
 * 2024.12.24  임도헌   Modified   뱃지 데이터 추가
 * 2025.05.16  임도헌   Modified   방송 데이터 추가
 * 2025.10.05  임도헌   Modified   데이터 병렬화 및 가드, 레이아웃 마이너 정리
 * 2025.10.07  임도헌   Modified   dynamic 적용 + 타입/데이터 통일
 * 2025.10.12  임도헌   Modified   병렬 로딩/타입정리/props 최종 정리
 * 2025.10.12  임도헌   Modified   getUserProfile 변경 반영
 * 2025.10.29  임도헌   Modified   Promise.all 튜플 타입 적용, 무효화 키 주석 추가
 * 2025.10.29  임도헌   Modified   비로그인 가드 리다이렉트 경로 수정(/login 등), revalidate 메모 보강
 * 2025.11.12  임도헌   Modified   내부 max-w 제거(중앙 정렬 체감↑), Harbor 배너/WaveDivider 추가,
 *                                 설정 드롭다운(ProfileSettingMenu) 상단 우측 배치
 * 2026.01.15  임도헌   Modified   상단 액션바 위치 조정 및 패딩 표준화
 * 2026.01.24  임도헌   Modified   Service 경로 수정 및 타입 정합성
 * 2026.01.29  임도헌   Modified   내 프로필 페이지 주석 보강 및 구조 설명 추가
 * 2026.02.11  임도헌   Modified   NotificationBell 추가 및 unreadCount 조회 병렬 처리
 */

// revalidateTag 트리거 메모
// - 프로필 코어:     user-core-id-${userId}
// - 팔로우 카운트:   user-followers-id-${userId}, user-following-id-${userId}
// - 리뷰 변경:       user-reviews-initial-id-${userId}, user-average-rating-id-${userId}
// - 배지 변경:       badges-all, user-badges-id-${userId}
// - 방송(채널) 변경:  user-streams-id-${ownerId}

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import ThemeToggle from "@/components/global/ThemeToggle";
import MyProfile from "@/features/user/components/profile/MyProfile";
import ProfileSettingMenu from "@/features/user/components/profile/ProfileSettingMenu";
import NotificationBell from "@/components/global/NotificationBell";
import { getUserProfile } from "@/features/user/service/profile";
import { getCachedInitialUserReviews } from "@/features/user/service/review";
import { getCachedUserAverageRating } from "@/features/user/service/metric";
import {
  getCachedAllBadges,
  getCachedUserBadges,
} from "@/features/user/service/badge";
import { getCachedRecentBroadcasts } from "@/features/stream/service/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import { logOut } from "@/features/auth/service/logout";
import type { BroadcastSummary } from "@/features/stream/types";
import type {
  Badge,
  ProfileAverageRating,
  ProfileReview,
} from "@/features/user/types";

export const dynamic = "force-dynamic";

/**
 * 내 프로필 페이지
 *
 * [기능]
 * 1. 세션을 확인하여 로그인 여부를 검증
 * 2. 내 프로필 정보(Core), 평점, 리뷰, 뱃지, 최근 방송 목록을 병렬로 로드
 * 3. `MyProfile` 컴포넌트를 통해 전체 UI를 구성
 */
export default async function ProfilePage() {
  // 1. 세션 및 유저 확인
  const session = await getSession();
  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile")}`);
  }
  const userId = session.id;

  const isAdmin = session.role === "ADMIN";

  const user = await getUserProfile(userId, userId);
  if (!user) redirect("/login");

  // 2. 대량 데이터 병렬 로딩 (성능 최적화)
  const [initialReviews, averageRating, badgesPair, streams, unreadCount]: [
    ProfileReview[],
    ProfileAverageRating | null,
    { badges: Badge[]; userBadges: Badge[] },
    BroadcastSummary[],
    number
  ] = await Promise.all([
    getCachedInitialUserReviews(user.id, userId),
    getCachedUserAverageRating(user.id),
    (async () => {
      const [badges, userBadges] = await Promise.all([
        getCachedAllBadges(),
        getCachedUserBadges(user.id),
      ]);
      return { badges, userBadges };
    })(),
    getCachedRecentBroadcasts(user.id, 6, true),
    getUnreadNotificationCount(),
  ]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* 상단 액션바: 설정 메뉴 및 테마 토글 */}
      <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-page-x h-16 bg-background/80 backdrop-blur-sm">
        {/* 알림 벨 추가 */}
        <NotificationBell userId={userId} initialCount={unreadCount} />

        <ProfileSettingMenu
          emailVerified={!!user.emailVerified}
          hasEmail={!!user.email}
          isAdmin={isAdmin}
        />
        <ThemeToggle />
      </div>

      <div className="px-page-x pt-2">
        <MyProfile
          user={user}
          initialReviews={initialReviews}
          averageRating={averageRating}
          badges={badgesPair.badges}
          userBadges={badgesPair.userBadges}
          myStreams={streams}
          viewerId={user.id}
          logOut={logOut}
        />
      </div>
    </div>
  );
}
