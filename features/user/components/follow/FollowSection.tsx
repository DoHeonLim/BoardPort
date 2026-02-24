/**
 * File Name : features/user/components/follow/FollowSection.tsx
 * Description : 팔로워/팔로잉 표시 + (옵션) 팔로우 토글 + 모달 2종(공용)
 * Author : 임도헌
 *
 * Key Points
 * - FollowListModal은 "표시/분리" 전용:
 *   - 버튼 상태 SSOT: user.isFollowedByViewer (viewer -> rowUser)
 *   - 맞팔로잉 섹션 분리: user.isMutualWithOwner (owner <-> rowUser) owner 기준으로 통일
 * - FollowSection은 "연결/오케스트레이션" 전용:
 *   - openFollowers/openFollowing을 호출해 seed 로딩(온디맨드)
 *   - loaded/loading 상태를 모달에 그대로 전달
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.13  임도헌   Created   프로필/채널/내 프로필 공용 Follow 섹션
 * 2025.10.22  임도헌   Modified  viewerInfo prop 제거 → 컨트롤러 내부에서 useUserLite(viewerId) 사용
 * 2025.10.29  임도헌   Modified  a11y(aria-pressed/aria-busy/aria-label) 보강
 * 2025.11.10  임도헌   Modified  props 정리(variant 제거, size/align 도입)
 * 2025.12.20  임도헌   Modified  rail CTA 지원: followButtonId prop 추가 → 팔로우 버튼 id 주입
 * 2025.12.23  임도헌   Modified  FollowListModal error stage(first/more) + retry 연결
 * 2025.12.23  임도헌   Modified  상위 동기화(onFollowingChange) 초기 1회 스킵(ref) 추가
 * 2026.01.05  임도헌   Modified  맞팔로잉 분리 기준을 owner 기준(isMutualWithOwner)으로 일원화(모달/서버와 합의)
 * 2026.01.17  임도헌   Moved     components/follow -> features/user/components/follow
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FollowListModal from "@/features/user/components/follow/FollowListModal";
import { useFollowController } from "@/features/user/hooks/useFollowController";

export type FollowSectionProps = {
  /** 타겟 유저 id */
  ownerId: number;
  /** 타겟 유저 username(팔로워/팔로잉 API seed 호출 시 사용) */
  ownerUsername: string;
  /**
   * 서버에서 미리 내려준 초기 상태(없으면 0/false로 시작)
   * - isFollowing: viewer → owner 단건 팔로우 상태
   * - followerCount/followingCount: 헤더 카운트 초기값
   */
  initial?: {
    isFollowing?: boolean;
    followerCount?: number;
    followingCount?: number;
  };
  /** viewer 정보(로그인 유저). id만 있으면 됨 */
  viewer?: { id?: number | null };
  /** 기본 true, 단 viewer?.id === ownerId 면 내부에서 자동 false */
  showButton?: boolean;
  /** UI 크기 */
  size?: "regular" | "compact";
  /** 정렬 */
  align?: "start" | "center" | "end";
  className?: string;
  /** 로그인 필요시 호출(없으면 no-op; 페이지에서 라우팅 처리 권장) */
  onRequireLogin?: () => void;
  /** 외부에서 팔로잉 상태 변화를 듣고 싶을 때(초기 1회는 스킵) */
  onFollowingChange?: (isFollowing: boolean) => void;
  /** 외부 CTA(rail 등)에서 팔로우 버튼을 찾을 수 있도록 id 주입 */
  followButtonId?: string;
  // 차단 여부
  isBlocked?: boolean;
};

/**
 * 팔로우 섹션 컴포넌트
 *
 * [기능]
 * 1. 팔로워/팔로잉 수 표시 (클릭 시 모달 오픈)
 * 2. 팔로우/언팔로우 버튼 제공 (본인이 아닐 경우)
 * 3. `useFollowController`를 통해 전체 상태(카운트, 버튼, 모달 데이터)를 통합 관리
 * 4. 상위 컴포넌트(`ProfileHeader`, `UserChannelHeader`)에서 사용됨
 */
