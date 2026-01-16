/**
 * File Name : hooks/user/useFollowController.ts
 * Description : 프로필/채널 공용 팔로우 컨트롤러(헤더 상태 + 모달 페이징 + 토글/델타 동기화)
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
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFollowToggle } from "@/hooks/user/useFollowToggle";
import { useFollowPagination } from "@/hooks/user/useFollowPagination";
import { useUserLite } from "@/hooks/user/useUserLite";

import { fetchFollowers } from "@/lib/user/follow/fetchFollowers";
import { fetchFollowing } from "@/lib/user/follow/fetchFollowing";
import {
  onFollowDelta,
  getCachedViewerFollowingCount,
  getCachedTargetFollowersCount,
  getCachedIsFollowing,
} from "@/lib/user/follow/followDeltaClient";

type ControllerParams = {
  ownerId: number;
  ownerUsername: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
  viewerId?: number;
  onRequireLogin?: () => void;
};

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
  const { user: viewerLite } = useUserLite(viewerId, !!viewerId);

  // isOwnerSelf:
  // - 내 프로필에서는 "내 팔로잉 수/팔로잉 리스트"가 viewer 액션으로 바뀌므로 직접 갱신한다.
  // - 타인 프로필에서는 followingList가 '오너의 팔로잉'이므로 viewer 토글로 조작하면 안 된다.
  const isOwnerSelf = useMemo(
    () => !!viewerId && viewerId === ownerId,
    [viewerId, ownerId]
  );

  const [isFollowing, setIsFollowing] = useState<boolean>(initialIsFollowing);
  const [followerCount, setFollowerCount] =
    useState<number>(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState<number>(
    initialFollowingCount
  );

  const followersList = useFollowPagination({
    username: ownerUsername,
    fetcher: fetchFollowers,
  });
  const followingList = useFollowPagination({
    username: ownerUsername,
    fetcher: fetchFollowing,
  });

  // 최신 users 스냅샷(ref)
  const followersUsersRef = useRef(followersList.users);
  const followingUsersRef = useRef(followingList.users);

  useEffect(() => {
    followersUsersRef.current = followersList.users;
  }, [followersList.users]);

  useEffect(() => {
    followingUsersRef.current = followingList.users;
  }, [followingList.users]);

  /**
   * owner 기준 맞팔(섹션 분리) best-effort 계산
   * - followers 모달에서 viewer row를 "삽입"할 때 필요:
   *   viewer가 owner를 팔로우하는 것은 확정(delta>0)이고,
   *   mutual은 owner가 viewer를 팔로우하는지(owner -> viewer)를 뜻한다.
   * - 서버 SSOT가 최종이지만, followingList(오너의 팔로잉)가 이미 로드된 경우 즉시 추론 가능.
   */
  const getMutualWithOwnerBestEffort = useCallback((rowUserId: number) => {
    // followingList(오너의 팔로잉)가 로드되어 있고, 거기에 rowUser가 있으면 owner -> rowUser
    return followingUsersRef.current.some((u) => u.id === rowUserId);
  }, []);

  // back/forward 복원 보정
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

  const openFollowers = useCallback(async () => {
    await followersList.loadFirst();
  }, [followersList]);

  const openFollowing = useCallback(async () => {
    await followingList.loadFirst();
  }, [followingList]);

  // SSOT(users[].isFollowedByViewer)만 갱신:
  // - 로딩된 리스트에 존재하는 row만 업데이트한다.
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

  // viewerLite 늦게 로딩 시, 팔로워 리스트에 삽입된 "나" row를 실제 username/avatar로 보정
  useEffect(() => {
    if (!viewerId) return;
    if (!viewerLite?.username) return;

    const row = followersUsersRef.current.find((u) => u.id === viewerId);
    if (!row) return;

    const patchName = row.username === "나" || row.username.trim() === "";
    const patchAvatar = row.avatar == null && viewerLite.avatar != null;
    if (!patchName && !patchAvatar) return;

    followersList.upsertLocal({
      ...row,
      username: patchName ? viewerLite.username : row.username,
      avatar: patchAvatar ? viewerLite.avatar : row.avatar,
    });
  }, [viewerId, viewerLite?.username, viewerLite?.avatar, followersList]);

  // 헤더 팔로우 토글(viewer -> owner)
  const onToggleFollow = useCallback(async () => {
    if (!viewerId) return onRequireLogin?.();

    const was = isFollowing;
    const optimisticNext = !was;

    await toggle(ownerId, was, {
      viewerId,
      refresh: false,
      onRequireLogin,

      optimisticNextIsFollowing: optimisticNext,

      onOptimistic: () => setIsFollowing(optimisticNext),
      onRollback: () => setIsFollowing(was),

      onFollowersChange: (delta) => {
        setFollowerCount((c) => Math.max(0, c + delta));

        if (delta > 0) setIsFollowing(true);
        else if (delta < 0) setIsFollowing(false);

        // 팔로워 모달에서 "나" row를 삽입/삭제(로딩된 리스트에만 영향)
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
    viewerLite?.username,
    viewerLite?.avatar,
    isOwnerSelf,
    getMutualWithOwnerBestEffort,
  ]);

  // 모달 row 토글
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

          if (!isOwnerSelf) return;

          if (now) {
            followingList.upsertLocal({ ...base, isFollowedByViewer: true });
            setFollowingCount((c) => Math.max(0, c + 1));
          } else {
            followingList.removeLocal(userId);
            setFollowingCount((c) => Math.max(0, c - 1));
          }
        },

        onRollback: () => {
          updateViewerFollowFlagInLoadedLists(userId, was);

          if (!isOwnerSelf) return;

          if (now) {
            followingList.removeLocal(userId);
            setFollowingCount((c) => Math.max(0, c - 1));
          } else {
            followingList.upsertLocal({ ...base, isFollowedByViewer: true });
            setFollowingCount((c) => Math.max(0, c + 1));
          }
        },

        onReconcileServerState: ({
          isFollowing: serverIsFollowing,
          counts,
        }) => {
          updateViewerFollowFlagInLoadedLists(userId, serverIsFollowing);

          if (isOwnerSelf) {
            if (serverIsFollowing) {
              followingList.upsertLocal({ ...base, isFollowedByViewer: true });
            } else {
              followingList.removeLocal(userId);
            }
            if (counts?.viewerFollowing != null)
              setFollowingCount(counts.viewerFollowing);
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

  // 전역 델타 구독
  useEffect(() => {
    const off = onFollowDelta(
      ({ targetUserId, viewerId: deltaViewerId, delta, server }) => {
        if (targetUserId === ownerId) {
          if (server?.counts?.targetFollowers != null)
            setFollowerCount(server.counts.targetFollowers);
          else if (delta !== 0) setFollowerCount((c) => Math.max(0, c + delta));

          if (server?.isFollowing != null) setIsFollowing(server.isFollowing);
          else if (delta !== 0) setIsFollowing(delta > 0);

          // "나 row" 동기화는 오직 "내가 일으킨 델타"일 때만 수행한다.
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
    viewerLite?.username,
    viewerLite?.avatar,
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
