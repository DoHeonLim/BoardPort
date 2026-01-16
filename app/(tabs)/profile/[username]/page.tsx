/**
 * File Name : app/(tabs)/profile/[username]/page
 * Description : 유저 프로필 페이지 (MyProfile와 통일된 레이아웃/모달 on-demand)
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
 */

import { notFound } from "next/navigation";

import { getUserProfile } from "@/lib/user/getUserProfile";
import { getCachedInitialUserReviews } from "@/lib/user/getUserReviews";
import { getCachedUserAverageRating } from "@/lib/user/getUserAverageRating";
import { getCachedUserBadges } from "@/lib/user/getUserBadges";
import { getInitialUserProducts } from "@/lib/product/getUserProducts";
import { getUserStreams } from "@/lib/stream/getUserStreams";

import type { UserProfile as UserProfileType } from "@/types/profile";
import type { BroadcastSummary } from "@/types/stream";
import UserProfile from "@/components/profile/UserProfile";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  // 프로필 조회 (본인이면 /profile로 redirect)
  const user = (await getUserProfile({
    username: params.username,
    redirectIfSelfToProfile: true,
  })) as UserProfileType | null;

  if (!user) return notFound();

  // getUserProfile이 session을 이미 읽어 viewerId를 주입한다.
  // 동일 요청 내 중복 getSession 호출을 피하기 위해 user.viewerId를 재사용한다.
  const viewerId = user.viewerId ?? null;

  // 공용 데이터는 캐시, 개인화는 최소(팔로우 여부는 getUserProfile.isFollowing 사용)
  const [
    averageRating,
    initialReviews,
    initialSellingProducts,
    initialSoldProducts,
    userBadges,
    streams,
  ] = await Promise.all([
    getCachedUserAverageRating(user.id),
    getCachedInitialUserReviews(user.id),
    getInitialUserProducts({ type: "SELLING", userId: user.id }),
    getInitialUserProducts({ type: "SOLD", userId: user.id }),
    getCachedUserBadges(user.id),
    (async () => {
      const { items } = await getUserStreams({
        ownerId: user.id,
        viewerId,
        take: 6,
        includeViewerRole: false,
      });
      return items as BroadcastSummary[];
    })(),
  ]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="px-page-x py-8">
        <UserProfile
          user={user}
          initialReviews={initialReviews}
          initialSellingProducts={initialSellingProducts}
          initialSoldProducts={initialSoldProducts}
          averageRating={averageRating}
          userBadges={userBadges}
          myStreams={streams}
          viewerId={viewerId ?? undefined}
        />
      </div>
    </div>
  );
}
