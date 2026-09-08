/**
 * File Name : features/chat/utils/appointmentDate.ts
 * Description : 채팅 약속 시각의 한국 시간대 표시 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   서버와 브라우저의 실행 시간대와 무관한 약속 시각 포맷 추가
 */

const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;
const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 서버와 브라우저의 기본 시간대에 영향받지 않는 한국 약속 시각을 반환한다. */
export function formatKoreanAppointmentDate(dateInput: Date | string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "일시 미정";

  // 한국은 UTC+9 고정 시간대이므로 이동한 뒤 UTC getter로 동일한 값을 읽는다.
  const koreaDate = new Date(date.getTime() + KOREA_UTC_OFFSET_MS);
  const hour = koreaDate.getUTCHours();
  const displayHour = hour % 12 || 12;
  const minute = String(koreaDate.getUTCMinutes()).padStart(2, "0");

  return `${koreaDate.getUTCMonth() + 1}월 ${koreaDate.getUTCDate()}일 (${KOREAN_WEEKDAYS[koreaDate.getUTCDay()]}) ${hour < 12 ? "오전" : "오후"} ${displayHour}:${minute}`;
}
