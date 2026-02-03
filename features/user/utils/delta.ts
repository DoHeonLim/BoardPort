/**
 * File Name : features/user/utils/delta.ts
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
 * 2026.01.24  임도헌   Moved     lib/follow/followDeltaClient.ts -> utils/delta.ts
 */

"use client";

type FollowCounts = { viewerFollowing?: number; targetFollowers?: number };

export type FollowDelta = {
  /** 팔로우 대상 유저 ID (프로필/채널의 ownerId와 비교) */
  targetUserId: number;
  /** 토글을 수행한 유저 ID (내 프로필의 followingCount 보정용) */
  viewerId?: number | null;
  /** 변경량 (+1, -1, 0) - 0은 멱등/경합 등으로 변화 없을 때 */
  delta: 1 | -1 | 0;
  /** 서버로부터 받은 최신 상태 (SSOT) */
  server?: {
    isFollowing: boolean;
    counts?: FollowCounts;
  };
};

/**
 * 이벤트 버스 (EventTarget)
 * - 브라우저의 CustomEvent를 활용하여 컴포넌트 간 통신을 수행합니다.
 * - 리렌더링 없이 상태 변화를 전파할 수 있습니다.
 */
const followDeltaEventTarget = new EventTarget();

/**
 * 인메모리 캐시 (Map)
 * - 페이지 이동(Unmount -> Mount) 시에도 최신 상태를 즉시 복원하기 위해 사용합니다.
 * - 예를 들어, 팔로우 목록에서 상태를 변경하고 뒤로가기를 했을 때 프로필 헤더의 카운트가 즉시 반영되도록 합니다.
 * - SPA 네비게이션 동안만 유지되며, 새로고침 시에는 초기화됩니다 (서버 데이터 재조회).
 */
const cachedViewerFollowingByViewerId = new Map<number, number>();
const cachedTargetFollowersByTargetId = new Map<number, number>();
const cachedIsFollowingByPair = new Map<string, boolean>();

// --- Getter Functions ---

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

// --- Subscription ---

/**
 * 팔로우 변경 이벤트 구독
 * - 컴포넌트에서 useEffect 내에서 호출하여 사용합니다.
 * - 반환된 함수를 호출하면 구독이 해제됩니다.
 */
export function onFollowDelta(handler: (delta: FollowDelta) => void) {
  const eventListener: EventListener = (evt: Event) => {
    handler((evt as CustomEvent<FollowDelta>).detail);
  };
  followDeltaEventTarget.addEventListener("follow:delta", eventListener);
  return () =>
    followDeltaEventTarget.removeEventListener("follow:delta", eventListener);
}

// --- Dispatch ---

/**
 * 팔로우 변경 이벤트 발행 (Publisher)
 *
 * 1. 캐시에 먼저 저장 (백그라운드 탭이나 나중에 마운트될 컴포넌트를 위해)
 * 2. `follow:delta` 이벤트 발생 (현재 마운트된 리스너들에게 알림)
 */
export function emitFollowDelta(delta: FollowDelta) {
  const vId = delta.viewerId ?? null;

  // 1. Viewer의 팔로잉 수 캐싱 (내 프로필용)
  const vFollowing = delta.server?.counts?.viewerFollowing;
  if (vId != null && vFollowing != null) {
    cachedViewerFollowingByViewerId.set(vId, vFollowing);
  }

  // 2. Target의 팔로워 수 캐싱 (상대 프로필용)
  const tFollowers = delta.server?.counts?.targetFollowers;
  if (tFollowers != null) {
    cachedTargetFollowersByTargetId.set(delta.targetUserId, tFollowers);
  }

  // 3. 팔로우 여부 캐싱 (버튼 상태용)
  const isFollowing = delta.server?.isFollowing;
  if (vId != null && typeof isFollowing === "boolean") {
    cachedIsFollowingByPair.set(pairKey(vId, delta.targetUserId), isFollowing);
  }

  // 4. 이벤트 발행
  followDeltaEventTarget.dispatchEvent(
    new CustomEvent<FollowDelta>("follow:delta", { detail: delta })
  );
}
