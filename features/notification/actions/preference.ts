/**
 * File Name : features/notification/actions/preference.ts
 * Description : 알림 설정 업데이트 Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   NotificationPreferences 업데이트 액션 추가
 * 2025.12.21  임도헌   Modified  pushEnabled는 푸시 토글(subscribe/unsubscribe)에서만 관리,
 *                                본 액션에서는 알림 종류/방해금지 시간만 저장하도록 정리
 * 2025.12.28  임도헌   Modified  preferences 레코드가 없을 때도 안전하도록 upsert로 변경
 * 2026.01.23  임도헌   Modified  Service(updatePreferences) 호출로 변경
 * 2026.01.30  임도헌   Renamed   features/notification/actions.ts -> features/notification/actions/preference.ts
 * 2026.03.07  임도헌   Modified  액션 실패 문구를 사용자 친화적으로 구체화(v1.2)
 */
"use server";

import getSession from "@/lib/session";
import { updatePreferences } from "@/features/notification/service/preference";

type ActionResult = {
  ok: boolean;
  error?: string;
};

/**
 * 알림 설정(종류/시간대) 업데이트 Action
 *
 * 1. 로그인 확인
 * 2. 폼 데이터 파싱 (체크박스 -> boolean, 시간 -> string | null)
 * 3. Service 호출 (DB upsert)
 *
 * @param _prevState - 이전 폼 상태
 * @param formData - 설정 폼 데이터
 * @returns 처리 결과
 */
export async function updateNotificationPreferences(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session.id) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const toBool = (name: string) => formData.get(name) === "on";

    const data = {
      chat: toBool("chat"),
      trade: toBool("trade"),
      review: toBool("review"),
      badge: toBool("badge"),
      stream: toBool("stream"),
      system: toBool("system"),
      keyword: toBool("Keyword"),
      quietHoursStart: (formData.get("quietHoursStart") as string) || null,
      quietHoursEnd: (formData.get("quietHoursEnd") as string) || null,
    };

    await updatePreferences(session.id, data);

    return { ok: true };
  } catch (e) {
    console.error("[notifications] update failed:", e);
    return {
      ok: false,
      error:
        "알림 설정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
