/**
 * File Name : app/api/users/[id]/follow/route
 * Description : 팔로우/언팔로우 mutation API (멱등 처리 + counts 반환 + 태그 무효화)
 * Author : 임도헌
 *
 * Key Points
 * - 멱등(idempotent):
 *   - POST: 이미 팔로우(P2002)면 changed=false, delta=0
 *   - DELETE: 이미 언팔로우면 changed=false, delta=0
 * - 클라이언트 정합성 보정:
 *   - useFollowToggle에서 server counts/isFollowing으로 최종 reconcile 가능하도록 counts를 항상 반환
 * - 캐시 무효화(revalidateTag):
 *   - target(프로필 주인): followers count/목록이 바뀌므로 USER_FOLLOWERS_ID(targetId)
 *   - viewer(행동 주체): following count/목록이 바뀌므로 USER_FOLLOWING_ID(viewerId)
 *   - 단, 멱등(changed=false, delta=0)인 경우 “실제 변화가 없으므로” revalidate는 생략한다.
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.22  임도헌   Created   follow/unfollow API 최초 구현
 * 2025.10.23  임도헌   Modified  태그 기반 무효화 도입 및 정리
 * 2025.12.31  임도헌   Modified  P2002 멱등 처리(isUniqueConstraintError) 도입
 * 2026.01.06  임도헌   Modified  용어/주석 정리 + self 가드 통일 + revalidate 범위 명확화
 * 2026.01.06  임도헌   Modified  멱등(delta=0)에서는 revalidateTag 생략(불필요 캐시 churn 제거)
 */

import "server-only";

import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { isUniqueConstraintError } from "@/lib/errors";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 팔로우 관계 변화 시 영향 범위:
 * - viewer: following 목록/카운트 변경
 * - target: followers 목록/카운트 변경
 *
 * 주의: 멱등(changed=false)이라면 실제 DB 변화가 없으므로 revalidate는 생략하는 것이 합리적이다.
 * (클라이언트는 counts로 즉시 reconcile 가능)
 */
function revalidateAfterFollowChangeIfChanged(
  viewerId: number,
  targetId: number,
  changed: boolean
) {
  if (!changed) return;
  revalidateTag(T.USER_FOLLOWING_ID(viewerId));
  revalidateTag(T.USER_FOLLOWERS_ID(targetId));
}

/**
 * reconcile을 위한 최신 카운트(서버 SSOT)
 * - viewerFollowing: viewer가 팔로우하는 사람 수
 * - targetFollowers: target을 팔로우하는 사람 수
 */
async function getCounts(viewerId: number, targetId: number) {
  const [viewerFollowing, targetFollowers] = await Promise.all([
    db.follow.count({ where: { followerId: viewerId } }),
    db.follow.count({ where: { followingId: targetId } }),
  ]);

  return { viewerFollowing, targetFollowers };
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const targetId = Number(params.id);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID" },
        { status: 400 }
      );
    }

    // self follow 방지(클라에서 막더라도 서버에서 최종 방어)
    if (session.id === targetId) {
      return NextResponse.json(
        { ok: false, error: "SELF_FOLLOW_FORBIDDEN" },
        { status: 400 }
      );
    }

    let changed = false;

    try {
      await db.follow.create({
        data: { followerId: session.id, followingId: targetId },
      });
      changed = true;
    } catch (e) {
      // 이미 팔로우(P2002)는 멱등 처리
      if (!isUniqueConstraintError(e, ["followerId", "followingId"])) {
        throw e;
      }
    }

    // 실제 변화가 있을 때만 캐시 무효화
    revalidateAfterFollowChangeIfChanged(session.id, targetId, changed);

    // changed=false여도 counts는 최신(SSOT)으로 반환 → back/forward stale 등에서 즉시 보정 가능
    const counts = await getCounts(session.id, targetId);

    return NextResponse.json(
      {
        ok: true,
        changed,
        status: changed ? "FOLLOWED" : "ALREADY_FOLLOWING",
        delta: changed ? +1 : 0,
        isFollowing: true,
        counts,
      },
      { status: changed ? 201 : 200 }
    );
  } catch (e) {
    console.error("[FOLLOW_POST]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const targetId = Number(params.id);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ID" },
        { status: 400 }
      );
    }

    // self unfollow도 의미 없으니 동일하게 방어(일관성)
    if (session.id === targetId) {
      return NextResponse.json(
        { ok: false, error: "SELF_UNFOLLOW_FORBIDDEN" },
        { status: 400 }
      );
    }

    const res = await db.follow.deleteMany({
      where: { followerId: session.id, followingId: targetId },
    });

    const changed = (res.count ?? 0) > 0;

    // 실제 변화가 있을 때만 캐시 무효화
    revalidateAfterFollowChangeIfChanged(session.id, targetId, changed);

    const counts = await getCounts(session.id, targetId);

    return NextResponse.json(
      {
        ok: true,
        changed,
        status: changed ? "UNFOLLOWED" : "NOT_FOLLOWING",
        delta: changed ? -1 : 0,
        isFollowing: false,
        counts,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[FOLLOW_DELETE]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
