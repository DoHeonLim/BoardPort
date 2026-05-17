/**
 * File Name : app/(app)/(tabs)/profile/page.tsx
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
 * 2026.03.08  임도헌   Modified   삼성 인터넷에서만 표시되는 다크모드 안내문 추가
 * 2026.03.12  임도헌   Modified   프로필 상단 액션바를 flat 헤더 톤으로 통일해 탭 UI와 시각적 일관성 확보
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/page.tsx 에서 app/(app)/(tabs)/profile/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.16  임도헌   Modified   profile Lighthouse 대응으로 서버 선로딩/클라이언트 하단 지연 로드 구조 설명 주석 보강
 * 2026.04.17  임도헌   Modified   헤더 보조 주석을 현재 역할 기준으로 다듬어 unreadCount 선로딩 의도를 명확화
 * 2026.04.24  임도헌   Modified   녹화 상세 삭제 후 내 프로필로 back 복귀할 때 방송국 섹션을 1회 refresh하도록 relay 추가
 * 2026.05.17  임도헌   Modified   리뷰 prefetch 커서 타입을 명시
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import ThemeToggle from "@/components/global/ThemeToggle";
import SamsungInternetThemeNotice from "@/components/global/SamsungInternetThemeNotice";
import MyProfile from "@/features/user/components/profile/MyProfile";
import ProfileSettingMenu from "@/features/user/components/profile/ProfileSettingMenu";
import NotificationBell from "@/components/global/NotificationBell";
import { getUserProfile } from "@/features/user/service/profile";
import { getUserReviewsAction } from "@/features/user/actions/review";
import { getUserReviews } from "@/features/user/service/review";
import { getUserAverageRating } from "@/features/user/service/metric";
import { getAllBadges, getUserBadges } from "@/features/user/service/badge";
import { getRecentBroadcasts } from "@/features/stream/service/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import RecordingListRefreshRelay from "@/features/stream/components/RecordingListRefreshRelay";

export const dynamic = "force-dynamic";

/**
 * 내 프로필 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - 프로필 코어 정보, 평점, 뱃지, 최근 방송 목록, 안 읽은 알림 수의 서버 사이드 병렬 로드(Promise.all) 적용
 * - 유저의 리뷰 목록에 대한 TanStack Query 기반 서버 프리패치(Prefetch) 적용
 * - 첫 화면 렌더링에 필요한 데이터는 서버에서 한 번에 준비하고, 하단 무거운 UI는 `MyProfile` 내부에서 지연 로드
 * - 상단 액션바를 flat 헤더 톤으로 유지하고 삼성 인터넷 다크모드 안내문을 조건부 노출
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
  const [averageRating, badgesPair, streams, unreadCount, previewReviews] =
    await Promise.all([
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
      getUserReviews(user.id, null, 2, user.id).then((res) => res.reviews),
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.reviews.user(user.id),
        queryFn: () => getUserReviewsAction(user.id, null),
        initialPageParam: null as number | null,
      }),
    ]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* 녹화 상세 삭제 후 /profile로 back 복귀하면 내 방송국 목록만 1회 서버 payload 재요청으로 보정 */}
      <RecordingListRefreshRelay />
      <header className="sticky top-0 z-30 h-16 border-b border-border-subtle bg-background shadow-sm">
        <div className="flex h-full items-center justify-end gap-2 px-page-x">
          {/* 헤더에서 바로 필요한 unread count의 서버 동시 준비 및 첫 렌더 즉시 노출 */}
          <NotificationBell userId={userId} initialCount={unreadCount} />

          <ProfileSettingMenu
            emailVerified={!!user.emailVerified}
            hasEmail={!!user.email}
            isAdmin={isAdmin}
          />
          <ThemeToggle />
        </div>
      </header>

      <div className="px-page-x">
        <SamsungInternetThemeNotice />
      </div>

      <div className="px-page-x pt-2">
        {/* 첫 화면 데이터의 서버 주입 및 하단 섹션 분리의 MyProfile 내부 처리 */}
        <HydrationBoundary state={dehydrate(queryClient)}>
          <MyProfile
            user={user}
            averageRating={averageRating}
            badges={badgesPair.badges}
            userBadges={badgesPair.userBadges}
            previewReviews={previewReviews}
            myStreams={streams}
            viewerId={user.id}
          />
        </HydrationBoundary>
      </div>
    </div>
  );
}
