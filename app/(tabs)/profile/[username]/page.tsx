/**
 * File Name : app/(tabs)/profile/[username]/page.tsx
 * Description : 타인 프로필 상세 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.07  임도헌   Created
 * 2024.12.07  임도헌   Modified  유저 프로필 페이지 추가
 * 2024.12.07  임도헌   Modified  평균 평점 가져오는 로직 수정
 * 2024.12.07  임도헌   Modified  리뷰 가져오는 로직 수정
 * 2024.12.15  임도헌   Modified  다크모드 적용
 * 2025.04.29  임도헌   Modified  유저가 보유한 뱃지 체크 추가
 * 2025.05.26  임도헌   Modified  팔로우 여부 추가
 * 2025.10.08  임도헌   Modified  viewerId/viewerFollowingIds/viewerInfo 주입 + 병렬화
 * 2025.10.12  임도헌   Modified  MyProfile 구조 반영: viewerFollowingIds/viewerInfo 제거, 개인화 최소화
 * 2025.10.22  임도헌   Modified  viewerInfo 서버 주입 제거(캐시 파편화 방지), 낙관 표시용은 클라 훅으로 대체
 * 2025.11.12  임도헌   Modified  MyProfile 레이아웃/톤 통일
 * 2025.11.22  임도헌   Modified  getIsFollowing 중복 호출 제거(getUserProfile.isFollowing만 사용)
 * 2025.11.26  임도헌   Modified  방송국 섹션에 최근 방송 목록 추가
 * 2026.01.04  임도헌   Modified  getSession 중복 호출 제거(getUserProfile.viewerId 재사용)로 RSC 부하 감소
 * 2026.01.15  임도헌   Modified  레이아웃 패딩 조정
 * 2026.01.29  임도헌   Modified  타인 프로필 페이지 주석 보강 및 구조 설명 추가
 * 2026.02.04  임도헌   Modified  신고 및 차단 기능을 위한 ProfileOptionMenu 추가
 * 2026.02.13  임도헌   Modified  generateMetadata 추가
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 initialReviews Prop Drilling 제거
 * 2026.03.03  임도헌   Modified  unstable_cache 래퍼(getCached~) 함수 호출을 순수 함수(getUserAverageRating 등)로 교체
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import BackButton from "@/components/global/BackButton";
import UserProfile from "@/features/user/components/profile/UserProfile";
import ProfileOptionMenu from "@/features/user/components/profile/ProfileOptionMenu";
import {
  getUserProfile,
  resolveUserIdByUsername,
} from "@/features/user/service/profile";
import { getUserReviewsAction } from "@/features/user/actions/review";
import { getUserAverageRating } from "@/features/user/service/metric";
import { getUserBadges } from "@/features/user/service/badge";
import { getUserProductsAction } from "@/features/user/actions/product";
import { getRecentBroadcasts } from "@/features/stream/service/list";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const username = decodeURIComponent(params.username);
  return {
    title: `${username}님의 선원증`,
    description: `${username}님의 보드포트 프로필입니다.`,
    openGraph: {
      title: `${username} - 보드포트`,
      description: `${username}님의 활동 내역과 판매 물품을 확인하세요.`,
    },
  };
}

/**
 * 타인 프로필 페이지
 *
 * [기능]
 * - URL의 username을 활용한 대상 사용자 ID 식별 및 정보 로드
 * - 본인 프로필 접근 시 내 프로필 페이지(`/profile`)로 강제 리다이렉트 처리
 * - 프로필 코어 정보, 평점, 뱃지, 최근 방송 목록의 서버 사이드 병렬 로드 적용
 * - TanStack Query를 활용한 대상 유저의 리뷰, 판매 중/판매 완료 상품 목록 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 */
export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  // 1. Username -> ID 변환
  const targetId = await resolveUserIdByUsername(params.username);
  if (!targetId) return notFound();

  // 2. Viewer(Session) 확인
  const session = await getSession();
  const viewerId = session?.id ?? null;

  // 본인이면 내 프로필로 이동
  if (viewerId === targetId) {
    redirect("/profile");
  }

  // 3. 프로필 기본 정보 로드
  const userProfile = await getUserProfile(targetId, viewerId);
  if (!userProfile) return notFound();

  const queryClient = getQueryClient();

  // 4. 데이터 병렬 로딩
  const [averageRating, userBadges, streams] = await Promise.all([
    getUserAverageRating(userProfile.id),
    getUserBadges(userProfile.id),
    getRecentBroadcasts(userProfile.id, 6, false),

    // TanStack Query Prefetch
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.reviews.user(userProfile.id),
      queryFn: () => getUserReviewsAction(userProfile.id, null),
      initialPageParam: null as any,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.userScope("SELLING", userProfile.id),
      queryFn: () =>
        getUserProductsAction(
          { type: "SELLING", userId: userProfile.id },
          null
        ),
      initialPageParam: null as any,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.userScope("SOLD", userProfile.id),
      queryFn: () =>
        getUserProductsAction({ type: "SOLD", userId: userProfile.id }, null),
      initialPageParam: null as any,
    }),
  ]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* 상단 액션바: 뒤로가기 + 옵션 메뉴 */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border sm:border-none">
        <BackButton fallbackHref="/profile" variant="appbar" className="px-0" />

        {/* 로그인 상태일 때만 옵션 메뉴 노출 */}
        {viewerId && (
          <ProfileOptionMenu
            targetId={userProfile.id}
            username={userProfile.username}
            isBlocked={userProfile.isBlocked}
          />
        )}
      </div>

      <div className="px-page-x pt-2">
        {/* 차단된 유저일 경우 안내 메시지 표시 */}
        {userProfile.isBlocked && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center">
            🚫 차단한 사용자입니다.
          </div>
        )}

        <HydrationBoundary state={dehydrate(queryClient)}>
          <UserProfile
            user={userProfile}
            averageRating={averageRating}
            userBadges={userBadges}
            myStreams={streams}
            viewerId={viewerId ?? undefined}
          />
        </HydrationBoundary>
      </div>
    </div>
  );
}
