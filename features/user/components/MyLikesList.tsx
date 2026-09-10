/**
 * File Name : features/user/components/MyLikesList.tsx
 * Description : 상품·게시글·다시보기 통합 관심 목록
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 상품 목록 UI 및 무한 스크롤 연동 구현
 * 2026.03.06  임도헌   Modified  리스트 레이아웃/하단 로딩 배지 정렬
 * 2026.03.26  임도헌   Modified  빈 상태를 최근 프로필 상태 화면 패턴으로 통일하고 liked_at 타입을 반영
 * 2026.03.26  임도헌   Modified  카드 우상단 빠른 찜 해제 버튼을 활성화해 목록 관리 효율 개선
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 찜 목록 빈 상태 CTA 타이포를 정리
 * 2026.04.17  임도헌   Modified  찜 목록의 무한 스크롤/빠른 해제/상단 카드 우선 로드 책임 설명 보강
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 첫 카드만 priority 적용하고 빈 상태 heading/order 정리
 * 2026.04.24  임도헌   Modified  찜 목록 제품 상세 진입 시 현재 목록 경로를 returnTo로 전달
 * 2026.06.17  임도헌   Modified  빠른 찜 해제 버튼의 좋아요 캐시 분리를 위해 viewerId 전달
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.09.11  임도헌   Modified  게시글·다시보기 탭과 최근 찜한 순 목록 확장
 * 2026.09.11  임도헌   Moved     제품 전용 컴포넌트 경로에서 사용자 찜 보관함 경로로 이동
 * 2026.09.11  임도헌   Modified  URL 기반 리스트·그리드 전환과 다시보기 기본 그리드 적용
 * 2026.09.11  임도헌   Modified  다시보기 그리드 고정과 모든 콘텐츠의 찜한 시각 표시
 */
"use client";

import { useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DocumentTextIcon,
  ListBulletIcon,
  PlayCircleIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useProductPagination } from "@/features/product/hooks/useProductPagination";
import { useMyLikesPagination } from "@/features/user/hooks/useMyLikesPagination";
import ProductCard from "@/features/product/components/productCard";
import PostCard from "@/features/post/components/postCard";
import StreamCard from "@/features/stream/components/StreamCard";
import MyLikeRemoveButton from "@/features/user/components/MyLikeRemoveButton";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";
import type { LikedProductListItem } from "@/features/product/types";
import type { VodForGrid } from "@/features/stream/types";
import type {
  LikedPostListItem,
  MyLikesCounts,
  MyLikesTab,
} from "@/features/user/types";

const TABS: Array<{ type: MyLikesTab; label: string }> = [
  { type: "products", label: "상품" },
  { type: "posts", label: "게시글" },
  { type: "recordings", label: "다시보기" },
];

type CountCallbacks = { onRemoved: () => void; onRestore: () => void };
type ViewMode = "list" | "grid";

