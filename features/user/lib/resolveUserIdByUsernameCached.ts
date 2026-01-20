/**
 * File Name : features/user/lib/resolveUserIdByUsernameCached.ts
 * Description : username → userId 해석(얇은 캐시) 공용 유틸 — per-username tag 기반 정밀 무효화
 * Author : 임도헌
 *
 * Key Points
 * - username 기반 라우트/도메인은 서버에서 즉시 id로 해석하고 내부 처리는 id로 통일한다.
 * - username→id 캐시는 "얇게(id만)" 유지한다(유저 스냅샷 캐싱 금지).
 * - 태그는 user-username-id-${normalizedUsername}로 통일하고,
 *   username 변경 시 old/new 둘 다 revalidateTag로 무효화한다.
 *
 * Cache Strategy
 * - base cached fn은 tags 없이 정의한다. (다른 도메인에서 공용 재사용)
 * - 호출 시점에 wrapper(nextCache)로 태그를 주입한다.
 * - keyParts는 고정 prefix(["user-username-resolve"])로 통일해 drift를 막는다.
 *
 * History
 * Date        Author   Status     Description
 * 2026.01.01  임도헌   Created    getUserStreams/getUserProfile/fetchFollowers/fetchFollowing 중복 제거
 */

"use server";

import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { normalizeUsername } from "@/features/user/lib/normalizeUsername";

/** base: username(정규화된 값) → id (tags 없음) */
const _resolveUserIdByUsernameBase = nextCache(
  async (username: string) => {
    const u = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return u?.id ?? null;
  },
  ["user-username-resolve"],
  { tags: [] }
);

/**
 * username → userId (nullable)
 * - 입력 username을 정규화한 뒤, per-username 태그를 주입한 캐시 경로로 조회한다.
 */
export async function resolveUserIdByUsernameCached(
  rawUsername: string
): Promise<number | null> {
  const uname = normalizeUsername(rawUsername);
  if (!uname) return null;

  const withTag = nextCache(
    (u: string) => _resolveUserIdByUsernameBase(u),
    ["user-username-resolve"],
    { tags: [T.USER_USERNAME_ID(uname)] }
  );

  return withTag(uname);
}
