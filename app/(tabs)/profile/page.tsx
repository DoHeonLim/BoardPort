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
 * 2026.03.03  임도헌   Modified   서버 컴포넌트 하이드레이션(HydrationBoundary) 적용 및 initialReviews Prop Drilling 제거
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.06  임도헌   Modified   로그아웃 UX를 공용 LogoutButton(pending/toast) 기반으로 정리
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import ThemeToggle from "@/components/global/ThemeToggle";
import MyProfile from "@/features/user/components/profile/MyProfile";
import ProfileSettingMenu from "@/features/user/components/profile/ProfileSettingMenu";
import NotificationBell from "@/components/global/NotificationBell";
import { getUserProfile } from "@/features/user/service/profile";
import { getUserReviewsAction } from "@/features/user/actions/review";
import { getUserAverageRating } from "@/features/user/service/metric";
import { getAllBadges, getUserBadges } from "@/features/user/service/badge";
import { getRecentBroadcasts } from "@/features/stream/service/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";

export const dynamic = "force-dynamic";

/**
 * 내 프로필 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - 프로필 코어 정보, 평점, 뱃지, 최근 방송 목록, 안 읽은 알림 수의 서버 사이드 병렬 로드(Promise.all) 적용
 * - 유저의 리뷰 목록에 대한 TanStack Query 기반 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 주입 및 `MyProfile` 클라이언트 UI 구성
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

  const queryClient = getQueryClient();

  // 2. 대량 데이터 병렬 로딩 (성능 최적화)
  const [averageRating, badgesPair, streams, unreadCount] = await Promise.all([
    getUserAverageRating(user.id),
    (async () => {
      const [badges, badgesEarned] = await Promise.all([
        getAllBadges(),
        getUserBadges(user.id),
      ]);
      return { badges, userBadges: badgesEarned };
    })(),
    getRecentBroadcasts(user.id, 6, true),
    getUnreadNotificationCount(),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.reviews.user(user.id),
      queryFn: () => getUserReviewsAction(user.id, null),
      initialPageParam: null as any,
    }),
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
        <HydrationBoundary state={dehydrate(queryClient)}>
          <MyProfile
            user={user}
            averageRating={averageRating}
            badges={badgesPair.badges}
            userBadges={badgesPair.userBadges}
            myStreams={streams}
            viewerId={user.id}
          />
        </HydrationBoundary>
      </div>
    </div>
  );
}