/** 탭별 찜 목록과 빠른 해제 후 개수를 함께 관리 */
export default function MyLikesList({
  userId,
  activeTab,
  initialCounts,
  requestedView,
}: {
  userId: number;
  activeTab: MyLikesTab;
  initialCounts: MyLikesCounts;
  requestedView?: ViewMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState(initialCounts);
  const viewMode: ViewMode =
    activeTab === "recordings" ? "grid" : (requestedView ?? "list");

  const buildLikesHref = (type: MyLikesTab, view?: ViewMode) => {
    const params = new URLSearchParams();
    if (type !== "products") params.set("type", type);
    if (view) params.set("view", view);
    const query = params.toString();
    return query ? `/profile/my-likes?${query}` : "/profile/my-likes";
  };

  const changeView = (nextView: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    router.replace(`/profile/my-likes?${params.toString()}`, { scroll: false });
  };
  const callbacks: CountCallbacks = {
    onRemoved: () =>
      setCounts((value) => ({
        ...value,
        [activeTab]: Math.max(0, value[activeTab] - 1),
      })),
    onRestore: () =>
      setCounts((value) => ({
        ...value,
        [activeTab]: value[activeTab] + 1,
      })),
  };

  return (
    <div className="flex flex-col px-page-x py-6">
      <nav
        aria-label="관심 콘텐츠 유형"
        className="mb-4 flex rounded-xl border border-border bg-surface p-1 shadow-sm"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.type;
          return (
            <Link
              key={tab.type}
              href={buildLikesHref(tab.type, requestedView)}
              aria-current={selected ? "page" : undefined}
              scroll={false}
              className={cn(
                "focus-ring-soft group flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-surface-dim text-primary shadow-sm dark:bg-background"
                  : "text-muted hover:bg-background/70 hover:text-primary"
              )}
            >
              {tab.label}
              <span className="ml-1 text-xs opacity-80">
                ({counts[tab.type]})
              </span>
            </Link>
          );
        })}
      </nav>

      {activeTab !== "recordings" && (
        <div className="mb-4 flex justify-end">
          <div
            className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm"
            role="group"
            aria-label="관심 목록 보기 방식"
          >
            <button
              type="button"
              onClick={() => changeView("list")}
              aria-label="리스트 보기"
              aria-pressed={viewMode === "list"}
              className={cn(
                "focus-ring-soft flex size-11 items-center justify-center rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-surface-dim text-brand shadow-sm dark:bg-background dark:text-brand-light"
                  : "text-muted hover:bg-background/70 hover:text-primary"
              )}
            >
              <ListBulletIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => changeView("grid")}
              aria-label="그리드 보기"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "focus-ring-soft flex size-11 items-center justify-center rounded-lg transition-colors",
                viewMode === "grid"
                  ? "bg-surface-dim text-brand shadow-sm dark:bg-background dark:text-brand-light"
                  : "text-muted hover:bg-background/70 hover:text-primary"
              )}
            >
              <Squares2X2Icon className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "products" ? (
        <LikedProducts userId={userId} viewMode={viewMode} {...callbacks} />
      ) : activeTab === "posts" ? (
        <LikedPosts userId={userId} viewMode={viewMode} {...callbacks} />
      ) : (
        <LikedRecordings userId={userId} {...callbacks} />
      )}
    </div>
  );
}

function useLikesInfiniteScroll({
  hasMore,
  isFetchingNextPage,
  loadMore,
}: {
  hasMore: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => Promise<unknown>;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();
  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 600px 0px",
    threshold: 0.1,
  });
  return triggerRef;
}

function EmptyLikes({ type }: { type: MyLikesTab }) {
  const content = {
    products: [
      "찜한 상품이 없습니다",
      "관심 있는 상품을 저장해두고 거래 상태를 편하게 확인해보세요.",
      "/products",
      "상품 둘러보기",
      ShoppingBagIcon,
    ],
    posts: [
      "찜한 게시글이 없습니다",
      "다시 보고 싶은 항해일지를 좋아요로 모아보세요.",
      "/posts",
      "게시글 둘러보기",
      DocumentTextIcon,
    ],
    recordings: [
      "찜한 다시보기가 없습니다",
      "나중에 보고 싶은 방송을 좋아요로 저장해보세요.",
      "/streams?mode=recordings",
      "다시보기 둘러보기",
      PlayCircleIcon,
    ],
  }[type] as [string, string, string, string, typeof ShoppingBagIcon];
  const Icon = content[4];
  return (
    <div className="state-screen">
      <div className="state-card">
        <div className="state-icon-wrap">
          <Icon className="size-10 text-muted/50" />
        </div>
        <p className="state-title">{content[0]}</p>
        <p className="state-description">{content[1]}</p>
        <div className="state-actions justify-center">
          <Link
            href={content[2]}
            className="btn-primary inline-flex min-h-[44px] w-full items-center justify-center px-6 text-sm font-medium shadow-sm sm:w-auto"
          >
            {content[3]}
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingTail({
  triggerRef,
  hasMore,
  loading,
}: {
  triggerRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loading: boolean;
}) {
  return (
    <div className="col-span-full min-h-[40px] py-6">
      {hasMore && (
        <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
      )}
      {loading && (
        <div className="list-loading-pill">
          <span className="size-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          <span>더 불러오는 중...</span>
        </div>
      )}
    </div>
  );
}

function LikedProducts({
  userId,
  viewMode,
  onRemoved,
  onRestore,
}: { userId: number; viewMode: ViewMode } & CountCallbacks) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = sanitizeCallbackUrl(
    query ? `${pathname}?${query}` : pathname
  );
  const liked = useProductPagination<LikedProductListItem>({
    mode: "profile",
    scope: { type: "LIKED", userId },
  });
  const triggerRef = useLikesInfiniteScroll(liked);
  if (!liked.products.length) return <EmptyLikes type="products" />;
  return (
    <div
      className={cn(
        "grid gap-4",
        viewMode === "grid" ? "grid-cols-2 sm:gap-5" : "grid-cols-1"
      )}
    >
      {liked.products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode={viewMode}
          isPriority={index === 0}
          showQuickUnlike
          returnTo={returnTo}
          viewerId={userId}
          onOptimisticChange={(isLiked) =>
            isLiked ? onRestore() : onRemoved()
          }
        />
      ))}
      <LoadingTail
        triggerRef={triggerRef}
        hasMore={liked.hasMore}
        loading={liked.isFetchingNextPage}
      />
    </div>
  );
}

