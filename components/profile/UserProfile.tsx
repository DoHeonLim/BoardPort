/**
 * File Name : components/profile/UserProfile
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
 */
"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { useInfiniteScroll } from "@/hooks/common/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/common/usePageVisibility";
import { useProductPagination } from "@/hooks/product/useProductPagination";

import ProfileHeader from "./ProfileHeader";
import UserBadges from "./UserBadges";
import ProductCard from "../product/productCard";
import StreamCard from "../stream/StreamCard";
import {
  ListBulletIcon,
  Squares2X2Icon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

import type { Paginated, ProductType, ViewMode } from "@/types/product";
import type {
  Badge,
  ProfileAverageRating,
  ProfileReview,
  UserProfile as UserProfileType,
} from "@/types/profile";
import type { BroadcastSummary } from "@/types/stream";

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

  // 팔로우 상태(클라) — 헤더 토글 후 rail 잠금/CTA가 즉시 반영되도록
  const [isFollowing, setIsFollowing] = useState<boolean>(!!user.isFollowing);

  // 뷰/탭/모달
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<ProductStatus>("selling");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // 탭별 페이지네이션 훅 (profile 모드)
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

  // 무한스크롤
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  useInfiniteScroll({
    triggerRef,
    hasMore: current.hasMore,
    isLoading: current.isLoading,
    onLoadMore: current.loadMore,
    enabled: isVisible,
    rootMargin: "1400px 0px 0px 0px",
    threshold: 0.01,
  });

  // StreamCard 잠금 CTA → 헤더 팔로우 버튼 클릭 유도
  // (ProfileHeader에 followButtonId를 심어두는 방식)
  const followButtonId = "user-profile-follow-btn";

  const onRequireLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent(next)}`);
  }, [router, next]);

  const requestFollowFromRail = useCallback(() => {
    // 비로그인 → 로그인으로
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
          showFollowButton
          onRequireLogin={onRequireLogin}
          onFollowingChange={setIsFollowing}
          followButtonId={followButtonId}
        />
      </div>

      {/* 2. Channel Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">방송국</h2>
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
          <div className="flex gap-3 items-stretch overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
            {myStreams.map((s) => {
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
                    category={
                      s.category
                        ? {
                            id: s.category.id,
                            kor_name: s.category.kor_name,
                            icon: s.category.icon ?? undefined,
                          }
                        : undefined
                    }
                    tags={s.tags}
                    followersOnlyLocked={followersOnlyLocked}
                    requiresPassword={requiresPassword}
                    visibility={s.visibility}
                    isPrivateType={s.visibility === "PRIVATE"}
                    onRequestFollow={
                      followersOnlyLocked ? requestFollowFromRail : undefined
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

      {/* 3. Reviews & Badges */}
      <div className="grid grid-cols-1 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-primary">받은 거래 후기</h2>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs text-muted hover:text-brand"
            >
              전체 보기
            </button>
          </div>
          {/* Preview logic can be added here if needed */}
        </section>

        <section>
          <h2 className="text-sm font-bold text-primary mb-2">획득한 뱃지</h2>
          {/* [Change] 모달 버튼 제거하고 바로 리스트 표시, max 갯수 늘림 */}
          <UserBadges badges={userBadges} max={20} />
        </section>
      </div>

      {/* 4. Sales Products */}
      <section>
        <h2 className="text-sm font-bold text-primary mb-3">판매 목록</h2>
        <div className="panel p-4 bg-surface">
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

      {/* Review Modal */}
      {isReviewModalOpen && (
        <ProfileReviewsModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          reviews={initialReviews}
          userId={user.id}
        />
      )}
    </div>
  );
}
