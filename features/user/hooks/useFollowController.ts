/**
 * File Name : features/user/hooks/useFollowController.ts
 * Description : 팔로우 기능 통합 컨트롤러 훅(헤더 상태 + 모달 페이징 + 토글/델타 동기화)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.13  임도헌   Created   프로필/채널 공용 컨트롤러 훅
 * 2025.10.22  임도헌   Modified  useUserLite(viewerId) 도입
 * 2025.10.29  임도헌   Modified  서버 delta 신뢰 보정(헤더 동기화)
 * 2025.10.31  임도헌   Modified  정합성 보정 결선 + 기본 refresh:false + followDelta 구독
 * 2025.12.20  임도헌   Modified  toggleItem 단일 시그니처(userId) + FollowListItem SSOT 적용
 * 2025.12.23  임도헌   Modified  viewerLite 늦게 로딩 시 팔로워 리스트 내 viewer row("나") 자동 보정
 * 2025.12.27  임도헌   Modified  back/forward stale 해결: followDelta 캐시로 헤더 보정 + isOwnerSelf에서 viewerFollowing 갱신 분기 추가
 * 2025.12.31  임도헌   Modified  toggleItem 안전가드(base 없으면 no-op) + 멱등(delta=0) 낙관 rollback 조건 개선 연동
 * 2026.01.06  임도헌   Modified  FollowListUser.isMutualWithOwner 필수 강제 대응:
 *                                viewer row 삽입 시 followingList(로드된 경우)로 mutual best-effort 유지
 * 2026.01.16  임도헌   Moved     hooks -> hooks/user
 * 2026.01.18  임도헌   Moved     hooks/user -> features/user/hooks
 * 2026.03.01  임도헌   Modified  TanStack Query(queryClient)를 직접 조작하는 방식으로 로컬 갱신 로직 리팩토링
 * 2026.03.03  임도헌   Modified  useState 및 delta.ts 전면 제거 후 TanStack Query(users.followStats) 연동
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.31  임도헌   Modified  헤더 통계와 모달 페이징 제어 목적이 보이도록 설명 톤 통일
 * 2026.04.08  임도헌   Modified  프로필/채널 헤더 팔로우 성공 시 맥락형 토스트를 노출해 상태 전환 체감 보강
 * 2026.05.16  임도헌   Modified  팔로우 모달 캐시 조회 타입을 명시해 any 캐스팅 제거
 * 2026.06.17  임도헌   Modified  팔로우 버튼/카운트 표시만 선반영하고 팔로워 전용 접근 상태는 서버 성공 후 동기화
 */
"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import { useFollowPagination } from "@/features/user/hooks/useFollowPagination";
import { queryKeys } from "@/lib/queryKeys";
import {
  getFollowersAction,
  getFollowingAction,
} from "@/features/user/actions/follow";
import type { FollowListPage } from "@/features/user/types";

type ControllerParams = {
  ownerId: number;
  ownerUsername: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
  viewerId?: number;
  onRequireLogin?: () => void;
};

/**
 * 팔로우 기능 통합 상태 관리 및 컨트롤러 훅
 *
 * [기능]
 * - 프로필 상단 팔로우 통계와 버튼 상태를 전역 캐시 기준으로 관리하되, 버튼/카운트 표시는 pending 동안 선반영
 * - 팔로워/팔로잉 모달은 열릴 때만 지연 로딩으로 조회
 * - 리스트 내부 토글도 같은 `useFollowToggle` 경로를 재사용해 상태를 맞춤
 * - 팔로워 전용 방송 잠금처럼 팔로우 성공 여부에 따라 바뀌는 접근 상태는 서버 성공 후 캐시 동기화 결과만 외부로 전달
 *
 * @param {ControllerParams} params - 소유자 정보, 초기 카운트, 뷰어 정보 및 로그인 콜백
 */
