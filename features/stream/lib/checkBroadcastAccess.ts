/**
 * File Name : features/stream/lib/checkBroadcastAccess.ts
 * Description : 방송(Broadcast) 상세 접근 권한 검사 (순수/비순수 레이어 분리, 반환 타입 유니온)
 * Author : 임도헌
 *
 * History
 * 2025.08.09  임도헌   Created   visibility/role 기반 접근 허용 판단
 * 2025.08.14  임도헌   Modified  PRIVATE 비번 해제 상태(isPrivateUnlocked) 반영
 * 2025.09.05  임도헌   Modified  switch 적용(가시성 분기 누락 방지, 타입 안전 강화)
 * 2025.09.16  임도헌   Modified  Broadcast로 이름 변경
 * 2025.09.17  임도헌   Modified  EXCLUSION 상수 도입, 타입/오타 리스크 감소
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import { getViewerRole } from "@/features/stream/lib/getViewerRole";
import type { StreamVisibility, ViewerRole } from "@/types/stream";

/** UI 오버레이/가드 사유 코드 (표준화) */
export const EXCLUSION = {
  PRIVATE: "PRIVATE",
  FOLLOWERS_ONLY: "FOLLOWERS_ONLY",
} as const;
export type ExclusionReason = (typeof EXCLUSION)[keyof typeof EXCLUSION];

/** allowed=true면 reason은 null, false면 ExclusionReason */
export type AccessResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: ExclusionReason };

function assertUnreachable(x: never): never {
  throw new Error(`Unreachable visibility case: ${String(x)}`);
}

/**
 * checkBroadcastAccessPure
 * - (Broadcast 기준) 소유자/가시성/언락 여부/역할 기반 접근 판정
 */
export function checkBroadcastAccessPure(
  stream: { userId: number; visibility: StreamVisibility },
  role: ViewerRole,
  opts: { isPrivateUnlocked?: boolean } = {}
): AccessResult {
  const { isPrivateUnlocked = false } = opts;

  switch (stream.visibility) {
    case "PUBLIC":
      return { allowed: true, reason: null };

    case "FOLLOWERS":
      return role === "OWNER" || role === "FOLLOWER"
        ? { allowed: true, reason: null }
        : { allowed: false, reason: EXCLUSION.FOLLOWERS_ONLY };

    case "PRIVATE":
      return role === "OWNER" || isPrivateUnlocked
        ? { allowed: true, reason: null }
        : { allowed: false, reason: EXCLUSION.PRIVATE };
  }

  return assertUnreachable(stream.visibility as never);
}

/**
 * checkBroadcastAccess
 * - viewerId로 role을 판정(getViewerRole)한 뒤 순수 함수에 위임.
 * - 이미 role이 있는 경우(opts.role) 주입하면 DB 호출을 피함.
 */
export async function checkBroadcastAccess(
  stream: { userId: number; visibility: StreamVisibility },
  viewerId: number | null,
  opts: { isPrivateUnlocked?: boolean; role?: ViewerRole } = {}
): Promise<AccessResult> {
  const role =
    opts.role ??
    (viewerId ? await getViewerRole(viewerId, stream.userId) : "VISITOR");

  return checkBroadcastAccessPure(stream, role, {
    isPrivateUnlocked: opts.isPrivateUnlocked,
  });
}
