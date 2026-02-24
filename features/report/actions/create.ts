/**
 * File Name : features/report/actions/create.ts
 * Description : 신고 접수 Server Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   접수 액션 구현
 */
"use server";

import getSession from "@/lib/session";
import { createReport } from "@/features/report/service/create";
import {
  createReportSchema,
  type CreateReportDTO,
} from "@/features/report/schemas";
import { REPORT_ERRORS } from "@/features/report/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 사용자 신고 접수 Action
 * - 로그인 세션을 확인하고 입력값을 검증
 * - Service 계층을 호출하여 신고 레코드 생성
 *
 * @param data - 신고 대상 및 사유 데이터
 * @returns {Promise<ServiceResult>} 접수 결과
 */
export async function submitReportAction(
  data: CreateReportDTO
): Promise<ServiceResult> {
  const session = await getSession();

  if (!session?.id) {
    return { success: false, error: REPORT_ERRORS.NOT_LOGGED_IN };
  }

  // Zod 유효성 검사
  const parsed = createReportSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  return await createReport(session.id, parsed.data);
}
