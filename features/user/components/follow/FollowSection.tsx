/**
 * File Name : features/user/components/follow/FollowSection.tsx
 * Description : 팔로워/팔로잉 헤더 정보(버튼, 카운트) 표시 및 목록 모달을 렌더링하는 공용 섹션 컴포넌트
 * Author : 임도헌
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
 * 2026.03.01  임도헌   Modified  useFollowController에서 반환하는 isOpen 플래그를 사용하여 모달 상태 연동
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useEffect, useMemo, useRef } from "react";
import FollowListModal from "@/features/user/components/follow/FollowListModal";
import { useFollowController } from "@/features/user/hooks/useFollowController";

export type FollowSectionProps = {
  /** 조회 대상(프로필 주인) 유저 ID */
  ownerId: number;
  /** 타겟 유저 username (팔로워/팔로잉 API 호출 시 식별자로 사용) */
  ownerUsername: string;
  /**
   * 서버에서 미리 내려준 초기 상태
   * - isFollowing: viewer -> owner 팔로우 여부
   * - followerCount/followingCount: 헤더 렌더링용 초기 카운트
   */
  initial?: {
    isFollowing?: boolean;
    followerCount?: number;
    followingCount?: number;
  };
  /** 현재 접속 중인 뷰어(로그인 유저) 정보 */
  viewer?: { id?: number | null };
  /** 팔로우 버튼 표시 여부 (기본 true, 단 본인 프로필일 경우 내부적으로 숨김 처리) */
  showButton?: boolean;
  /** UI 크기 프리셋 */
  size?: "regular" | "compact";
  /** 정렬 방식 */
  align?: "start" | "center" | "end";
  className?: string;
  /** 로그인 필요 시 호출되는 콜백 (상위에서 라우팅 처리 권장) */
  onRequireLogin?: () => void;
  /** 외부 컴포넌트(헤더, 방송국 레일 등)와 상태 동기화를 위한 콜백 */
  onFollowingChange?: (isFollowing: boolean) => void;
  /** 외부 CTA 요소에서 팔로우 버튼을 찾을 수 있도록 부여하는 DOM id */
  followButtonId?: string;
  /** 차단 상태 여부 (차단된 경우 버튼 비활성화) */
  isBlocked?: boolean;
};

/**
 * 팔로우 섹션 컴포넌트 (오케스트레이션 역할)
 *
 * [핵심 기능 및 동작 원리]
 * 1. UI 렌더링: 프로필 상단이나 방송국 헤더에 '팔로워 N명', '팔로잉 M명' 및 팔로우 버튼을 렌더링함.
 * 2. 상태 위임: 모든 상태 관리, 낙관적 업데이트, 캐시 조작은 `useFollowController` 훅에 위임함.
 * 3. 지연 로딩 연동: 사용자가 팔로워/팔로잉 텍스트를 클릭하면, 컨트롤러의 `openFollowers()`를 호출하여 모달을 열고
 *    동시에 TanStack Query의 `enabled` 플래그를 true로 변경시켜 데이터를 페칭함.
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

  // 내 프로필/내 채널에서는 팔로우 버튼이 논리적으로 의미가 없으므로 자동으로 숨김 처리함.
  const isSelf = viewerId != null && viewerId === ownerId;
  const resolvedShowButton = showButton && !isSelf;

  const initIsFollowing = !!initial?.isFollowing;
  const initFollowerCount = initial?.followerCount ?? 0;
  const initFollowingCount = initial?.followingCount ?? 0;

  // 상태 관리, 쿼리 캐시 조작 및 모달 오픈 트리거를 통합 관리하는 컨트롤러 훅 호출
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

  // 상위 컴포넌트와의 동기화 로직
  // 마운트 시 초기값으로 덮어쓰는 것을 방지하기 위해 첫 렌더링(didMount)은 스킵함.
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
        // 컨트롤러의 상태를 변경하여 모달을 열고 쿼리를 활성화함
        onClick={openFollowers}
        aria-label={`팔로워 ${followerCount.toLocaleString()}명 보기`}
        className={`hover:text-primary dark:hover:text-primary-light text-neutral-500 dark:text-neutral-400 ${sizes.numCls}`}
      >
        팔로워 {followerCount.toLocaleString()}
      </button>

      <button
        type="button"
        onClick={openFollowing}
        aria-label={`팔로잉 ${followingCount.toLocaleString()}명 보기`}
        className={`hover:text-primary dark:hover:text-primary-light text-neutral-500 dark:text-neutral-400 ${sizes.numCls}`}
      >
        팔로잉 {followingCount.toLocaleString()}
      </button>

      {/* 팔로우 토글 버튼 */}
      {resolvedShowButton && (
        <button
          id={followButtonId}
          type="button"
          onClick={onToggleFollow}
          disabled={isPending || isBlocked} // 차단 관계일 경우 액션 원천 봉쇄
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

      {/* 팔로워 리스트 모달 렌더링 (isOpen이 true일 때만 표시됨) */}
      {followersList.isOpen && (
        <FollowListModal
          isOpen={followersList.isOpen}
          onClose={followersList.close}
          users={followersList.users}
          title="팔로워"
          kind="followers"
          viewerId={viewerId}
          isLoading={followersList.isLoading}
          isFetchingNextPage={followersList.isFetchingNextPage}
          hasMore={followersList.hasMore}
          onLoadMore={followersList.loadMore}
          onToggleItem={toggleItem}
          isPendingById={isPendingById}
          error={followersList.error}
          onRetry={followersList.retry}
        />
      )}

      {/* 팔로잉 리스트 모달 렌더링 */}
      {followingList.isOpen && (
        <FollowListModal
          isOpen={followingList.isOpen}
          onClose={followingList.close}
          users={followingList.users}
          title="팔로잉"
          kind="following"
          viewerId={viewerId}
          isLoading={followingList.isLoading}
          isFetchingNextPage={followingList.isFetchingNextPage}
          hasMore={followingList.hasMore}
          onLoadMore={followingList.loadMore}
          onToggleItem={toggleItem}
          isPendingById={isPendingById}
          error={followingList.error}
          onRetry={followingList.retry}
        />
      )}
    </div>
  );
}