export function useFollowController({
  ownerId,
  ownerUsername,
  initialIsFollowing,
  initialFollowerCount,
  initialFollowingCount,
  viewerId,
  onRequireLogin,
}: ControllerParams) {
  const queryClient = useQueryClient();
  const { toggle, isPending } = useFollowToggle();

  // 헤더 통계 캐시
  // profile/channel 상단 숫자와 팔로우 버튼을 같은 query key 기준으로 유지
  const { data: followStats } = useQuery({
    queryKey: queryKeys.users.followStats(ownerId),
    initialData: {
      isFollowing: initialIsFollowing,
      followerCount: initialFollowerCount,
      followingCount: initialFollowingCount,
    },
    staleTime: Infinity, // Mutation 발생 시 덮어쓰기 전까지 유지
  });
  const [optimisticOwnerState, setOptimisticOwnerState] = useState<{
    isFollowing: boolean;
    followerCount: number;
  } | null>(null);

  // 모달 활성화 플래그
  // 열릴 때만 목록 쿼리를 켜서 초기 렌더링 비용을 줄임
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  // 모달별 목록 쿼리
  const followersList = useFollowPagination({
    username: ownerUsername,
    type: "followers",
    fetcher: getFollowersAction,
    enabled: followersOpen,
  });

  const followingList = useFollowPagination({
    username: ownerUsername,
    type: "following",
    fetcher: getFollowingAction,
    enabled: followingOpen,
  });

  const ownerPending = isPending(ownerId);
  const displayIsFollowing =
    optimisticOwnerState?.isFollowing ?? followStats.isFollowing;
  const displayFollowerCount =
    optimisticOwnerState?.followerCount ?? followStats.followerCount;
  const isPendingById = useCallback((id: number) => isPending(id), [isPending]);

  /**
   * 헤더의 팔로우 버튼 토글 (Viewer -> Owner)
 * 실제 캐시 갱신은 `useFollowToggle` 내부 처리
   */
  const onToggleFollow = useCallback(async () => {
    if (!viewerId) return onRequireLogin?.();
    const wasFollowing = followStats.isFollowing;
    const nextIsFollowing = !wasFollowing;
    const nextFollowerCount = Math.max(
      0,
      followStats.followerCount + (wasFollowing ? -1 : 1)
    );

    setOptimisticOwnerState({
      isFollowing: nextIsFollowing,
      followerCount: nextFollowerCount,
    });

    const res = await toggle(ownerId, wasFollowing, {
      viewerId,
      onRequireLogin,
    });

    setOptimisticOwnerState(null);

    if (!wasFollowing && res?.success && res.isFollowing) {
      toast.success(`${ownerUsername}님을 팔로우했습니다.`);
    }
  }, [
    viewerId,
    onRequireLogin,
    followStats.isFollowing,
    followStats.followerCount,
    toggle,
    ownerId,
    ownerUsername,
  ]);

  /**
   * 리스트 내부의 특정 유저 팔로우 토글
   */
  const toggleItem = useCallback(
    async (userId: number) => {
      if (!viewerId) return onRequireLogin?.();

      let currentIsFollowing = false;
      // 현재 캐시 기준 팔로우 상태 추출
      // 모달 row의 최신 상태를 기준으로 토글 의도를 계산
      const cachedData = queryClient.getQueriesData<
        InfiniteData<FollowListPage>
      >({
        queryKey: queryKeys.follows.user(ownerUsername),
      });

      for (const [, data] of cachedData) {
        if (!data?.pages) continue;
        for (const page of data.pages) {
          const found = page.users.find((u) => u.id === userId);
          if (found) {
            currentIsFollowing = !!found.isFollowedByViewer;
            break;
          }
        }
      }

      await toggle(userId, currentIsFollowing, { viewerId, onRequireLogin });
    },
    [viewerId, onRequireLogin, toggle, queryClient, ownerUsername]
  );

  return {
    isFollowing: displayIsFollowing,
    confirmedIsFollowing: followStats.isFollowing,
    followerCount: displayFollowerCount,
    followingCount: followStats.followingCount,
    isPending: ownerPending,
    onToggleFollow,
    openFollowers: () => setFollowersOpen(true),
    openFollowing: () => setFollowingOpen(true),
    followersList: {
      ...followersList,
      isOpen: followersOpen,
      close: () => setFollowersOpen(false),
    },
    followingList: {
      ...followingList,
      isOpen: followingOpen,
      close: () => setFollowingOpen(false),
    },
    toggleItem,
    isPendingById,
  };
}
