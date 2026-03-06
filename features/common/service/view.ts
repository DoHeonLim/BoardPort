/**
 * File Name : features/common/service/view.ts
 * Description : 조회수 증가 공통 서비스 (ViewThrottle 3분 쿨다운 + DB increment + tag revalidate)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2026.01.04  임도헌   Modified   ViewThrottle 로직 흡수 + 단일 진입점(incrementViews) 통일
 * 2026.01.04  임도헌   Modified   create 레이스(P2002) 방어 추가
 * 2026.01.19  임도헌   Renamed    incrementViews.ts-> viewCounter.ts
 * 2026.01.30  임도헌   Moved      lib/viewCounter.ts -> features/common/service/view.ts
 * 2026.03.03  임도헌   Modified   목록 캐시 무효화
 * 2026.03.05  임도헌   Modified   조회 경로의 revalidateTag 제거(고빈도 캐시 무효화 방지), 상세 캐시 무효화 책임을 mutation action으로 이관
 * 2026.03.05  임도헌   Modified   주석 최신화
 */

"use server";

import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import type { ViewTargetType } from "@/generated/prisma/client";

export type IncrementViewsTarget = "PRODUCT" | "POST" | "VOD";

// 조회수 중복 증가 방지 시간 (3분)
const COOLDOWN_MS = 3 * 60 * 1000;

/**
 * 조회수 증가 가능 여부 확인 (내부 헬퍼)
 * - ViewThrottle 테이블을 사용하여 동일 유저/타겟의 최근 조회 시간을 확인
 * - 3분 이내 재조회 시 false를 반환하여 중복 증가를 막음
 * - DB Write(Upsert/Update)를 포함하므로 Side Effect가 있음
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
 * 통합 조회수 증가 서비스
 *
 * 1. `ViewThrottle` 테이블을 조회하여 동일 유저/타겟의 마지막 조회 시간을 확인
 * 2. [Throttle] 마지막 조회로부터 3분(COOLDOWN_MS)이 지나지 않았다면 카운트를 증가시키지 않음 (어뷰징 방지)
 * 3. 쿨다운이 지났거나 첫 조회라면 `views` 컬럼을 원자적으로 증가(+1) 시킴
 * 4. 성공 시 관련 캐시 태그(상세 정보)를 무효화하여 최신 상태를 반영
 *
 * @returns 실제 DB 증가가 일어났는지 여부 (UI 낙관적 업데이트용)
 */
export async function incrementViews({
  target,
  targetId,
  viewerId,
}: IncrementViewsArgs): Promise<boolean> {
  if (!Number.isFinite(targetId) || targetId <= 0) return false;

  const ok = await shouldCountView(
    viewerId,
    target === "VOD" ? "VOD" : target,
    targetId
  );
  if (!ok) return false;

  if (target === "PRODUCT") {
    await db.product.update({
      where: { id: targetId },
      data: { views: { increment: 1 } },
    });
  } else if (target === "POST") {
    await db.post.update({
      where: { id: targetId },
      data: { views: { increment: 1 } },
    });
  } else if (target === "VOD") {
    await db.vodAsset.update({
      where: { id: targetId },
      data: { views: { increment: 1 } },
    });
    // VOD는 BROADCAST_DETAIL에 묶여있거나 클라이언트 캐시로 관리되므로 별도 태그 불필요
  }
  return true;
}
