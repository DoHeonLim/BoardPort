/**
 * File Name : features/chat/utils/appointmentDate.test.ts
 * Description : 한국 약속 시각 포맷 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   UTC 입력의 한국 시각 변환과 잘못된 입력 fallback 검증
 */

import { describe, expect, it } from "vitest";
import { formatKoreanAppointmentDate } from "./appointmentDate";

describe("formatKoreanAppointmentDate", () => {
  it("UTC 시각을 한국 날짜와 오전·오후 표기로 변환한다", () => {
    expect(formatKoreanAppointmentDate("2026-09-03T02:24:00.000Z")).toBe(
      "9월 3일 (목) 오전 11:24"
    );
    expect(formatKoreanAppointmentDate("2026-09-03T15:05:00.000Z")).toBe(
      "9월 4일 (금) 오전 12:05"
    );
  });

  it("잘못된 시각은 안전한 대체 문구를 반환한다", () => {
    expect(formatKoreanAppointmentDate("invalid-date")).toBe("일시 미정");
  });
});