export default function FollowSection({
  ownerId,
  ownerUsername,
  initial,
  viewer,
  showButton = true,
  size = "compact",
  align = "start",
  className,
  onRequireLogin,
  onFollowingChange,
  followButtonId,
  isBlocked,
}: FollowSectionProps) {
  const viewerId = viewer?.id ?? undefined;

  /**
   * 내 프로필/내 채널에서는 팔로우 버튼이 의미가 없으므로 자동 숨김.
   * (목록 모달은 "내가 누구를 팔로우/팔로워"는 의미가 있으니 그대로 열 수 있음)
   */
  const isSelf = viewerId != null && viewerId === ownerId;
  const resolvedShowButton = showButton && !isSelf;

  // 초기값(서버에서 내려준 헤더/버튼 스냅샷)
  const initIsFollowing = !!initial?.isFollowing;
  const initFollowerCount = initial?.followerCount ?? 0;
  const initFollowingCount = initial?.followingCount ?? 0;

  /**
   * 컨트롤러 단일 책임:
   * - 헤더 버튼(팔로우 토글)
   * - 목록 seed/loadMore/retry
   * - row 토글 + pendingById
   *
   * NOTE:
   * - FollowListModal은 "표시"만 하며,
   *   맞팔로잉 분리용 데이터(isMutualWithOwner)는 fetchFollowers/fetchFollowing에서 내려오는 것을 그대로 사용한다.
   */
  const {
    isFollowing,
    followerCount,
    followingCount,
    isPending,
    openFollowers,
    openFollowing,
    onToggleFollow,
    followersList,
    followingList,
    toggleItem,
    isPendingById,
  } = useFollowController({
    ownerId,
    ownerUsername,
    initialIsFollowing: initIsFollowing,
    initialFollowerCount: initFollowerCount,
    initialFollowingCount: initFollowingCount,
    viewerId,
    onRequireLogin,
  });

  // 모달 open state (열려있을 때만 렌더)
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  /**
   * open -> seed 로딩 순서
   * - 먼저 모달을 열어 skeleton/로딩 상태를 보여주고
   * - openFollowers/openFollowing이 내부에서 1페이지 seed를 가져오도록 함
   *
   * (UX 관점에서 "버튼 눌렀는데 반응이 늦는 느낌"을 줄임)
   */
  const openFollowersModal = useCallback(async () => {
    setFollowersOpen(true);
    await openFollowers();
  }, [openFollowers]);

  const openFollowingModal = useCallback(async () => {
    setFollowingOpen(true);
    await openFollowing();
  }, [openFollowing]);

  // 상위 상태 동기화: 초기 1회는 스킵(초기값 덮어쓰기/불필요 setState 방지)
  const didMount = useRef(false);
  useEffect(() => {
    if (!onFollowingChange) return;

    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    onFollowingChange(isFollowing);
  }, [isFollowing, onFollowingChange]);

  const sizes = useMemo(
    () =>
      size === "compact"
        ? { numCls: "text-sm", btnCls: "px-1 py-0.5 text-sm" }
        : { numCls: "text-base", btnCls: "px-1.5 py-0.5 text-base" },
    [size]
  );

  const alignCls = useMemo(
    () =>
      ({
        start: "items-start",
        center: "items-center",
        end: "items-end",
      })[align],
    [align]
  );

  return (
    <div
      className={[
        "flex",
        "gap-3",
        "flex-wrap",
        "items-center",
        alignCls,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="팔로우 섹션"
    >
      <button
        type="button"
        onClick={openFollowersModal}
        aria-label={`팔로워 ${followerCount.toLocaleString()}명 보기`}
        className={`hover:text-primary dark:hover:text-primary-light text-neutral-500 dark:text-neutral-400 ${sizes.numCls}`}
      >
        팔로워 {followerCount.toLocaleString()}
      </button>

      <button
        type="button"
        onClick={openFollowingModal}
        aria-label={`팔로잉 ${followingCount.toLocaleString()}명 보기`}
        className={`hover:text-primary dark:hover:text-primary-light text-neutral-500 dark:text-neutral-400 ${sizes.numCls}`}
      >
        팔로잉 {followingCount.toLocaleString()}
      </button>

      {resolvedShowButton && (
        <button
          id={followButtonId}
          type="button"
          onClick={onToggleFollow}
          disabled={isPending || isBlocked} // 차단 시 버튼 비활성화
          title={isBlocked ? "차단 관계에서는 팔로우할 수 없습니다" : ""}
          aria-pressed={isFollowing}
          aria-busy={isPending}
          aria-label={
            isPending
              ? "팔로우 처리 중"
              : isFollowing
                ? "팔로잉 취소"
                : "팔로우"
          }
          className={[
            "rounded-lg shadow transition-colors whitespace-nowrap",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            sizes.btnCls,
            isFollowing
              ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600"
              : "bg-primary text-white hover:bg-primary/90",
          ].join(" ")}
        >
          {isPending ? "처리 중..." : isFollowing ? "팔로잉 취소" : "팔로우"}
        </button>
      )}

      {/* followers modal */}
      {followersOpen && (
        <FollowListModal
          isOpen={followersOpen}
          onClose={() => setFollowersOpen(false)}
          users={followersList.users}
          title="팔로워"
          kind="followers"
          viewerId={viewerId}
          isLoading={!followersList.loaded && followersList.loading}
          hasMore={followersList.hasMore}
          onLoadMore={followersList.loadMore}
          loadingMore={followersList.loading && followersList.loaded}
          onToggleItem={toggleItem}
          isPendingById={isPendingById}
          error={followersList.error}
          onRetry={followersList.retry}
        />
      )}

      {/* following modal */}
      {followingOpen && (
        <FollowListModal
          isOpen={followingOpen}
          onClose={() => setFollowingOpen(false)}
          users={followingList.users}
          title="팔로잉"
          kind="following"
          viewerId={viewerId}
          isLoading={!followingList.loaded && followingList.loading}
          hasMore={followingList.hasMore}
          onLoadMore={followingList.loadMore}
          loadingMore={followingList.loading && followingList.loaded}
          onToggleItem={toggleItem}
          isPendingById={isPendingById}
          error={followingList.error}
          onRetry={followingList.retry}
        />
      )}
    </div>
  );
}
