/**
 * File Name : features/chat/utils/appointmentPicker.test.ts
 * Description : 약속 날짜·시간 선택 UI 계산 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   다음 10분 구간과 날짜 경계 검증 추가
 * 2026.09.09  임도헌   Modified  월별 날짜 계산 검증으로 변경
 */

import { describe, expect, it } from "vitest";
import {
  formatAppointmentDateValue,
  getAppointmentMonthDates,
  getNextAppointmentSlot,
} from "./appointmentPicker";

describe("appointment picker date calculations", () => {
  it("현재 시각 이후의 다음 10분 구간을 반환한다", () => {
    const result = getNextAppointmentSlot(new Date(2026, 8, 8, 11, 1, 25));

    expect(result).toEqual(new Date(2026, 8, 8, 11, 10, 0));
  });

  it("자정 경계에서는 다음 날짜의 첫 구간을 반환한다", () => {
    const result = getNextAppointmentSlot(new Date(2026, 8, 8, 23, 59, 59));

    expect(result).toEqual(new Date(2026, 8, 9, 0, 0, 0));
    expect(formatAppointmentDateValue(result)).toBe("2026-09-09");
  });

  it("선택한 월의 첫날부터 마지막 날까지 반환한다", () => {
    const dates = getAppointmentMonthDates(2026, 8);

    expect(dates).toHaveLength(30);
    expect(formatAppointmentDateValue(dates[0])).toBe("2026-09-01");
    expect(formatAppointmentDateValue(dates[29])).toBe("2026-09-30");
  });
});
