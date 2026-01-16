/**
 * File Name : components/profile/MyProfile
 * Description : 내 프로필 클라이언트 코드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.28  임도헌   Created
 * 2024.11.28  임도헌   Modified   프로필 페이지에서 클라이언트 코드 분리
 * 2024.11.30  임도헌   Modified   프로필 페이지 디자인 변경
 * 2024.12.07  임도헌   Modified   프로필 페이지 디자인 다시 변경
 * 2024.12.07  임도헌   Modified   프로필 이미지 컴포넌트 분리
 * 2024.12.17  임도헌   Modified   프로필 페이지 디자인 변경
 * 2024.12.20  임도헌   Modified   푸시 알림 토글 컴포넌트 추가
 * 2024.12.31  임도헌   Modified   이메일 인증 기능 추가
 * 2025.05.22  임도헌   Modified   내 방송국 기능 추가
 * 2025.10.05  임도헌   Modified   averageRating 타입 최신 스키마로 정합
 * 2025.10.05  임도헌   Modified   FollowListModal prop 이름 변경(followingIds → viewerFollowingIds)
 * 2025.10.05  임도헌   Modified   myStreams 안전 가드 추가(length/map)
 * 2025.10.06  임도헌   Modified   BroadcastSummary 타입 단언 수정
 * 2025.10.12  임도헌   Modified   팔로워/팔로잉 로딩/커서/중복 제거 공용 훅 적용
 * 2025.10.14  임도헌   Modified   FollowSection 도입
 * 2025.10.29  임도헌   Modified   날짜 포맷 유틸/모달 지연 로드/a11y 보강
 * 2025.11.12  임도헌   Modified   액션 툴바 제거 → 섹션 헤더 우측 링크형 액션으로 통일,
 *                                 SettingsMenu 커스텀 이벤트 리스너 도입
 * 2025.11.23  임도헌   Modified   내 방송국 섹션 StreamCard(layout="rail") 적용,
 *                                 가로 스크롤 카드 폭/간격 반응형 정리
 * 2025.11.26  임도헌   Modified   StreamCard에 vodIdForRecording Props 추가
 * 2025.11.29  임도헌   Modified   알림 설정 섹션 텍스트 정리 및 상세 설정 링크 추가
 * 2025.12.12  임도헌   Modified   상위 padding과 중복되는 mx 제거, 모달 조건부 렌더로 진짜 지연 로드
 * 2026.01.15  임도헌   Modified   섹션 간격 및 스타일 통일
 */

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProfileHeader from "./ProfileHeader";
import UserBadges from "./UserBadges";
import StreamCard from "../stream/StreamCard";
import { PushNotificationToggle } from "../notification/PushNotificationToggle";

