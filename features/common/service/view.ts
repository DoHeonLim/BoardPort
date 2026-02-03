/**
 * File Name : features/common/service/view.ts
 * Description : 조회수 증가 공통 서비스 (ViewThrottle 3분 쿨다운 + DB increment + tag revalidate)
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
 * 2026.01.30  임도헌   Moved      lib/viewCounter.ts -> features/common/service/view.ts
 */

"use server";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import type { ViewTargetType } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/lib/errors";

export type IncrementViewsTarget = "PRODUCT" | "POST" | "RECORDING";

// 조회수 중복 증가 방지 시간 (3분)
const COOLDOWN_MS = 3 * 60 * 1000;

/**
 * 조회수 증가 가능 여부 확인 (내부 헬퍼)
 * - ViewThrottle 테이블을 사용하여 동일 유저/타겟의 최근 조회 시간을 확인합니다.
 * - 3분 이내 재조회 시 false를 반환하여 중복 증가를 막습니다.
 * - DB Write(Upsert/Update)를 포함하므로 Side Effect가 있습니다.
 *
 * @param userId - 조회자 ID (비로그인 시 null, 이 경우 항상 false 반환하여 증가 안 함 - 기획 정책)
 * @param targetType - 대상 타입 (PRODUCT, POST, VOD)
 * @param targetId - 대상 ID
 * @returns 증가 허용 여부 (true: 증가시켜라, false: 쿨다운 중이거나 자격 없음)
 */
export async function shouldCountView(
  userId: number | null,
  targetType: ViewTargetType,
  targetId: number
): Promise<boolean> {
  // 1. 비로그인 유저나 잘못된 ID는 카운트하지 않음 (정책)
  if (!userId) return false;
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  const now = new Date();
  const threshold = new Date(now.getTime() - COOLDOWN_MS);

  // 2. 기존 조회 기록 확인
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

  // 3. 기록이 없으면 신규 생성 (첫 조회)
  if (!existing) {
    try {
      await db.viewThrottle.create({
        data: { userId, targetType, targetId, lastViewedAt: now },
        select: { id: true },
      });
      return true; // 카운트 증가 허용
    } catch (err) {
      // P2002: 동시 요청으로 인해 다른 프로세스가 먼저 생성했을 수 있음 -> 무시하고 Update 흐름으로 진행
      if (!isUniqueConstraintError(err)) {
        throw err;
      }
    }
  }

  // 4. 기록이 있거나 방금 생성됨 -> 쿨다운 체크
  // - 위에서 생성하다가 충돌났으면 다시 조회 필요
  const current = existing
    ? existing
    : await db.viewThrottle.findUnique({
        where: {
          userId_targetType_targetId: { userId, targetType, targetId },
        },
        select: { id: true },
      });

  if (!current) return false; // 예외 상황 (거의 없음)

  // 5. 마지막 조회로부터 3분이 지났는지 확인하고 시간 갱신
  // - updateMany를 사용하여 조건(lastViewedAt <= threshold)이 맞을 때만 업데이트
  // - updated.count가 1이면 갱신 성공(=쿨다운 지남)
  const updated = await db.viewThrottle.updateMany({
    where: {
      id: current.id,
      lastViewedAt: { lte: threshold },
    },
    data: { lastViewedAt: now },
  });

  return updated.count === 1;
}

type IncrementViewsArgs = {
  target: IncrementViewsTarget;
  targetId: number;
  viewerId: number | null;
};

/**
 * 통합 조회수 증가 서비스 (Main Entry)
 * - 쿨다운 체크를 수행하고 통과 시 실제 타겟 테이블(Product/Post/Vod)의 views 컬럼을 +1 합니다.
 * - 증가 성공 시 관련 캐시 태그(상세/조회수)를 무효화하여 UI 정합성을 맞춥니다.
 *
 * @returns boolean - 실제 DB 증가가 일어났으면 true (UI 낙관적 +1 표시에 활용)
 */
export async function incrementViews({
  target,
  targetId,
  viewerId,
}: IncrementViewsArgs): Promise<boolean> {
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  // 1. PRODUCT
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

  // 2. POST
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

  // 3. RECORDING (VOD)
  // - ViewTargetType enum은 "VOD"를 사용함
  const ok = await shouldCountView(viewerId, "VOD", targetId);
  if (!ok) return false;

  await db.vodAsset.update({
    where: { id: targetId },
    data: { views: { increment: 1 } },
    select: { id: true },
  });

  revalidateTag(T.RECORDING_VIEWS(targetId));
  return true;
}
