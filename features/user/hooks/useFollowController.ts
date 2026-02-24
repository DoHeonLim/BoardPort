/**
 * File Name : features/user/hooks/useFollowController.ts
 * Description : 팔로우 기능 통합 컨트롤러 훅(헤더 상태 + 모달 페이징 + 토글/델타 동기화)
 * Author : 임도헌
 *
 * Key Points
 * - SSOT: 모달 row 상태는 users[].isFollowedByViewer만 신뢰(로컬 state 금지)
 * - 섹션 분리 SSOT: users[].isMutualWithOwner (owner 기준)만 사용한다.
 * - owner===viewer(내 프로필)일 때만 followingList/followingCount를 직접 변경
 * - back/forward 복원으로 헤더 stale 발생 시, followDeltaClient.getCached*로 즉시 보정
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
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import { useFollowPagination } from "@/features/user/hooks/useFollowPagination";
import { useUserLite } from "@/features/user/hooks/useUserLite";
import {
  getFollowersAction,
  getFollowingAction,
} from "@/features/user/actions/follow";
import {
  onFollowDelta,
  getCachedViewerFollowingCount,
  getCachedTargetFollowersCount,
  getCachedIsFollowing,
} from "@/features/user/utils/delta";

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
 * 팔로우 기능 통합 컨트롤러 훅
 *
 * - SSOT(Single Source of Truth): 팔로우 버튼 및 리스트 상태는 서버 응답(`isFollowing`, `counts`)을 기준으로 최종 동기화
 * - 사용자 액션 즉시 UI를 업데이트하고, 실패 시 롤백
 * - `onFollowDelta`를 통해 헤더, 모달, 리스트 간의 상태 변화를 실시간으로 전파
 * - 뒤로가기(Back/Forward) 시에도 최신 팔로우 상태가 유지되도록 인메모리 캐시를 활용
 *
 * @param {ControllerParams} params - 초기 상태(isFollowing, counts) 및 소유자 정보
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
  const { toggle, isPending } = useFollowToggle();
  // Viewer 정보 비동기 로드 (목록에 '나' 추가 시 표시용)
  const { user: viewerLite } = useUserLite(viewerId, !!viewerId);

  // 내 프로필인지 확인 (내 프로필이면 팔로잉 카운트도 실시간 반영 대상)
  const isOwnerSelf = useMemo(
    () => !!viewerId && viewerId === ownerId,
    [viewerId, ownerId]
  );

  // --- State (헤더/버튼용) ---
  const [isFollowing, setIsFollowing] = useState<boolean>(initialIsFollowing);
  const [followerCount, setFollowerCount] =
    useState<number>(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState<number>(
    initialFollowingCount
  );

  // --- Pagination Hooks (모달용) ---
  const followersList = useFollowPagination({
    username: ownerUsername,
    fetcher: getFollowersAction,
  });
  const followingList = useFollowPagination({
    username: ownerUsername,
    fetcher: getFollowingAction,
  });

  // 리스트 스냅샷 (이벤트 핸들러 내에서 최신 상태 참조용)
  const followersUsersRef = useRef(followersList.users);
  const followingUsersRef = useRef(followingList.users);

  useEffect(() => {
    followersUsersRef.current = followersList.users;
  }, [followersList.users]);

  useEffect(() => {
    followingUsersRef.current = followingList.users;
  }, [followingList.users]);

  /**
   * 맞팔 여부 추론 (Best Effort)
   * - 팔로잉 목록이 이미 로드되어 있다면, 그 안에 rowUser가 있는지 확인하여 맞팔 여부를 판단
   * - 서버 데이터를 기다리지 않고 UI를 즉시 갱신하기 위함
   */
  const getMutualWithOwnerBestEffort = useCallback((rowUserId: number) => {
    return followingUsersRef.current.some((u) => u.id === rowUserId);
  }, []);

  // --- Initialization (Back/Forward Cache Restore) ---
  useEffect(() => {
    const cachedFollowers = getCachedTargetFollowersCount(ownerId);
    if (cachedFollowers != null) setFollowerCount(cachedFollowers);

    if (viewerId) {
      const cachedRel = getCachedIsFollowing(viewerId, ownerId);
      if (cachedRel != null) setIsFollowing(cachedRel);
    }

    if (isOwnerSelf && viewerId) {
      const cachedMyFollowing = getCachedViewerFollowingCount(viewerId);
      if (cachedMyFollowing != null) setFollowingCount(cachedMyFollowing);
    }
  }, [ownerId, viewerId, isOwnerSelf]);

  const isPendingById = useCallback((id: number) => isPending(id), [isPending]);

  // 모달 열기 (데이터 Lazy Loading)
  const openFollowers = useCallback(async () => {
    await followersList.loadFirst();
  }, [followersList]);

  const openFollowing = useCallback(async () => {
    await followingList.loadFirst();
  }, [followingList]);

  // 리스트 내 특정 유저의 팔로우 상태 업데이트 (버튼 토글 시)
  const updateViewerFollowFlagInLoadedLists = useCallback(
    (userId: number, now: boolean) => {
      const inFollowers = followersUsersRef.current.find(
        (u) => u.id === userId
      );
      if (inFollowers)
        followersList.upsertLocal({ ...inFollowers, isFollowedByViewer: now });

      const inFollowing = followingUsersRef.current.find(
        (u) => u.id === userId
      );
      if (inFollowing)
        followingList.upsertLocal({ ...inFollowing, isFollowedByViewer: now });
    },
    [followersList, followingList]
  );

  // --- Action Handlers ---

  /**
   * 헤더 팔로우 버튼 토글 (Viewer -> Owner)
   */
  const onToggleFollow = useCallback(async () => {
    if (!viewerId) return onRequireLogin?.();

    const was = isFollowing;
    const optimisticNext = !was;

    await toggle(ownerId, was, {
      viewerId,
      refresh: false,
      onRequireLogin,
      optimisticNextIsFollowing: optimisticNext,

      // 1. 낙관적 업데이트
      onOptimistic: () => setIsFollowing(optimisticNext),

      // 2. 롤백 (에러 시)
      onRollback: () => setIsFollowing(was),

      // 3. 성공 시 처리 (카운트 및 리스트 반영)
      onFollowersChange: (delta) => {
        setFollowerCount((c) => Math.max(0, c + delta));

        if (delta > 0) setIsFollowing(true);
        else if (delta < 0) setIsFollowing(false);

        // 팔로워 리스트에 '나'를 추가/제거
        if (delta > 0) {
          const mutual = getMutualWithOwnerBestEffort(viewerId);
          followersList.upsertLocal({
            id: viewerId,
            username: viewerLite?.username ?? "나",
            avatar: viewerLite?.avatar ?? null,
            isFollowedByViewer: true,
            isMutualWithOwner: mutual,
          });
        } else if (delta < 0) {
          followersList.removeLocal(viewerId);
        }
      },

      // 4. 서버 데이터 정합 (SSOT)
      onReconcileServerState: ({ isFollowing, counts }) => {
        setIsFollowing(isFollowing);
        if (counts?.targetFollowers != null)
          setFollowerCount(counts.targetFollowers);
        if (isOwnerSelf && counts?.viewerFollowing != null) {
          setFollowingCount(counts.viewerFollowing);
        }
      },
    });
  }, [
    viewerId,
    onRequireLogin,
    isFollowing,
    toggle,
    ownerId,
    followersList,
    viewerLite,
    isOwnerSelf,
    getMutualWithOwnerBestEffort,
  ]);

  /**
   * 리스트 아이템 팔로우 토글
   */
  const toggleItem = useCallback(
    async (userId: number) => {
      if (!viewerId) return onRequireLogin?.();

      const base =
        followersUsersRef.current.find((u) => u.id === userId) ??
        followingUsersRef.current.find((u) => u.id === userId);

      if (!base) return;

      const was = !!base.isFollowedByViewer;
      const now = !was;

      await toggle(userId, was, {
        viewerId,
        refresh: false,
        onRequireLogin,
        optimisticNextIsFollowing: now,

        onOptimistic: () => {
          updateViewerFollowFlagInLoadedLists(userId, now);
          // 내 프로필이면 팔로잉 목록/카운트도 즉시 반영
          if (isOwnerSelf) {
            if (now) {
              followingList.upsertLocal({ ...base, isFollowedByViewer: true });
              setFollowingCount((c) => Math.max(0, c + 1));
            } else {
              followingList.removeLocal(userId);
              setFollowingCount((c) => Math.max(0, c - 1));
            }
          }
        },

        onRollback: () => {
          updateViewerFollowFlagInLoadedLists(userId, was);
          if (isOwnerSelf) {
            // 롤백 로직 (생략 - 위와 반대)
            if (now) {
              // 추가 실패 -> 제거
              followingList.removeLocal(userId);
              setFollowingCount((c) => Math.max(0, c - 1));
            } else {
              // 삭제 실패 -> 복구
              followingList.upsertLocal({ ...base, isFollowedByViewer: true });
              setFollowingCount((c) => Math.max(0, c + 1));
            }
          }
        },

        onReconcileServerState: ({
          isFollowing: serverIsFollowing,
          counts,
        }) => {
          updateViewerFollowFlagInLoadedLists(userId, serverIsFollowing);
          if (isOwnerSelf && counts?.viewerFollowing != null) {
            setFollowingCount(counts.viewerFollowing);
            // 목록 정합성도 필요하면 여기서 추가 처리
          }
        },
      });
    },
    [
      viewerId,
      onRequireLogin,
      toggle,
      updateViewerFollowFlagInLoadedLists,
      isOwnerSelf,
      followingList,
    ]
  );

  // --- Global Event Subscription ---
  useEffect(() => {
    const off = onFollowDelta(
      ({ targetUserId, viewerId: deltaViewerId, delta, server }) => {
        // 1. 현재 보고 있는 프로필 주인의 팔로워 수/상태 갱신
        if (targetUserId === ownerId) {
          if (server?.counts?.targetFollowers != null)
            setFollowerCount(server.counts.targetFollowers);
          else if (delta !== 0) setFollowerCount((c) => Math.max(0, c + delta));

          if (server?.isFollowing != null) setIsFollowing(server.isFollowing);
          else if (delta !== 0) setIsFollowing(delta > 0);

          // 내가 액션을 취했다면 리스트 내 '나' 항목 갱신
          if (viewerId && deltaViewerId === viewerId) {
            if (delta > 0) {
              const mutual = getMutualWithOwnerBestEffort(viewerId);
              followersList.upsertLocal({
                id: viewerId,
                username: viewerLite?.username ?? "나",
                avatar: viewerLite?.avatar ?? null,
                isFollowedByViewer: true,
                isMutualWithOwner: mutual,
              });
            } else if (delta < 0) {
              followersList.removeLocal(viewerId);
            }
          }
        }

        // 2. 내 프로필이라면 내 팔로잉 수 갱신
        if (isOwnerSelf && viewerId && deltaViewerId === viewerId) {
          if (server?.counts?.viewerFollowing != null)
            setFollowingCount(server.counts.viewerFollowing);
          else if (delta !== 0)
            setFollowingCount((c) => Math.max(0, c + delta));
        }
      }
    );

    return off;
  }, [
    ownerId,
    viewerId,
    isOwnerSelf,
    followersList,
    viewerLite,
    getMutualWithOwnerBestEffort,
  ]);

  return {
    isFollowing,
    followerCount,
    followingCount,
    isPending: isPending(ownerId),
    onToggleFollow,
    openFollowers,
    openFollowing,
    followersList,
    followingList,
    toggleItem,
    isPendingById,
  };
}
