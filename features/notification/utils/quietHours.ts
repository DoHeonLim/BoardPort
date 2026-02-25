/**
 * File Name : features/notification/utils/quietHours.ts
 * Description : 알림 방해 금지 시간대 계산 유틸리티 (HH:mm 문자열 기반)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.03  임도헌   Created   방해 금지 시간대 파싱/계산 유틸 추가(자정 넘김 구간 포함)
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 */

export type QuietHoursConfig = {
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
};

/** "HH:mm" → 분 단위 (유효하지 않으면 null) */
function parseTimeToMinutes(str: string | null | undefined): number | null {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** now를 특정 타임존(KST 등) 기준으로 변환 후 "하루 경과 분" 리턴 */
function getLocalMinutes(now: Date, timeZone: string): number {
  const local = new Date(now.toLocaleString("en-US", { timeZone }));
  return local.getHours() * 60 + local.getMinutes();
}

/**
 * 주어진 HH:mm 구간(quietHoursStart~quietHoursEnd)에 now(기본: 현재 시각)가 포함되는지 여부
 * - 자정을 넘가는 시간대(예: 22:00 ~ 08:00)도 처리
 * - 같은 날 범위: 09:00 ~ 18:00 → start < end
 * - 자정 넘김: 22:00 ~ 08:00   → start > end
 * - start/end 둘 다 없거나 같으면 "방해 금지 없음"으로 간주
 * @param quietHoursStart - 시작 시간 (HH:mm)
 * @param quietHoursEnd - 종료 시간 (HH:mm)
 * @param now - 현재 시각
 * @param timeZone - 타임존
 * @returns 포함 여부(boolean)
 */
export function isWithinQuietHours(
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
  now: Date = new Date(),
  timeZone: string = "Asia/Seoul"
): boolean {
  const start = parseTimeToMinutes(quietHoursStart);
  const end = parseTimeToMinutes(quietHoursEnd);

  if (start == null || end == null || start === end) return false;

  const minutes = getLocalMinutes(now, timeZone);

  // 같은 날 범위 (예: 09:00 ~ 18:00)
  if (start < end) {
    return minutes >= start && minutes < end;
  }

  // 자정을 넘는 범위 (예: 22:00 ~ 08:00)
  // start > end 인 경우: start~24:00, 0:00~end 두 구간 포함
  return minutes >= start || minutes < end;
}
