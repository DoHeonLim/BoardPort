/**
 * File Name : features/user/components/profile/MyProfile.tsx
 * Description : 내 프로필 클라이언트
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
 * 2026.01.17  임도헌   Moved      components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified   주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.15  임도헌   Modified   내 동네 설정 버튼(MyLocationButton) 추가
 * 2026.02.26  임도헌   Modified   모든 버튼에 hover시 dark:hover:text-brand-light 추가
 * 2026.03.01  임도헌   Modified   이벤트 리스너(window.addEventListener) 제거 및 Zustand(ModalStore) 도입
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.06  임도헌   Modified   거래 정보 섹션에 '찜한 내역' 바로가기 링크 추가
 */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import ProfileHeader from "@/features/user/components/profile/ProfileHeader";
import UserBadges from "@/features/user/components/profile/UserBadges";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import StreamCard from "@/features/stream/components/StreamCard";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import {
  ChevronRightIcon,
  ShoppingBagIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { getMyBlockedUsersAction } from "@/features/user/actions/block";
import { useModalStore } from "@/components/global/providers/ModalStoreProvider";

import type { BroadcastSummary } from "@/features/stream/types";
import type {
  Badge,
  ProfileAverageRating,
  UserProfile,
} from "@/features/user/types";
import { HeartIcon } from "@heroicons/react/24/solid";

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
const BlockedUsersModal = dynamic(() => import("./BlockedUsersModal"), {
  ssr: false,
});
const WithdrawalModal = dynamic(() => import("./WithdrawalModal"), {
  ssr: false,
});

type MyProfileProps = {
  user: UserProfile;
  averageRating: ProfileAverageRating | null;
  badges: Badge[];
  userBadges: Badge[];
  myStreams?: BroadcastSummary[];
  viewerId?: number;
  logOut: () => Promise<void>;
};

/**
 * 내 프로필 메인 UI 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - 서버로부터 하이드레이션(Hydration)된 유저 정보, 평점, 뱃지, 최근 방송 데이터 선언적 렌더링
 * - `useModalStore` 기반 Zustand 전역 상태 구독을 통한 다중 모달(리뷰, 뱃지, 이메일, 비밀번호, 차단 관리 등) 표시 제어
 * - 차단한 유저 데이터 로딩(Server Action) 중 토스트 피드백 표시 및 로딩 완료 시 상태 병합 처리
 */
export default function MyProfile({
  user,
  averageRating,
  badges,
  userBadges,
  myStreams,
  viewerId,
  logOut,
}: MyProfileProps) {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const fullLocation = [user.region1, user.region2, user.region3]
    .filter(Boolean)
    .join(" ");

  // Zustand 모달 스토어 구독
  const modals = useModalStore((state) => state.modals);
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);

  // 차단 유저 목록 로드 및 모달 오픈
  useEffect(() => {
    if (modals.block && blockedUsers.length === 0) {
      const loadBlockedUsers = async () => {
        const toastId = toast.loading("차단한 선원 목록을 불러오는 중...");
        try {
          const data = await getMyBlockedUsersAction();
          setBlockedUsers(data);
          toast.dismiss(toastId);
        } catch (error) {
          console.error(error);
          toast.error("목록을 불러오는 데 실패했습니다.", { id: toastId });
          closeModal("block");
        }
      };
      loadBlockedUsers();
    }
  }, [modals.block, blockedUsers.length, closeModal]);

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
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-primary">알림 설정</h2>
          <Link
            href="/profile/notifications/setting"
            className="text-xs text-muted hover:text-brand dark:hover:text-brand-light transition-colors"
          >
            상세 설정
          </Link>
        </div>
        <div className="panel p-4 flex items-center justify-between gap-4">
          <span className="text-sm text-primary font-medium shrink-0">
            푸시 알림 받기
          </span>
          <div className="flex-1 flex justify-end min-w-0">
            {/* 우측 정렬 영역 확보 */}
            <PushNotificationToggle />
          </div>
        </div>
      </section>

      {/* 3. My Neighborhood */}
      <section>
        <h2 className="text-sm font-bold text-primary mb-3">내 동네 설정</h2>
        <MyLocationButton
          currentRegion={user.region2}
          fullLocation={fullLocation || user.locationName}
        />
      </section>

      {/* 4. Trade Info */}
      <section>
        <h2 className="text-sm font-bold text-primary mb-3">거래 정보</h2>
        <div className="grid grid-cols-2 gap-3">
          {/*  판매 내역 */}
          <Link
            href="/profile/my-sales"
            className="group p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-2 text-brand dark:text-brand-light">
              <TagIcon className="size-5" />
              <span className="text-sm font-semibold">판매 내역</span>
            </div>
            <p className="text-xs text-muted group-hover:text-primary transition-colors">
              판매 중인 물품 관리
            </p>
          </Link>
          {/*  구매 내역 */}
          <Link
            href="/profile/my-purchases"
            className="group p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-500">
              <ShoppingBagIcon className="size-5" />
              <span className="text-sm font-semibold">구매 내역</span>
            </div>
            <p className="text-xs text-muted group-hover:text-primary transition-colors">
              구매한 물품 확인
            </p>
          </Link>
          {/*  찜한 내역 */}
          <Link
            href="/profile/my-likes"
            className="col-span-2 flex items-center justify-between group p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center gap-2 mb-1 text-rose-500">
                <HeartIcon className="size-5" />
                <span className="text-sm font-semibold">찜한 내역</span>
              </div>
              <p className="text-xs text-muted group-hover:text-primary transition-colors">
                내가 찜한 관심 상품
              </p>
            </div>
            <ChevronRightIcon className="size-5 text-muted group-hover:text-brand transition-colors" />
          </Link>
        </div>
      </section>

      {/* 5. Channel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">내 방송국</h2>
          <Link
            href={`/profile/${user.username}/channel`}
            className="text-xs text-muted hover:text-brand dark:hover:text-brand-light transition-colors flex items-center"
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
                  shortDescription
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Reviews & Badges */}
      <div className="grid grid-cols-1 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-primary">받은 거래 후기</h2>
            <button
              onClick={() => openModal("review")}
              className="text-xs text-muted hover:text-brand dark:hover:text-brand-light"
            >
              전체 보기
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-primary">획득한 뱃지</h2>
            <button
              onClick={() => openModal("badge")}
              className="text-xs text-muted hover:text-brand dark:hover:text-brand-light"
            >
              전체 보기
            </button>
          </div>
          <UserBadges badges={userBadges} max={6} />
        </section>
      </div>

      <div className="pt-6 border-t border-border mt-2">
        <form action={logOut}>
          <button className="w-full h-12 rounded-xl bg-surface border border-border text-danger hover:bg-danger/5 transition-colors text-sm font-semibold">
            로그아웃
          </button>
        </form>
      </div>

      {/* Zustand 상태 기반 모달 렌더링 */}
      {modals.review && (
        <ProfileReviewsModal
          isOpen={modals.review}
          onClose={() => closeModal("review")}
          userId={user.id}
        />
      )}
      {modals.badge && (
        <ProfileBadgesModal
          isOpen={modals.badge}
          closeModal={() => closeModal("badge")}
          badges={badges}
          userBadges={userBadges}
        />
      )}
      {modals.email && (
        <EmailVerificationModal
          isOpen={modals.email}
          onClose={() => closeModal("email")}
          email={user.email || ""}
        />
      )}
      {modals.password && (
        <PasswordChangeModal
          isOpen={modals.password}
          onClose={() => closeModal("password")}
        />
      )}
      {modals.block && (
        <BlockedUsersModal
          isOpen={modals.block}
          onClose={() => closeModal("block")}
          initialBlockedUsers={blockedUsers}
        />
      )}
      {modals.withdraw && (
        <WithdrawalModal
          isOpen={modals.withdraw}
          onClose={() => closeModal("withdraw")}
        />
      )}
    </div>
  );
}
