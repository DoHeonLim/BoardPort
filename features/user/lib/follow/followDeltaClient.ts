/**
 * File Name : features/user/lib/follow/followDeltaClient.ts
 * Description : 팔로우 결과를 델타 이벤트로 브로드캐스트하는 클라이언트 브로커(단일 탭) + back/forward stale 보정 캐시
 * Author : 임도헌
 *
 * Key Points
 * - onFollowDelta: 동일 탭 내 UI(헤더/모달/카드) 동기화(EventTarget 기반)
 * - emitFollowDelta: 서버 SSOT(isFollowing/counts) 우선 캐시 후 이벤트 발행(구독자/복원 화면 보정)
 * - getCached*: back/forward 복원으로 이벤트를 놓친 화면에서도 마운트 시 즉시 헤더 보정 가능
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.31  임도헌   Created   follow:delta 이벤트 버스(EventTarget) + 헤더/모달/카드 동기화 브로커 도입
 * 2025.12.27  임도헌   Modified  back/forward stale 대응: viewerFollowing/targetFollowers/isFollowing 메모리 캐시(Map) 추가,
 *                                getCached* getter 제공 + emit 시 "캐시 → 이벤트" 순서로 안정화
 * 2025.12.31  임도헌   Modified  delta payload에 viewerId 포함 컨벤션 고정(내 프로필 followingCount 보정 기준 강화) 및 주석 보강
 * 2026.01.06  임도헌   Modified  "use client" 추가: 서버 번들 import 사고 방지(EventTarget/CustomEvent 보호)
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

"use client";

type FollowCounts = { viewerFollowing?: number; targetFollowers?: number };

export type FollowDelta = {
  targetUserId: number; // 팔로우 대상 id(프로필/채널의 ownerId와 비교해 헤더 갱신 범위를 결정)
  viewerId?: number | null; // 토글 수행자 id(내 프로필 followingCount 갱신 여부 판단에 사용)
  delta: 1 | -1 | 0; // 서버 delta(멱등/경합이면 0 가능)
  server?: {
    isFollowing: boolean; // 서버 기준 최종 상태(viewer -> target)
    counts?: FollowCounts; // 서버 기준 카운트(정합 보정용)
  };
};

/**
 * 이벤트 버스(단일 탭)
 * - 구독: onFollowDelta((d)=>{ ... })
 * - 발행: emitFollowDelta(d)
 */
const followDeltaEventTarget = new EventTarget();

/**
 * 캐시 3종(단일 탭 메모리)
 * - viewerFollowing: 내 팔로잉 수(내 프로필 헤더/탭 카운트 보정)
 * - targetFollowers: 특정 유저 팔로워 수(타인 프로필 헤더 보정)
 * - isFollowing: viewer->target 관계(팔로우 버튼 상태 보정)
 *
 * Note:
 * - 새로고침/새 탭에서는 초기화된다(이 경우 SSOT는 서버 데이터).
 */
const cachedViewerFollowingByViewerId = new Map<number, number>();
const cachedTargetFollowersByTargetId = new Map<number, number>();
const cachedIsFollowingByPair = new Map<string, boolean>();

export function getCachedViewerFollowingCount(viewerId: number) {
  return cachedViewerFollowingByViewerId.get(viewerId);
}

export function getCachedTargetFollowersCount(targetUserId: number) {
  return cachedTargetFollowersByTargetId.get(targetUserId);
}

const pairKey = (viewerId: number, targetUserId: number) =>
  `${viewerId}:${targetUserId}`;

export function getCachedIsFollowing(viewerId: number, targetUserId: number) {
  return cachedIsFollowingByPair.get(pairKey(viewerId, targetUserId));
}

export function onFollowDelta(handler: (delta: FollowDelta) => void) {
  const eventListener: EventListener = (evt: Event) => {
    handler((evt as CustomEvent<FollowDelta>).detail);
  };
  followDeltaEventTarget.addEventListener("follow:delta", eventListener);
  return () =>
    followDeltaEventTarget.removeEventListener("follow:delta", eventListener);
}

export function emitFollowDelta(delta: FollowDelta) {
  // 캐시 → 이벤트 순서:
  // - 구독자가 이벤트 처리 중 "즉시 보정(getCached*)"을 사용하거나,
  // - back/forward 복원처럼 이벤트를 놓친 화면이 마운트 시 보정할 수 있도록
  //   server 기준 값을 먼저 저장해둔다.
  const vId = delta.viewerId ?? null;

  const vFollowing = delta.server?.counts?.viewerFollowing;
  if (vId != null && vFollowing != null) {
    cachedViewerFollowingByViewerId.set(vId, vFollowing);
  }

  const tFollowers = delta.server?.counts?.targetFollowers;
  if (tFollowers != null) {
    cachedTargetFollowersByTargetId.set(delta.targetUserId, tFollowers);
  }

  const isFollowing = delta.server?.isFollowing;
  if (vId != null && typeof isFollowing === "boolean") {
    cachedIsFollowingByPair.set(pairKey(vId, delta.targetUserId), isFollowing);
  }

  followDeltaEventTarget.dispatchEvent(
    new CustomEvent<FollowDelta>("follow:delta", { detail: delta })
  );
}
