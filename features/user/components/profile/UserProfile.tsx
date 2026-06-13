/**
 * File Name : features/user/components/profile/UserProfile.tsx
 * Description : 다른 유저 프로필 컴포넌트(채널과 동일한 팔로우 UX로 통일)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.07  임도헌   Created
 * 2024.12.07  임도헌   Modified   다른 유저 프로필 페이지 추가
 * 2024.12.07  임도헌   Modified   무한 스크롤 추가
 * 2024.12.07  임도헌   Modified   평균 평점 및 갯수 로직 수정
 * 2024.12.12  임도헌   Modified   photo속성에서 images로 변경
 * 2024.12.22  임도헌   Modified   제품 모델 변경에 따른 제품 타입 변경
 * 2024.12.29  임도헌   Modified   다른 유저 프로필 컴포넌트 스타일 수정
 * 2025.04.18  임도헌   Modified   유저 뱃지 기능 추가
 * 2025.05.06  임도헌   Modified   그리드/리스트 뷰 모드 추가
 * 2025.05.22  임도헌   Modified   팔로우 기능 추가
 * 2025.10.08  임도헌   Modified   useFollowToggle 도입, FollowListModal 지연 로드/무한 스크롤/Set 동기화(채널과 동일)
 * 2025.10.12  임도헌   Modified   viewerFollowingIds/Set 제거, useFollowPagination 적용, 모달 간 동기화 상향 콜백으로 통일
 * 2025.10.14  임도헌   Modified   FollowSection 도입: 팔로우/모달/페이지네이션 로직 제거
 * 2025.10.17  임도헌   Modified   useProductPagination(profile) + useInfiniteScroll/usePageVisibility 적용
 * 2025.10.22  임도헌   Modified   viewerInfo prop 제거(개인화 최소화 유지, 낙관 표시용은 클라 훅에서 해결)
 * 2025.11.12  임도헌   Modified   MyProfile UI와 통일(섹션 헤더/btn-ghost/타일)
 * 2025.11.26  임도헌   Modified   방송국 섹션에 StreamCard 추가
 * 2025.12.20  임도헌   Modified   헤더 팔로우 토글 상태(isFollowing) 로컬 동기화로 rail 잠금 즉시 반영
 *                                 FOLLOWERS 잠금 CTA: 헤더 팔로우 버튼(id) 클릭 유도로 UX 통일
 *                                 비로그인 시 /login?callbackUrl=... 리다이렉트 통일(onRequireLogin 공용)
 *                                 PRIVATE 잠금은 팔로우로 해제되지 않으므로 서버 플래그(requiresPassword) 유지
 * 2026.01.15  임도헌   Modified   시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved      components/profile -> features/user/components/profile
 * 2026.02.04  임도헌   Modified   차단(isBlocked) 상태에 따른 조건부 렌더링 추가
 * 2026.02.05  임도헌   Modified   차단된 유저 화면에 '차단 해제' 버튼 추가 (UX 개선)
 * 2026.02.26  임도헌   Modified   주요 링크/버튼 hover에 다크모드 보조 색상을 적용
 * 2026.03.03  임도헌   Modified   initialProps 제거 및 탭 내부 컴포넌트(SalesTabContent) 분리를 통한 Suspense 최적화
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.06  임도헌   Modified   프로필 판매 탭 상태를 URL Query로 동기화하고 토글/탭 active 대비를 다크모드 기준으로 보강
 * 2026.03.09  임도헌   Modified   최근 방송 카드에 실제 VOD가 있는 종료 방송만 다시보기 배지로 표시
 * 2026.03.12  임도헌   Modified   타인 프로필의 빈 상태와 토글 카드 외곽선을 border-border-subtle 톤으로 통일
 * 2026.03.12  임도헌   Modified   차단 해제 버튼을 시맨틱 토큰 기반 CTA 톤으로 정리
 * 2026.03.13  임도헌   Modified   방송국 전체 보기 링크에 현재 프로필 경로를 returnTo로 함께 전달
 * 2026.03.14  임도헌   Modified   타인 프로필에서도 뱃지 전체 보기 모달로 진입할 수 있도록 연결
 * 2026.03.15  임도헌   Modified   차단 상태 빈 화면의 시스템 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.17  임도헌   Modified   방송국 rail 카드 래퍼 고정폭을 제거해 축소된 StreamCard 폭을 그대로 사용
 * 2026.03.18  임도헌   Modified   타인 프로필 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.03.21  임도헌   Modified   타인 프로필 방송국 카드에서는 소유자 정보가 자명하므로 StreamCard 스트리머 행 숨김
 * 2026.04.08  임도헌   Modified   방송국 rail 좌우 정렬선을 다른 프로필 섹션과 같은 시작선으로 맞춤
 * 2026.04.17  임도헌   Modified   방송국 링크/후기·뱃지/판매 목록 섹션 주석을 현재 구조 기준으로 최신화
 * 2026.04.19  임도헌   Modified   타인 프로필 판매 목록 탭 active 톤을 판매내역과 같은 기준으로 정리
 * 2026.04.24  임도헌   Modified   타인 프로필 제품 카드에 현재 프로필 returnTo를 전달해 상세 복귀 문맥 유지
 * 2026.04.26  임도헌   Modified   차단 해제 CTA의 다크모드 색조를 primary CTA 톤과 맞춰 정리
 * 2026.05.12  임도헌   Modified   타인 프로필 방송국 StreamCard에 연결 보드게임 메타 전달
 * 2026.05.16  임도헌   Modified   판매 탭 제품 scope 매핑을 명시해 any 캐스팅 제거
 */

