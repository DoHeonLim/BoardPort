/**
 * File Name : features/chat/utils/appointmentPicker.ts
 * Description : 약속 날짜·시간 선택 UI 계산 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   10분 단위 다음 약속 시각과 날짜 계산 추가
 * 2026.09.09  임도헌   Modified  주간 계산을 현재 연도 내 월별 날짜 계산으로 변경
 */

export const APPOINTMENT_MINUTE_INTERVAL = 10;

/** 현재 시각 이후의 가장 가까운 10분 단위 약속 시각을 반환한다. */
export function getNextAppointmentSlot(now: Date) {
  const nextSlot = new Date(now);
  nextSlot.setSeconds(0, 0);
  nextSlot.setMinutes(
    Math.floor(nextSlot.getMinutes() / APPOINTMENT_MINUTE_INTERVAL) *
      APPOINTMENT_MINUTE_INTERVAL +
      APPOINTMENT_MINUTE_INTERVAL
  );

  return nextSlot;
}

/** 로컬 날짜를 date value와 같은 YYYY-MM-DD 형식으로 반환한다. */
export function formatAppointmentDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** 주어진 연도와 월에 속한 날짜를 모두 반환한다. */
export function getAppointmentMonthDates(year: number, month: number) {
  const lastDate = new Date(year, month + 1, 0).getDate();

  return Array.from(
    { length: lastDate },
    (_, index) => new Date(year, month, index + 1)
  );
}
