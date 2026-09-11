/**
 * File Name : features/chat/components/AppointmentDateTimePicker.test.tsx
 * Description : 거래 약속용 커스텀 날짜·시간 선택 UI 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   월 이동과 과거 제한 및 날짜·시간 선택 흐름 검증 추가
 */

// @vitest-environment jsdom

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppointmentDateTimePicker from "./AppointmentDateTimePicker";

function PickerHarness() {
  const [date, setDate] = useState("2026-09-09");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  return (
    <AppointmentDateTimePicker
      date={date}
      hour={hour}
      minute={minute}
      minimumDateTime={new Date(2026, 8, 9, 14, 20)}
      onDateChange={setDate}
      onHourChange={setHour}
      onMinuteChange={setMinute}
    />
  );
}

describe("AppointmentDateTimePicker", () => {
  it("지난 날짜를 막고 연도 경계를 넘어 다음 달을 탐색한다", () => {
    render(<PickerHarness />);

    expect(screen.getByText("2026년 9월")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 달" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "2026년 9월 8일 화요일" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "2026년 9월 9일 수요일" })
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));

    expect(screen.getByText("2026년 10월")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2026년 10월 1일 목요일" })
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "이전 달" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));

    expect(screen.getByText("2026년 12월")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(screen.getByText("2027년 1월")).toBeInTheDocument();
  });

  it("연·월 제목에서 연도와 월을 직접 선택한다", () => {
    render(<PickerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "2026년 9월" }));

    expect(screen.getByRole("button", { name: "이전 해" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다음 해" }));
    expect(screen.getByText("2027년")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3월" }));

    expect(
      screen.getByRole("button", { name: "2027년 3월" })
    ).toBeInTheDocument();
  });

  it("날짜 선택 후 미래 시간만 선택하고 결과를 안내한다", () => {
    render(<PickerHarness />);

    fireEvent.click(
      screen.getByRole("button", { name: "2026년 9월 9일 수요일" })
    );

    expect(screen.getByRole("button", { name: "오전" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "오후 3시" }));
    fireEvent.click(screen.getByRole("button", { name: "20분" }));

    expect(screen.getByText("9월 9일 · 오후 3:20")).toBeInTheDocument();
    expect(document.querySelector("input, select")).toBeNull();
  });

  it("Shift+휠 방향 전환을 날짜 목록의 양방향 이동으로 반영한다", () => {
    render(<PickerHarness />);
    const dateScroller = screen.getByLabelText("약속 날짜 선택");
    dateScroller.scrollLeft = 100;

    fireEvent.wheel(dateScroller, { shiftKey: true, deltaY: 40 });
    expect(dateScroller.scrollLeft).toBe(140);

    fireEvent.wheel(dateScroller, { shiftKey: true, deltaY: -30 });
    expect(dateScroller.scrollLeft).toBe(110);
  });
});