import {
  ChevronRightIcon,
  ShoppingBagIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import type { BroadcastSummary } from "@/types/stream";
import type {
  Badge,
  ProfileAverageRating,
  ProfileReview,
  UserProfile,
} from "@/types/profile";

// 동적 로딩
const ProfileReviewsModal = dynamic(() => import("./ProfileReviewsModal"), {
  ssr: false,
});
const ProfileBadgesModal = dynamic(() => import("./ProfileBadgesModal"), {
  ssr: false,
});
const PasswordChangeModal = dynamic(() => import("./PasswordChangeModal"), {
  ssr: false,
});
const EmailVerificationModal = dynamic(
  () => import("./EmailVerificationModal"),
  { ssr: false }
);

type Props = {
  user: UserProfile;
  initialReviews: ProfileReview[];
  averageRating: ProfileAverageRating | null;
  badges: Badge[];
  userBadges: Badge[];
  myStreams?: BroadcastSummary[];
  viewerId?: number;
  logOut: () => Promise<void>;
};

export default function MyProfile({
  user,
  initialReviews,
  averageRating,
  badges,
  userBadges,
  myStreams,
  viewerId,
  logOut,
}: Props) {
  const [modalState, setModalState] = useState({
    password: false,
    review: false,
    badge: false,
    email: false,
  });

  const toggleModal = useCallback(
    (key: keyof typeof modalState, open: boolean) => {
      setModalState((prev) => ({ ...prev, [key]: open }));
    },
    []
  );

  useEffect(() => {
    const onPass = () => toggleModal("password", true);
    const onEmail = () => toggleModal("email", true);

    window.addEventListener("open-password-modal", onPass);
    window.addEventListener("open-email-verification-modal", onEmail);
    return () => {
      window.removeEventListener("open-password-modal", onPass);
      window.removeEventListener("open-email-verification-modal", onEmail);
    };
  }, [toggleModal]); // [Fix] 의존성 배열에 toggleModal 추가

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Header */}
      <ProfileHeader
        ownerId={user.id}
        ownerUsername={user.username}
        createdAt={user.created_at}
        averageRating={averageRating}
        followerCount={user._count?.followers ?? 0}
        followingCount={user._count?.following ?? 0}
        viewerId={viewerId}
        avatarUrl={user.avatar ?? null}
        showFollowButton={false}
      />

      {/* 2. Notification */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">알림 설정</h2>
          <Link
            href="/profile/notifications"
            className="text-xs text-muted hover:text-brand transition-colors"
          >
            상세 설정
          </Link>
        </div>
        <div className="panel p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">
            푸시 알림 받기
          </span>
          <PushNotificationToggle />
        </div>
      </section>

      {/* 3. Trade Info */}
      <section>
        <h2 className="text-sm font-bold text-primary mb-3">거래 정보</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/profile/my-sales"
            className="group p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-2 text-brand">
              <TagIcon className="size-5" />
              <span className="text-sm font-semibold">판매 내역</span>
            </div>
            <p className="text-xs text-muted group-hover:text-primary transition-colors">
              판매 중인 물품 관리
            </p>
          </Link>

          <Link
            href="/profile/my-purchases"
            className="group p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <ShoppingBagIcon className="size-5" />
              <span className="text-sm font-semibold">구매 내역</span>
            </div>
            <p className="text-xs text-muted group-hover:text-primary transition-colors">
              구매한 물품 확인
            </p>
          </Link>
        </div>
      </section>

      {/* 4. Channel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">내 방송국</h2>
          <Link
            href={`/profile/${user.username}/channel`}
            className="text-xs text-muted hover:text-brand transition-colors flex items-center"
          >
            전체 보기 <ChevronRightIcon className="size-3 ml-0.5" />
          </Link>
        </div>

        {!myStreams || myStreams.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-xl bg-surface-dim/30">
            <p className="text-xs text-muted">아직 방송 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {myStreams.map((s) => (
              <div key={s.id} className="w-[200px] shrink-0">
                <StreamCard
                  id={s.id}
                  title={s.title}
                  thumbnail={s.thumbnail}
                  isLive={s.status === "CONNECTED"}
                  streamer={{
                    username: s.user.username,
                    avatar: s.user.avatar ?? null,
                  }}
                  layout="rail"
                  // compact mode
                  shortDescription
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Reviews & Badges (Combined for neatness) */}
      <div className="grid grid-cols-1 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-primary">받은 거래 후기</h2>
            <button
              onClick={() => toggleModal("review", true)}
              className="text-xs text-muted hover:text-brand"
            >
              전체 보기
            </button>
          </div>
          {/* Preview or count can go here */}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-primary">획득한 뱃지</h2>
            <button
              onClick={() => toggleModal("badge", true)}
              className="text-xs text-muted hover:text-brand"
            >
              전체 보기
            </button>
          </div>
          <UserBadges badges={userBadges} max={6} />
        </section>
      </div>

      {/* Logout */}
      <div className="pt-6 border-t border-border mt-2">
        <form action={logOut}>
          <button className="w-full h-12 rounded-xl bg-surface border border-border text-danger hover:bg-danger/5 transition-colors text-sm font-semibold">
            로그아웃
          </button>
        </form>
      </div>

      {/* Modals */}
      {modalState.review && (
        <ProfileReviewsModal
          isOpen={modalState.review}
          onClose={() => toggleModal("review", false)}
          reviews={initialReviews}
          userId={user.id}
        />
      )}
      {modalState.badge && (
        <ProfileBadgesModal
          isOpen={modalState.badge}
          closeModal={() => toggleModal("badge", false)}
          badges={badges}
          userBadges={userBadges}
        />
      )}
      {modalState.email && (
        <EmailVerificationModal
          isOpen={modalState.email}
          onClose={() => toggleModal("email", false)}
          email={user.email || ""}
        />
      )}
      {modalState.password && (
        <PasswordChangeModal
          isOpen={modalState.password}
          onClose={() => toggleModal("password", false)}
        />
      )}
    </div>
  );
}