function LikedPosts({
  userId,
  viewMode,
  onRemoved,
  onRestore,
}: { userId: number; viewMode: ViewMode } & CountCallbacks) {
  const liked = useMyLikesPagination("posts", userId);
  const triggerRef = useLikesInfiniteScroll(liked);
  const posts = liked.items as LikedPostListItem[];
  if (!posts.length) return <EmptyLikes type="posts" />;
  return (
    <div
      className={cn(
        "grid gap-4",
        viewMode === "grid" ? "grid-cols-2 sm:gap-5" : "grid-cols-1"
      )}
    >
      {posts.map((post, index) => (
        <div key={post.id} className="relative">
          <PostCard
            post={post}
            viewMode={viewMode}
            isPriority={index === 0}
            returnTo={buildReturnTo("posts", viewMode)}
            reserveTopRightAction
            activityAt={post.liked_at}
            activityLabel="찜"
          />
          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
            <MyLikeRemoveButton
              type="posts"
              id={post.id}
              userId={userId}
              onRemoved={onRemoved}
              onRestore={onRestore}
            />
          </div>
        </div>
      ))}
      <LoadingTail
        triggerRef={triggerRef}
        hasMore={liked.hasMore}
        loading={liked.isFetchingNextPage}
      />
    </div>
  );
}

function LikedRecordings({
  userId,
  onRemoved,
  onRestore,
}: { userId: number } & CountCallbacks) {
  const liked = useMyLikesPagination("recordings", userId);
  const triggerRef = useLikesInfiniteScroll(liked);
  const recordings = liked.items as VodForGrid[];
  if (!recordings.length) return <EmptyLikes type="recordings" />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
      {recordings.map((recording, index) => (
        <div key={recording.vodId} className="relative">
          <StreamCard
            id={recording.broadcastId}
            vodIdForRecording={recording.vodId}
            title={recording.title}
            thumbnail={recording.thumbnail}
            thumbnailAnimated={recording.thumbnailAnimated}
            isLive={false}
            showReplayBadge
            streamer={recording.user}
            startedAt={recording.readyAt}
            activityAt={recording.likedAt}
            activityLabel="찜"
            category={recording.category}
            tags={recording.tags}
            boardGames={recording.board_games}
            boardGameBadgePlacement="thumbnail"
            duration={recording.duration}
            viewCount={recording.viewCount}
            likeCount={recording.likeCount}
            commentCount={recording.commentCount}
            isLiked
            href={recording.href}
            requiresPassword={recording.requiresPassword}
            isFollowersOnly={recording.visibility === "FOLLOWERS"}
            followersOnlyLocked={recording.followersOnlyLocked}
            isPrivateType={recording.visibility === "PRIVATE"}
            thumbnailPriority={index === 0}
            reserveTopRightAction
            layout="grid"
          />
          <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3">
            <MyLikeRemoveButton
              type="recordings"
              id={recording.vodId}
              userId={userId}
              onRemoved={onRemoved}
              onRestore={onRestore}
            />
          </div>
        </div>
      ))}
      <LoadingTail
        triggerRef={triggerRef}
        hasMore={liked.hasMore}
        loading={liked.isFetchingNextPage}
      />
    </div>
  );
}

function buildReturnTo(type: Exclude<MyLikesTab, "products">, view: ViewMode) {
  return `/profile/my-likes?type=${type}&view=${view}`;
}