"use client";

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useTransition,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { toggleBlockAction } from "@/features/user/actions/block";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import ProfileHeader from "@/features/user/components/profile/ProfileHeader";
import UserBadges from "@/features/user/components/profile/UserBadges";
import ProductCard from "@/features/product/components/productCard";
import StreamCard from "@/features/stream/components/StreamCard";
import Skeleton from "@/components/ui/Skeleton";
import ProfileReviewPreviewList from "@/features/user/components/profile/ProfileReviewPreviewList";
import {
  NoSymbolIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type {
  ProductType,
  UserProductsScope,
  ViewMode,
} from "@/features/product/types";
import type {
  Badge,
  ProfileAverageRating,
  UserProfile as UserProfileType,
} from "@/features/user/types";
import type { BroadcastSummary } from "@/features/stream/types";

// 리뷰 모달 동적 로딩
const ProfileReviewsModal = dynamic(() => import("./ProfileReviewsModal"), {
  ssr: false,
});
const ProfileBadgesModal = dynamic(() => import("./ProfileBadgesModal"), {
  ssr: false,
});

type ProductStatus = "selling" | "sold";
type SalesScopeType = Extract<UserProductsScope["type"], "SELLING" | "SOLD">;

const PRODUCT_STATUS_SCOPE_TYPE: Record<ProductStatus, SalesScopeType> = {
  selling: "SELLING",
  sold: "SOLD",
};

interface Props {
  user: UserProfileType & { isFollowing?: boolean };
  averageRating: ProfileAverageRating | null;
  badges: Badge[];
  userBadges: Badge[];
  previewReviews: import("@/features/user/types").ProfileReview[];
  myStreams?: BroadcastSummary[];
  viewerId?: number;
}

/**
 * 타인 프로필 페이지 메인 UI
 *
 * [주요 섹션]
 * 1. ProfileHeader: 기본 정보 및 팔로우 액션
 * 2. 방송국 (Rail): 해당 유저의 최근 방송 목록 (팔로우 상태 잠금 UI + channel returnTo 유지)
 * 3. 받은 거래 후기 및 뱃지
 * 4. 판매 목록: 판매 중 / 판매 완료 탭과 무한 스크롤 리스트
 *
 * [차단]
 * 1. 차단된 유저일 경우: 프로필 헤더와 차단 안내 UI(해제 버튼 포함)만 표시
 * 2. 정상 유저일 경우: 방송국, 리뷰/뱃지, 판매 목록(탭/무한스크롤) 등 전체 콘텐츠 표시
 * 3. 팔로우 상태 관리 및 방송국 레일 내 잠금 UI와 연동
 */
export default function UserProfile({
  user,
  averageRating,
  badges,
  userBadges,
  previewReviews,
  myStreams,
  viewerId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const next = useMemo(
    () => sanitizeCallbackUrl(pathname + (qs ? `?${qs}` : "")),
    [pathname, qs]
  );
  const activeTab = useMemo<ProductStatus>(() => {
    const tab = searchParams.get("tab");
    return tab === "sold" ? "sold" : "selling";
  }, [searchParams]);

  // 1. 팔로우 상태 관리 (Local State)
  const [isFollowing, setIsFollowing] = useState<boolean>(!!user.isFollowing);

  // 2. 뷰 및 탭 상태
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // 차단 해제 Transition
  const [isUnblocking, startUnblock] = useTransition();

  const onRequireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent(next)}`);
  }, [router, next]);

  /**
   * [Interaction] 방송 레일에서 팔로우 유도 시
   */
  const followButtonId = "user-profile-follow-btn";
  const requestFollowFromRail = useCallback(() => {
    if (!viewerId) {
      onRequireLogin();
      return;
    }
    if (isFollowing) return;

    const btn = document.getElementById(
      followButtonId
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!btn.disabled) btn.click();
      else btn.focus();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewerId, isFollowing, onRequireLogin]);

  /**
   * 차단 즉시 해제 핸들러
   */
  const handleUnblockDirectly = () => {
    startUnblock(async () => {
      const res = await toggleBlockAction(user.id, "unblock");
      if (res.success) {
        toast.success("차단을 해제했습니다.");
        router.refresh();
      } else {
        toast.error(res.error ?? "차단 해제 실패");
      }
    });
  };

  const handleTabChange = useCallback(
    (tab: ProductStatus) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      const query = params.toString();
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Header */}
      <div className="pt-2">
        <ProfileHeader
          ownerId={user.id}
          ownerUsername={user.username}
          createdAt={user.created_at}
          averageRating={averageRating}
          followerCount={user._count?.followers ?? 0}
          followingCount={user._count?.following ?? 0}
          viewerId={viewerId}
          initialIsFollowing={!!user.isFollowing}
          avatarUrl={user.avatar ?? null}
          showFollowButton={!user.isBlocked}
          onRequireLogin={onRequireLogin}
          onFollowingChange={setIsFollowing}
          followButtonId={followButtonId}
          isBlocked={user.isBlocked}
        />
      </div>

      {/* 2. 조건부 렌더링 (차단 여부) */}
      {user.isBlocked ? (
        <div className="mx-auto mt-4 flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border-subtle bg-surface-dim/50 px-6 py-20 text-center">
          <div className="p-4 bg-surface rounded-full shadow-sm mb-4">
            <NoSymbolIcon className="size-10 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-primary">
            차단한 사용자입니다
          </h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            이 사용자의 판매 물품, 게시글, 방송 정보를
            <br />볼 수 없습니다.
          </p>

          <button
            onClick={handleUnblockDirectly}
            disabled={isUnblocking}
            className={cn(
              "mt-6 h-10 px-6 text-sm font-medium rounded-xl transition-colors",
              "bg-brand text-white shadow-sm hover:bg-brand-dark dark:bg-brand dark:hover:bg-brand-dark",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isUnblocking ? "해제 중..." : "차단 해제하기"}
          </button>
        </div>
      ) : (
        <>
          {/* 3. 방송국 레일: 현재 프로필 경로를 유지한 채 channel로 이동하고 자동 prefetch는 생략 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-primary">방송국</h2>
              <Link
                href={`/profile/${user.username}/channel?returnTo=${encodeURIComponent(next)}`}
                prefetch={false}
                aria-label="방송국 전체 보기"
                className="focus-ring-soft flex items-center rounded-md text-xs text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
              >
                방송국 전체 보기
                <ChevronRightIcon className="size-3 ml-0.5" />
              </Link>
            </div>

            {!myStreams || myStreams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle bg-surface-dim/30 py-6 text-center">
                <p className="text-xs text-muted">아직 방송 이력이 없습니다.</p>
              </div>
            ) : (
              <div className="flex gap-3 items-stretch overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
                {myStreams.map((s) => {
                  const followersOnlyLocked =
                    s.visibility === "FOLLOWERS" && !isFollowing;
                  const requiresPassword = !!s.requiresPassword;

                  return (
                    <div key={s.id} className="shrink-0 snap-start">
                      <StreamCard
                        id={s.id}
                        vodIdForRecording={s.latestVodId ?? undefined}
                        title={s.title}
                        thumbnail={s.thumbnail}
                        isLive={s.status === "CONNECTED"}
                        showReplayBadge={
                          s.status === "ENDED" && !!s.latestVodId
                        }
                        streamer={{
                          username: s.user.username,
                          avatar: s.user.avatar ?? undefined,
                        }}
                        startedAt={s.started_at ?? undefined}
                        category={s.category}
                        tags={s.tags}
                        boardGames={s.board_games}
                        followersOnlyLocked={followersOnlyLocked}
                        requiresPassword={requiresPassword}
                        visibility={s.visibility}
                        isPrivateType={s.visibility === "PRIVATE"}
                        onRequestFollow={
                          followersOnlyLocked
                            ? requestFollowFromRail
                            : undefined
                        }
                        layout="rail"
                        shortDescription
                        showStreamer={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. 사회적 신뢰 정보: 후기와 뱃지를 같은 밀도로 묶어 노출 */}
          <div className="grid grid-cols-1 gap-6">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-primary">
                  받은 거래 후기
                </h2>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  aria-label="받은 거래 후기 전체 보기"
                  className="focus-ring-soft rounded-md text-xs text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                >
                  전체 보기
                </button>
              </div>
              <ProfileReviewPreviewList reviews={previewReviews} />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary">획득한 뱃지</h2>
                <button
                  onClick={() => setIsBadgeModalOpen(true)}
                  aria-label="획득한 뱃지 전체 보기"
                  className="focus-ring-soft rounded-md text-xs text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
                >
                  전체 보기
                </button>
              </div>
              <UserBadges badges={userBadges} max={20} />
            </section>
          </div>

          {/* 5. 판매 목록: 탭과 뷰 토글은 즉시 반응하고 실제 목록은 Suspense 경계 아래에서 교체 */}
          <section>
            <h2 className="text-sm font-bold text-primary mb-3">판매 목록</h2>
            <div className="panel p-4 bg-surface">
              {/* 탭 전환 버튼 */}
              <div className="mb-4 flex rounded-xl border border-border bg-surface p-1 shadow-sm">
                {(["selling", "sold"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={cn(
                      "focus-ring-soft flex-1 min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      activeTab === tab
                        ? "bg-surface-dim text-primary shadow-sm dark:bg-background"
                        : "text-muted hover:bg-background/70 hover:text-primary"
                    )}
                  >
                    {tab === "selling" ? "판매 중" : "판매 완료"}
                  </button>
                ))}
              </div>

              {/* 뷰 모드 토글 */}
              <div className="flex justify-end mb-3">
                <div className="flex rounded-xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="리스트 보기"
                    className={cn(
                      "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
                      viewMode === "list"
                        ? "bg-background text-brand dark:text-brand-light shadow-sm ring-1 ring-border/70"
                        : "text-muted hover:bg-background/70 hover:text-primary"
                    )}
                  >
                    <ListBulletIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="그리드 보기"
                    className={cn(
                      "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
                      viewMode === "grid"
                        ? "bg-background text-brand dark:text-brand-light shadow-sm ring-1 ring-border/70"
                        : "text-muted hover:bg-background/70 hover:text-primary"
            )}
                  >
                    <Squares2X2Icon className="size-4" />
                  </button>
                </div>
              </div>

              {/* 목록 렌더링 (Suspense 적용) */}
              <Suspense
                fallback={
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  </div>
                }
              >
                <SalesTabContent
                  key={activeTab} // 탭 전환 시 컴포넌트를 새로 마운트
                  type={activeTab}
                  userId={user.id}
                  viewMode={viewMode}
                  returnTo={next}
                />
              </Suspense>
            </div>
          </section>

          {/* 6. 리뷰 전체보기 모달 */}
          {isReviewModalOpen && (
            <ProfileReviewsModal
              isOpen={isReviewModalOpen}
              onClose={() => setIsReviewModalOpen(false)}
              userId={user.id}
            />
          )}
          {isBadgeModalOpen && (
            <ProfileBadgesModal
              isOpen={isBadgeModalOpen}
              closeModal={() => setIsBadgeModalOpen(false)}
              badges={badges}
              userBadges={userBadges}
            />
          )}
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 내부 컴포넌트: 선택된 판매 탭 전용 데이터만 불러와 리스트 교체
// ----------------------------------------------------------------------
function SalesTabContent({
  type,
  userId,
  viewMode,
  returnTo,
}: {
  type: ProductStatus;
  userId: number;
  viewMode: ViewMode;
  returnTo: string;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // Suspense에 의해 data가 보장됨 (isLoading 분기 필요 없음)
  const current = useProductPagination<ProductType>({
    mode: "profile",
    scope: { type: PRODUCT_STATUS_SCOPE_TYPE[type], userId },
  });

  const products = current.products;

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isFetchingNextPage,
    onLoadMore: current.loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 1000px 0px",
    threshold: 0.01,
  });

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-dim/30 py-12 text-center text-sm text-muted">
        {type === "selling"
          ? "판매 중인 제품이 없습니다."
          : "판매 완료한 제품이 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
            isPriority={i < 4}
            returnTo={returnTo}
          />
        ))}
      </div>
      {/* 트리거 & 스크롤 하단 로더 */}
      <div className="flex justify-center pt-2 min-h-[30px]">
        {current.hasMore && <div ref={triggerRef} className="h-1 w-full" />}
        {current.isFetchingNextPage && (
          <div className="size-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
