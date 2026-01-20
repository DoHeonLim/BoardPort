/**
 * File Name : lib/viewCounter.ts
 * Description : 조회수 증가 공통 유틸 (ViewThrottle 3분 쿨다운 + DB increment + tag revalidate) — 올인원 통합
 * Author : 임도헌
 *
 * Key Points
 * - 제품/게시글/녹화(Recording) 조회수 증가 로직을 단일 진입점으로 통일.
 * - ViewThrottle(= shouldCountView) 로직을 이 파일로 흡수하여 파일 분산을 제거.
 * - 증가 성공 시에만 "views tag + detail tag"를 무효화하여 상세 정합성을 유지.
 * - 리스트는 무효화 X(성능 우선).
 *
 * Policy
 * - 동일 userId + 동일 targetType + 동일 targetId 는 3분 내 1회만 증가.
 * - 상세 페이지는 didIncrement === true 일 때만 화면 표시값을 +1 보정.
 * - 목록(list)은 캐시/스냅샷 유지 정책상 즉시 반영 X.
 *
 * History
 * Date        Author   Status     Description
 * 2026.01.04  임도헌   Modified   ViewThrottle 로직 흡수 + 단일 진입점(incrementViews) 통일
 * 2026.01.04  임도헌   Modified   create 레이스(P2002) 방어 추가
 * 2026.01.19  임도헌   Renamed    incrementViews.ts-> viewCounter.ts
 */

"use server";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import type { ViewTargetType } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/lib/errors";

export type IncrementViewsTarget = "PRODUCT" | "POST" | "RECORDING";

const COOLDOWN_MS = 3 * 60 * 1000;

export async function shouldCountView(
  userId: number | null,
  targetType: ViewTargetType,
  targetId: number
): Promise<boolean> {
  if (!userId) return false;
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  const now = new Date();
  const threshold = new Date(now.getTime() - COOLDOWN_MS);

  const existing = await db.viewThrottle.findUnique({
    where: {
      userId_targetType_targetId: {
        userId,
        targetType,
        targetId,
      },
    },
    select: { id: true, lastViewedAt: true },
  });

  // 1) 처음 보는 케이스: create
  // - 동시 요청 레이스로 P2002가 날 수 있으니 방어
  if (!existing) {
    try {
      await db.viewThrottle.create({
        data: { userId, targetType, targetId, lastViewedAt: now },
        select: { id: true },
      });
      return true;
    } catch (err) {
      // 동일 unique(userId,targetType,targetId)로 이미 생성된 경우
      if (isUniqueConstraintError(err)) {
        // 아래 updateMany 쿨다운 판정 루트로 자연스럽게 이어지도록 진행
      } else {
        throw err;
      }
    }
  }

  // 2) 이미 있거나(또는 create 레이스로 인해 이미 생성됨) 쿨다운 판정
  const current = existing
    ? existing
    : await db.viewThrottle.findUnique({
        where: {
          userId_targetType_targetId: { userId, targetType, targetId },
        },
        select: { id: true },
      });

  if (!current) {
    // 극히 드문 케이스: 위에서 레이스가 있었는데도 레코드가 안 보이면 증가하지 않음
    return false;
  }

  const updated = await db.viewThrottle.updateMany({
    where: {
      id: current.id,
      lastViewedAt: { lte: threshold }, // 3분 쿨다운 통과 시에만 갱신
    },
    data: { lastViewedAt: now },
  });

  return updated.count === 1;
}

type IncrementViewsArgs = {
  target: IncrementViewsTarget;
  targetId: number;
  viewerId: number | null; // 실질은 userId
};

export async function incrementViews({
  target,
  targetId,
  viewerId,
}: IncrementViewsArgs): Promise<boolean> {
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  if (target === "PRODUCT") {
    const ok = await shouldCountView(viewerId, "PRODUCT", targetId);
    if (!ok) return false;

    await db.product.update({
      where: { id: targetId },
      data: { views: { increment: 1 } },
      select: { id: true },
    });

    revalidateTag(T.PRODUCT_VIEWS(targetId));
    revalidateTag(T.PRODUCT_DETAIL_ID(targetId));
    return true;
  }

  if (target === "POST") {
    const ok = await shouldCountView(viewerId, "POST", targetId);
    if (!ok) return false;

    await db.post.update({
      where: { id: targetId },
      data: { views: { increment: 1 } },
      select: { id: true },
    });

    revalidateTag(T.POST_VIEWS(targetId));
    revalidateTag(T.POST_DETAIL(targetId));
    return true;
  }

  // RECORDING: ViewTargetType enum에는 VOD가 있으므로 throttle targetType은 "VOD"
  const ok = await shouldCountView(viewerId, "VOD", targetId);
  if (!ok) return false;

  await db.vodAsset.update({
    where: { id: targetId },
    data: { views: { increment: 1 } },
    select: { id: true },
  });

  // 태그 표준화(너가 원하는 네이밍): RECORDING_VIEWS
  revalidateTag(T.RECORDING_VIEWS(targetId));
  return true;
}
