/**
 * File Name : features/product/service/bump.ts
 * Description : 제품 끌어올리기(Bump) 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.03  임도헌   Created   끌어올리기(Bump) 기능 구현 (24시간 쿨다운)
 * 2026.02.05  임도헌   Modified  최대 횟수(5회) 제한 로직 추가
 * 2026.02.22  임도헌   Modified  예약중/판매완료 상품 끌어올리기 어뷰징 차단 로직 추가
 * 2026.02.23  임도헌   Modified  동시성 이슈(Race Condition) 방어를 위한 원자적 업데이트 적용
 * 2026.03.05  임도헌   Modified  끌어올리기(Bump) 이후의 광범위한 `revalidateTag` 의존성 제거 및 클라이언트 상태 동기화로 대체
 * 2026.03.07  임도헌   Modified  실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  정지 유저 가드 추가 및 실패 문구 오기 정정
 */

import "server-only";
import db from "@/lib/db";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { validateUserStatus } from "@/features/user/service/admin";
import {
  BUMP_COOLDOWN_HOURS,
  MAX_BUMP_COUNT,
} from "@/features/product/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 제품을 목록 상단으로 끌어올림
 * - 소유권을 확인하고, 마지막 끌어올리기 시간으로부터 24시간이 지났는지 검사
 * - 조건을 만족하면 `refreshed_at`과 `last_bumped_at`을 현재 시간으로 갱신
 * - 변경 후 관련 캐시(목록, 상세, 유저 판매 목록)를 무효화
 *
 * @param userId - 요청자 ID
 * @param productId - 제품 ID
 * @returns 성공 여부 및 에러 메시지
 */
export async function bumpProduct(
  userId: number,
  productId: number
): Promise<ServiceResult> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 1. 제품 조회 (소유자 및 쿨다운 확인용)
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        userId: true,
        last_bumped_at: true,
        bump_count: true,
        purchase_userId: true,
        reservation_userId: true,
      },
    });

    if (!product) {
      return { success: false, error: "제품을 찾을 수 없습니다." };
    }

    if (product.userId !== userId) {
      return { success: false, error: "권한이 없습니다." };
    }

    // 거래가 진행 중이거나 완료된 상품은 끌어올릴 수 없도록 차단
    if (product.purchase_userId || product.reservation_userId) {
      return {
        success: false,
        error: "예약 중이거나 판매 완료된 상품은 끌어올릴 수 없습니다.",
      };
    }

    //  2. 횟수 제한 체크
    if (product.bump_count >= MAX_BUMP_COUNT) {
      return {
        success: false,
        error: `끌어올리기 횟수(${MAX_BUMP_COUNT}회)를 모두 소진했습니다.`,
      };
    }

    // 3. 쿨다운 체크
    const now = new Date();
    let cooldownThreshold = undefined;
    if (product.last_bumped_at) {
      const diffMs = now.getTime() - product.last_bumped_at.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < BUMP_COOLDOWN_HOURS) {
        const remaining = Math.ceil(BUMP_COOLDOWN_HOURS - diffHours);
        return {
          success: false,
          error: `하루에 한 번만 가능합니다. (${remaining}시간 후 가능)`,
        };
      }
      cooldownThreshold = new Date(
        now.getTime() - BUMP_COOLDOWN_HOURS * 60 * 60 * 1000
      );
    }

    // 4. 업데이트 (동시성 어뷰징 방어)
    const updated = await db.product.updateMany({
      where: {
        id: productId,
        bump_count: { lt: MAX_BUMP_COUNT }, // 락 가드 1
        ...(cooldownThreshold
          ? { last_bumped_at: { lte: cooldownThreshold } }
          : {}), // 락 가드 2
      },
      data: {
        refreshed_at: now,
        last_bumped_at: now,
        bump_count: { increment: 1 },
      },
    });

    // 업데이트된 행이 없다면, 다른 스레드에서 찰나의 순간에 먼저 올린 것
    if (updated.count === 0) {
      return {
        success: false,
        error: "이미 끌어올렸거나 조건이 맞지 않습니다.",
      };
    }

    // 5. 캐시 무효화
    revalidateTag(T.PRODUCT_DETAIL(productId)); // 상세 페이지

    return { success: true };
  } catch (e) {
    console.error("bumpProduct error:", e);
    return {
      success: false,
      error:
        "제품 끌어올리기에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
