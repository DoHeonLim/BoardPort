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
 * 2026.02.26  임도헌   Modified   모든 버튼에 hover시 dark:hover:text-brand-light 추가
 */

"use client";

import { useMemo, useRef, useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { toggleBlockAction } from "@/features/user/actions/block";
import ProfileHeader from "@/features/user/components/profile/ProfileHeader";
import UserBadges from "@/features/user/components/profile/UserBadges";
import ProductCard from "@/features/product/components/productCard";
import StreamCard from "@/features/stream/components/StreamCard";
import {
  ListBulletIcon,
  Squares2X2Icon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type {
  Paginated,
  ProductType,
  ViewMode,
} from "@/features/product/types";
import type {
  Badge,
  ProfileAverageRating,
  ProfileReview,
  UserProfile as UserProfileType,
} from "@/features/user/types";
import type { BroadcastSummary } from "@/features/stream/types";

// 리뷰 모달 동적 로딩
const ProfileReviewsModal = dynamic(() => import("./ProfileReviewsModal"), {
  ssr: false,
});

type ProductStatus = "selling" | "sold";

interface Props {
  user: UserProfileType & { isFollowing?: boolean };
  initialReviews: ProfileReview[];
  initialSellingProducts: Paginated<ProductType>;
  initialSoldProducts: Paginated<ProductType>;
  averageRating: ProfileAverageRating | null;
  userBadges: Badge[];
  myStreams?: BroadcastSummary[];
  viewerId?: number;
}

/**
 * 타인 프로필 페이지 메인 UI
 *
 * [주요 섹션]
 * 1. ProfileHeader: 기본 정보 및 팔로우 액션
 * 2. 방송국 (Rail): 해당 유저의 최근 방송 목록 (팔로우 상태에 따라 잠금 UI 연동)
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
  initialReviews,
  initialSellingProducts,
  initialSoldProducts,
  averageRating,
  userBadges,
  myStreams,
  viewerId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const next = useMemo(() => pathname + (qs ? `?${qs}` : ""), [pathname, qs]);

  // 1. 팔로우 상태 관리 (Local State)
  // - 헤더에서 팔로우 버튼을 누르면 이 상태가 변경
  // - 이 상태는 하단의 '방송국' 섹션 내 '팔로워 전용 방송' 카드의 잠금 해제 여부에 즉시 영향
  const [isFollowing, setIsFollowing] = useState<boolean>(!!user.isFollowing);

  // 2. 뷰 및 탭 상태
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<ProductStatus>("selling");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // 차단 해제 Transition
  const [isUnblocking, startUnblock] = useTransition();

  // 3. 판매 목록 페이지네이션 설정 (각 탭별 독립 훅)
  const selling = useProductPagination<ProductType>({
    mode: "profile",
    scope: { type: "SELLING", userId: user.id },
    initialProducts: initialSellingProducts.products,
    initialCursor: initialSellingProducts.nextCursor,
  });
  const sold = useProductPagination<ProductType>({
    mode: "profile",
    scope: { type: "SOLD", userId: user.id },
    initialProducts: initialSoldProducts.products,
    initialCursor: initialSoldProducts.nextCursor,
  });

  const current = activeTab === "selling" ? selling : sold;
  const currentProducts = current.products as ProductType[];

  // 4. 무한 스크롤 설정
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isLoading,
    onLoadMore: current.loadMore,
    enabled: isVisible && !user.isBlocked,
    rootMargin: "1400px 0px 0px 0px",
    threshold: 0.01,
  });

  const onRequireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent(next)}`);
  }, [router, next]);

  /**
   * [Interaction] 방송 레일에서 팔로우 유도 시
   * - 비로그인 시 로그인 페이지로 안내
   * - 로그인 시 헤더에 있는 팔로우 버튼을 자동으로 찾아 스크롤 및 클릭을 유도함
   */
  const followButtonId = "user-profile-follow-btn";
  const requestFollowFromRail = useCallback(() => {
    // 비로그인 -> 로그인으로
    if (!viewerId) {
      onRequireLogin();
      return;
    }
    // 이미 팔로잉이면 할 일 없음
    if (isFollowing) return;

    // 헤더 팔로우 버튼을 찾아 클릭(UX 일관)
    const btn = document.getElementById(
      followButtonId
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!btn.disabled) btn.click();
      else btn.focus(); // pending이면 포커스만
      return;
    }

    // fallback: 못 찾으면 그냥 상단으로 유도(최소 안전)
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
        router.refresh(); // 페이지 새로고침하여 정상 UI로 복귀
      } else {
        toast.error(res.error ?? "차단 해제 실패");
      }
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Header (항상 표시: 차단 여부와 무관하게 기본 정보는 노출) */}
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
          showFollowButton={!user.isBlocked} // 차단 상태면 팔로우 버튼 숨김
          onRequireLogin={onRequireLogin}
          onFollowingChange={setIsFollowing}
          followButtonId={followButtonId}
          isBlocked={user.isBlocked}
        />
      </div>

      {/* 2. 조건부 렌더링 */}
      {user.isBlocked ? (
        // [차단됨] 안내 메시지 및 해제 버튼
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in bg-surface-dim/50 rounded-3xl border-2 border-dashed border-border mx-auto max-w-sm w-full mt-4">
          <div className="p-4 bg-surface rounded-full shadow-sm mb-4">
            <span className="text-4xl">🚫</span>
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
              "bg-neutral-600 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isUnblocking ? "해제 중..." : "차단 해제하기"}
          </button>
        </div>
      ) : (
        // [정상] 전체 콘텐츠 노출
        <>
          {/* 3. 방송국 (최근 방송 Rail) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-primary">방송국</h2>
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
              <div className="flex gap-3 items-stretch overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                {myStreams.map((s) => {
                  // 팔로워 전용 잠금 로직 (로컬 state 연동)
                  const followersOnlyLocked =
                    s.visibility === "FOLLOWERS" && !isFollowing;
                  const requiresPassword = !!s.requiresPassword;

                  return (
                    <div key={s.id} className="w-[200px] shrink-0 snap-start">
                      <StreamCard
                        id={s.id}
                        vodIdForRecording={s.latestVodId ?? undefined}
                        title={s.title}
                        thumbnail={s.thumbnail}
                        isLive={s.status === "CONNECTED"}
                        streamer={{
                          username: s.user.username,
                          avatar: s.user.avatar ?? undefined,
                        }}
                        startedAt={s.started_at ?? undefined}
                        category={s.category}
                        tags={s.tags}
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
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. 후기 및 뱃지 섹션 */}
          <div className="grid grid-cols-1 gap-6">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-primary">
                  받은 거래 후기
                </h2>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="text-xs text-muted hover:text-brand dark:hover:text-brand-light"
                >
                  전체 보기
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-primary mb-2">
                획득한 뱃지
              </h2>
              <UserBadges badges={userBadges} max={20} />
            </section>
          </div>

          {/* 5. 판매 목록 (Tabs + List) */}
          <section>
            <h2 className="text-sm font-bold text-primary mb-3">판매 목록</h2>
            <div className="panel p-4 bg-surface">
              {/* 탭 전환 버튼 */}
              <div className="flex p-1 bg-surface-dim rounded-lg border border-border mb-4">
                {(["selling", "sold"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                      activeTab === tab
                        ? "bg-surface text-brand shadow-sm"
                        : "text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {tab === "selling" ? "판매 중" : "판매 완료"}
                  </button>
                ))}
              </div>

              {/* 뷰 모드 토글 */}
              <div className="flex justify-end mb-3">
                <div className="flex p-1 bg-surface-dim rounded-lg border border-border">
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md",
                      viewMode === "list"
                        ? "bg-surface text-brand shadow-sm"
                        : "text-muted"
                    )}
                  >
                    <ListBulletIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md",
                      viewMode === "grid"
                        ? "bg-surface text-brand shadow-sm"
                        : "text-muted"
                    )}
                  >
                    <Squares2X2Icon className="size-4" />
                  </button>
                </div>
              </div>

              {/* 목록 렌더링 */}
              {currentProducts.length === 0 ? (
                <div className="py-12 text-center text-muted text-sm border border-dashed border-border rounded-xl bg-surface-dim/30">
                  {activeTab === "selling"
                    ? "판매 중인 제품이 없습니다."
                    : "판매 완료한 제품이 없습니다."}
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    className={cn(
                      "grid gap-4",
                      viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
                    )}
                  >
                    {currentProducts.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        viewMode={viewMode}
                        isPriority={i < 4}
                      />
                    ))}
                  </div>
                  {/* 트리거 & 로더 */}
                  <div className="flex justify-center pt-2 min-h-[30px]">
                    {current.hasMore && (
                      <div ref={triggerRef} className="h-1 w-full" />
                    )}
                    {current.isLoading && (
                      <div className="size-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 6. 리뷰 전체보기 모달 */}
          {isReviewModalOpen && (
            <ProfileReviewsModal
              isOpen={isReviewModalOpen}
              onClose={() => setIsReviewModalOpen(false)}
              reviews={initialReviews}
              userId={user.id}
            />
          )}
        </>
      )}
    </div>
  );
}
