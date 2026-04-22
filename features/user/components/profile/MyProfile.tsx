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
 * 2026.02.26  임도헌   Modified   프로필 화면 주요 버튼/링크 hover 대비를 다크모드 기준으로 보강
 * 2026.03.01  임도헌   Modified   이벤트 리스너(window.addEventListener) 제거 및 Zustand(ModalStore) 도입
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.06  임도헌   Modified   거래 정보 섹션에 '찜한 내역' 바로가기 링크 추가
 * 2026.03.06  임도헌   Modified   공용 LogoutButton 적용으로 로그아웃 피드백 정합성 보강
 * 2026.03.09  임도헌   Modified   최근 방송 카드에 실제 VOD가 있는 종료 방송만 다시보기 배지/경로를 표시
 * 2026.03.12  임도헌   Modified   프로필 거래/빈 상태 카드 외곽선을 border-border-subtle 톤으로 통일
 * 2026.03.12  임도헌   Modified   프로필 거래 카드 아이콘 색을 다크모드 가시성과 판매/구매 구분 기준으로 재조정
 * 2026.03.13  임도헌   Modified   알림 설정/방송국 전체 보기 진입에 현재 프로필 경로 returnTo를 함께 전달해 복귀 맥락 유지
 * 2026.03.14  임도헌   Modified   회원 탈퇴를 로그아웃과 분리된 하단 위험 액션으로 이동해 설정 메뉴 혼재를 완화
 * 2026.03.15  임도헌   Modified   이메일 미인증 계정에 비밀번호 찾기/계정 복구 안내와 즉시 인증 진입 배너 추가
 * 2026.03.16  임도헌   Modified   내 프로필 IA 조정안을 되돌리고 기존 계정 관리 중심 리듬에 맞춰 섹션 순서를 복원
 * 2026.03.17  임도헌   Modified   내 방송국 rail 카드 래퍼 고정폭을 제거해 축소된 StreamCard 폭을 그대로 사용
 * 2026.03.18  임도헌   Modified   알림 설정 링크용 현재 프로필 경로를 내부 경로 기준으로 정규화해 바깥 복귀 문맥과 nested returnTo 예외를 함께 보강
 * 2026.03.21  임도헌   Modified   내 방송국 카드에서는 소유자 정보가 자명하므로 StreamCard 스트리머 행 숨김
 * 2026.03.27  임도헌   Modified   알림 설정 섹션을 상태별 stacked 안내 구조로 정리해 iOS/재연결/권한 필요 케이스를 자연스럽게 표시
 * 2026.04.08  임도헌   Modified   내 방송국 rail 좌우 정렬선을 다른 프로필 섹션과 같은 시작선으로 맞춤
 * 2026.04.09  임도헌   Modified   판매/구매/찜한 내역 바로가기 진입 시 상단 스크롤 초기화를 명시해 이전 프로필 스크롤 문맥 유지 완화
 * 2026.04.10  임도헌   Modified   profile 타이포 정책에 맞춰 주요 CTA/상태 카드/거래 카드 라벨을 400·500·700 체계로 정리
 * 2026.04.16  임도헌   Modified   profile Lighthouse 대응으로 하단 섹션 지연 로드 분리 및 진입 라벨/a11y 주석 정리
 */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import ProfileHeader from "@/features/user/components/profile/ProfileHeader";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import {
  ArrowPathIcon,
  BellAlertIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { getMyBlockedUsersAction } from "@/features/user/actions/block";
import { useModalStore } from "@/components/global/providers/ModalStoreProvider";

import type { BroadcastSummary } from "@/features/stream/types";
import type {
  Badge,
  ProfileAverageRating,
  UserProfile,
} from "@/features/user/types";
import type { PushNotificationStatus } from "@/features/notification/types";

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
// 첫 화면 밖 섹션의 별도 청크 분리를 통한 /profile 초기 JS 및 LCP/TBT 부담 완화
const MyProfileDeferredSections = dynamic(
  () => import("./MyProfileDeferredSections"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" aria-hidden="true">
        <div className="h-48 rounded-2xl border border-border-subtle bg-surface-dim/40" />
        <div className="h-56 rounded-2xl border border-border-subtle bg-surface-dim/40" />
        <div className="h-64 rounded-2xl border border-border-subtle bg-surface-dim/40" />
      </div>
    ),
  }
);

type MyProfileProps = {
  user: UserProfile;
  averageRating: ProfileAverageRating | null;
  badges: Badge[];
  userBadges: Badge[];
  previewReviews: import("@/features/user/types").ProfileReview[];
  myStreams?: BroadcastSummary[];
  viewerId?: number;
};

/**
 * 내 프로필 메인 UI 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - 서버로부터 하이드레이션(Hydration)된 유저 정보, 평점, 뱃지, 최근 방송 데이터를 선언적으로 렌더링
 * - 프로필 헤더/인증/알림/내 동네처럼 첫 화면 맥락에 필요한 섹션은 즉시 렌더링
 * - 거래 정보/내 방송국/후기/뱃지/계정 액션은 `MyProfileDeferredSections`로 분리해 아래 영역 부하를 지연 처리
 * - `useModalStore` 기반 Zustand 전역 상태 구독을 통한 다중 모달(리뷰, 뱃지, 이메일, 비밀번호, 차단 관리 등) 표시 제어
 * - 차단한 유저 데이터 로딩(Server Action) 중 토스트 피드백 표시 및 로딩 완료 시 상태 병합 처리
 */
