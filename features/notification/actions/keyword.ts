/**
 * File Name : features/notification/actions/keyword.ts
 * Description : 키워드 알림 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.12  임도헌   Created   키워드 등록/삭제/조회 액션 구현
 * 2026.02.21  임도헌   Modified  regionRange 파라미터 추가
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  addKeywordAlert,
  removeKeywordAlert,
} from "@/features/notification/service/keyword";
import type { ServiceResult } from "@/lib/types";
import type { RegionRange } from "@/generated/prisma/enums";

/**
 * 키워드 알림 등록 Action
 * - 로그인 확인 후 Service를 호출하여 지정된 범위와 함께 키워드를 등록
 * - 성공 시 관련 페이지 캐시 갱신
 *
 * @param keyword - 등록할 키워드
 * @param regionRange - 매칭 기준이 될 지역 범위 (DONG, GU, CITY, ALL)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function addKeywordAction(
  keyword: string,
  regionRange: RegionRange
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const res = await addKeywordAlert(session.id, keyword, regionRange);
  // 성공 시 검색 페이지와 설정 페이지 모두 갱신
  if (res.success) {
    revalidatePath("/products");
    revalidatePath("/profile/notifications/setting");
  }
  return res;
}

/**
 * 키워드 알림 삭제 Action
 * - 알림 ID를 기반으로 삭제를 수행
 *
 * @param alertId - 삭제할 알림 ID
 */
export async function removeKeywordAction(
  alertId: number
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const res = await removeKeywordAlert(session.id, alertId);
  if (res.success) {
    revalidatePath("/products");
    revalidatePath("/profile/notifications/setting");
  }
  return res;
}
