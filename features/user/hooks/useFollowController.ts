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
 */
"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import { useFollowPagination } from "@/features/user/hooks/useFollowPagination";
import { queryKeys } from "@/lib/queryKeys";
import {
  getFollowersAction,
  getFollowingAction,
} from "@/features/user/actions/follow";

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
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `queryKeys.users.followStats` 기반 `useQuery`를 활용한 프로필 상단 팔로우 통계 및 버튼 상태(isFollowing) 전역 캐시 제어
 * - 팔로워/팔로잉 모달 오픈 시 플래그 상태 변경을 통한 `useFollowPagination` 지연 로딩(Lazy Load) 트리거 적용
 * - `useFollowToggle` 훅 연동 및 `queryClient.getQueriesData`를 활용한 리스트 내 특정 유저 팔로우 상태 추출 및 낙관적 토글 처리
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

  // 1. 헤더 카운트 상태를 TanStack Query 캐시로 통합 관리
  const { data: followStats } = useQuery({
    queryKey: queryKeys.users.followStats(ownerId),
    initialData: {
      isFollowing: initialIsFollowing,
      followerCount: initialFollowerCount,
      followingCount: initialFollowingCount,
    },
    staleTime: Infinity, // Mutation 발생 시 덮어쓰기 전까지 유지
  });

  // 모달 활성화 플래그 (이 플래그가 true일 때 훅 내부의 TanStack Query가 데이터를 페칭)
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  // 쿼리 인스턴스 생성 (모달 오픈 시 지연 로딩)
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

  const isPendingById = useCallback((id: number) => isPending(id), [isPending]);

  /**
   * 헤더의 팔로우 버튼 토글 (Viewer -> Owner)
   * - 토글 실행 시 상태 관리는 useFollowToggle 내부의 queryClient 조작으로 위임
   */
  const onToggleFollow = useCallback(async () => {
    if (!viewerId) return onRequireLogin?.();
    await toggle(ownerId, followStats.isFollowing, {
      viewerId,
      onRequireLogin,
    });
  }, [viewerId, onRequireLogin, followStats.isFollowing, toggle, ownerId]);

  /**
   * 리스트 내부의 특정 유저 팔로우 토글
   */
  const toggleItem = useCallback(
    async (userId: number) => {
      if (!viewerId) return onRequireLogin?.();

      let currentIsFollowing = false;
      // 현재 캐시를 순회하여 대상 유저 객체를 찾고 팔로우 상태를 추출
      const cachedData = queryClient.getQueriesData({
        queryKey: queryKeys.follows.user(ownerUsername),
      });

      for (const [, data] of cachedData) {
        if (!data) continue;
        for (const page of (data as any).pages) {
          const found = page.users.find((u: any) => u.id === userId);
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
    isFollowing: followStats.isFollowing,
    followerCount: followStats.followerCount,
    followingCount: followStats.followingCount,
    isPending: isPending(ownerId),
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
