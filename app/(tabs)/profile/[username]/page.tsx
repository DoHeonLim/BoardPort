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
 * 2026.01.29  임도헌   Modified   타인 프로필 페이지 주석 보강 및 구조 설명 추가
 */

import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import {
  getUserProfile,
  resolveUserIdByUsername,
} from "@/features/user/service/profile";
import { getCachedInitialUserReviews } from "@/features/user/service/review";
import { getCachedUserAverageRating } from "@/features/user/service/metric";
import { getCachedUserBadges } from "@/features/user/service/badge";
import { getInitialUserProducts } from "@/features/product/service/userList";
import { getCachedRecentBroadcasts } from "@/features/stream/service/list";
import UserProfile from "@/features/user/components/profile/UserProfile";

export const dynamic = "force-dynamic";

/**
 * 타인 프로필 페이지
 *
 * [기능]
 * 1. URL의 `username`을 기반으로 `userId`를 식별합니다.
 * 2. 현재 로그인한 사용자(Viewer)와의 관계(팔로우 여부 등)를 포함한 프로필 정보를 로드합니다.
 * 3. 대상 유저의 평점, 리뷰, 뱃지, 판매 중/완료 상품, 최근 방송(공개) 목록을 병렬로 조회합니다.
 * 4. 본인의 username인 경우 `/profile`로 리다이렉트합니다.
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

  // 4. 데이터 병렬 로딩
  const [
    averageRating,
    initialReviews,
    initialSellingProducts,
    initialSoldProducts,
    userBadges,
    streams,
  ] = await Promise.all([
    getCachedUserAverageRating(userProfile.id),
    getCachedInitialUserReviews(userProfile.id),
    getInitialUserProducts({ type: "SELLING", userId: userProfile.id }),
    getInitialUserProducts({ type: "SOLD", userId: userProfile.id }),
    getCachedUserBadges(userProfile.id),
    getCachedRecentBroadcasts(userProfile.id, 6, false), // 타인이므로 비공개 방송 제외
  ]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="px-page-x py-8">
        <UserProfile
          user={userProfile}
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