export default function MyProfile({
  user,
  averageRating,
  badges,
  userBadges,
  previewReviews,
  myStreams,
  viewerId,
}: MyProfileProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const returnTo = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
  const [blockedUsers, setBlockedUsers] = useState<any[] | null>(null);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [pushStatus, setPushStatus] =
    useState<PushNotificationStatus>("disabled");
  const fullLocation = [user.region1, user.region2, user.region3]
    .filter(Boolean)
    .join(" ");

  // Zustand 모달 스토어 구독
  const modals = useModalStore((state) => state.modals);
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);

  // 차단 유저 목록 로드 및 모달 오픈
  useEffect(() => {
    if (!modals.block || blockedUsers !== null) return;

    const loadBlockedUsers = async () => {
      setBlockedUsersLoading(true);
      try {
        const data = await getMyBlockedUsersAction();
        setBlockedUsers(data);
      } catch (error) {
        console.error(error);
        toast.error("목록을 불러오는 데 실패했습니다.");
        closeModal("block");
      } finally {
        setBlockedUsersLoading(false);
      }
    };

    loadBlockedUsers();
  }, [modals.block, blockedUsers, closeModal]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. 프로필 헤더 */}
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

      {user.email && !user.emailVerified && (
        <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              <EnvelopeIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-primary">
                이메일 인증이 필요합니다
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                이메일 인증을 완료해야 비밀번호 찾기와 계정 복구를 사용할 수
                있습니다.
              </p>
              <button
                type="button"
                onClick={() => openModal("email")}
                className="focus-ring-strong mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-brand-dark px-4 text-sm font-medium text-white transition-colors hover:bg-brand dark:bg-brand-dark dark:hover:bg-brand"
              >
                지금 인증하기
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. 알림 설정 및 기기 상태 안내 */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-primary">알림 설정</h2>
          <Link
            href={`/profile/notifications/setting?returnTo=${encodeURIComponent(returnTo)}`}
            prefetch={false}
            className="focus-ring-soft rounded-md text-xs text-muted hover:text-brand dark:hover:text-brand-light transition-colors"
          >
            상세 설정
          </Link>
        </div>
        <div className="panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-primary">푸시 알림 받기</p>
              <p className="text-xs leading-relaxed text-muted">
                새 메시지와 거래 상태 변경을 기기 알림으로 받아보세요.
              </p>
            </div>
            <div className="shrink-0">
              <PushNotificationToggle onStatusChange={setPushStatus} />
            </div>
          </div>

          {pushStatus === "ios_install_required" ? (
            <div className="mt-4 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ShareIcon className="size-4 text-brand dark:text-brand-light" />
                <span>홈 화면에 추가한 뒤 알림을 켤 수 있어요</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                아이폰(iOS) 사파리에서는 공유 버튼을 누른 뒤
                <span className="px-1 font-medium text-primary">
                  홈 화면에 추가
                </span>
                를 먼저 진행해야 합니다.
              </p>
            </div>
          ) : pushStatus === "needs_reconnect" ? (
            <div className="mt-4 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ArrowPathIcon className="size-4 text-brand dark:text-brand-light" />
                <span>이 기기의 알림 연결이 끊어졌어요</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                브라우저 또는 기기 설정 변경으로 연결이 해제되었을 수 있어요.
                오른쪽 스위치를 눌러 다시 연결하면 새 알림을 계속 받을 수
                있습니다.
              </p>
            </div>
          ) : pushStatus === "permission_denied" ? (
            <div className="mt-4 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <BellAlertIcon className="size-4 text-danger" />
                <span>브라우저 알림 권한이 꺼져 있어요</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                사이트 권한에서 알림을 허용해야 기기 푸시를 다시 받을 수
                있습니다.
              </p>
            </div>
          ) : pushStatus === "private_mode" ? (
            <div className="mt-4 rounded-2xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ShieldExclamationIcon className="size-4 text-muted" />
                <span>프라이빗 모드에서는 푸시를 사용할 수 없어요</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                일반 브라우저 창에서 접속하면 기기 알림을 다시 설정할 수
                있습니다.
              </p>
            </div>
          ) : pushStatus === "unsupported" ? (
            <div className="mt-4 rounded-2xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ExclamationTriangleIcon className="size-4 text-muted" />
                <span>이 브라우저는 푸시 알림을 지원하지 않아요</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                최신 브라우저나 설치된 앱에서 접속하면 푸시 알림을 받을 수
                있습니다.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              전체 푸시를 끄면 기기 알림은 오지 않습니다.
            </p>
          )}
        </div>
      </section>

      {/* 3. 내 동네 설정 */}
      <section>
        <h2 className="text-sm font-bold text-primary mb-3">내 동네 설정</h2>
        <MyLocationButton
          currentRegion={user.region2}
          fullLocation={fullLocation || user.locationName}
        />
      </section>

      {/* 4. 초기 프로필 렌더 보호를 위한 하단 섹션 지연 렌더링 */}
      <MyProfileDeferredSections
        myStreams={myStreams}
        previewReviews={previewReviews}
        returnTo={returnTo}
        user={user}
        userBadges={userBadges}
        onOpenBadge={() => openModal("badge")}
        onOpenReview={() => openModal("review")}
        onOpenWithdraw={() => openModal("withdraw")}
      />

      {/* 5. Zustand 기반 모달의 실제 열림 시점 한정 렌더링 */}
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
          initialBlockedUsers={blockedUsers ?? []}
          loading={blockedUsersLoading}
          onUsersChange={setBlockedUsers}
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
