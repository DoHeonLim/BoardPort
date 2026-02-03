/**
 * File Name : features/stream/service/access.ts
 * Description : 방송 접근 권한(Role) 확인 및 비밀번호 검증 로직
 * Author : 임도헌
 *
 * History
 * 2025.08.09  임도헌   Created   visibility/role 기반 접근 허용 판단
 * 2025.08.14  임도헌   Modified  PRIVATE 비번 해제 상태(isPrivateUnlocked) 반영
 * 2025.09.05  임도헌   Modified  switch 적용(가시성 분기 누락 방지, 타입 안전 강화)
 * 2025.09.16  임도헌   Modified  Broadcast로 이름 변경
 * 2025.09.17  임도헌   Modified  EXCLUSION 상수 도입, 타입/오타 리스크 감소
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Merged    checkBroadcastAccess, unlockPrivateBroadcast, getViewerRole 통합 및 순수 함수화
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import { compare } from "bcrypt";
import db from "@/lib/db";
import type {
  StreamVisibility,
  ViewerRole,
  UnlockResult,
} from "@/features/stream/types";

// 접근 제한 사유 상수
export const EXCLUSION = {
  PRIVATE: "PRIVATE", // 비공개 방송 (비밀번호 필요)
  FOLLOWERS_ONLY: "FOLLOWERS_ONLY", // 팔로워 전용 (팔로우 필요)
} as const;

export type ExclusionReason = (typeof EXCLUSION)[keyof typeof EXCLUSION];

export type AccessResult =
  | { allowed: true; reason: null }
  | { allowed: false; reason: ExclusionReason };

function assertUnreachable(x: never): never {
  throw new Error(`Unreachable visibility case: ${String(x)}`);
}

/**
 * 뷰어의 역할(Role) 조회
 * - OWNER: 방송 소유자
 * - FOLLOWER: 팔로우 중인 유저
 * - VISITOR: 그 외
 *
 * @param {number | null} viewerId - 조회자 ID
 * @param {number} ownerId - 방송 소유자 ID
 * @returns {Promise<ViewerRole>}
 */
export async function getViewerRole(
  viewerId: number | null,
  ownerId: number
): Promise<ViewerRole> {
  if (!viewerId) return "VISITOR";
  if (viewerId === ownerId) return "OWNER";

  const rel = await db.follow.findUnique({
    where: {
      followerId_followingId: { followerId: viewerId, followingId: ownerId },
    },
    select: { followerId: true },
  });
  return rel ? "FOLLOWER" : "VISITOR";
}

/**
 * 방송 접근 권한 확인 (순수 로직)
 * - DB 조회 없이 주어진 데이터(방송 정보, 뷰어 역할, 언락 여부)만으로 판단합니다.
 *
 * [판단 기준]
 * - PUBLIC: 누구나 접근 가능
 * - FOLLOWERS: 소유자(OWNER)이거나 팔로워(FOLLOWER)인 경우 허용
 * - PRIVATE: 소유자(OWNER)이거나 비밀번호가 언락(isPrivateUnlocked)된 경우 허용
 *
 * @param stream - 방송 정보 (소유자 ID, 공개 설정)
 * @param role - 뷰어 역할 (OWNER | FOLLOWER | VISITOR)
 * @param opts.isPrivateUnlocked - 비밀번호 언락 여부 (세션 기반)
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
      // 소유자이거나 팔로워면 허용
      return role === "OWNER" || role === "FOLLOWER"
        ? { allowed: true, reason: null }
        : { allowed: false, reason: EXCLUSION.FOLLOWERS_ONLY };

    case "PRIVATE":
      // 소유자이거나 비밀번호를 입력해 언락된 상태면 허용
      return role === "OWNER" || isPrivateUnlocked
        ? { allowed: true, reason: null }
        : { allowed: false, reason: EXCLUSION.PRIVATE };
  }

  return assertUnreachable(stream.visibility as never);
}

/**
 * 방송 접근 권한 확인 (통합)
 * - role이 주어지지 않았다면 DB를 조회하여 role을 계산한 후 판단합니다.
 *
 * @param stream - 방송 정보
 * @param viewerId - 조회자 ID
 * @param opts - 옵션 (언락 여부, 미리 계산된 role)
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

/**
 * PRIVATE 방송 비밀번호 검증
 * - 실제 세션 저장(로그인)은 Controller(Action)에서 수행하며, 여기서는 검증 결과만 반환합니다.
 *
 * @param {number} broadcastId - 방송 ID
 * @param {string} password - 입력된 비밀번호
 * @returns {Promise<UnlockResult>} 검증 결과
 */
export async function verifyBroadcastPassword(
  broadcastId: number,
  password: string
): Promise<UnlockResult> {
  try {
    if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
      return { success: false, error: "BAD_REQUEST" };
    }

    const pwd = (password ?? "").trim();
    if (!pwd) return { success: false, error: "MISSING_PASSWORD" };

    const info = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, password: true, visibility: true },
    });

    if (!info) return { success: false, error: "STREAM_NOT_FOUND" };
    if (info.visibility !== "PRIVATE")
      return { success: false, error: "NOT_PRIVATE_STREAM" };
    if (!info.password) return { success: false, error: "NO_PASSWORD_SET" };

    const ok = await compare(pwd, info.password);
    if (!ok) return { success: false, error: "INVALID_PASSWORD" };

    return { success: true };
  } catch (e) {
    console.error("[verifyBroadcastPassword] error:", e);
    return { success: false, error: "INTERNAL_ERROR" };
  }
}
