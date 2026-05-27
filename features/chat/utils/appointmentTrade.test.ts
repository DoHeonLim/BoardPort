/**
 * File Name : features/chat/utils/appointmentTrade.test.ts
 * Description : 약속 제안/수락 전 상태 가드와 거래 참여자 산정 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   약속 시간/거래 상태/참여자 산정 순수 유틸 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  getAppointmentAcceptanceGuardError,
  getAppointmentProposalTimeError,
  getProductTradeAvailabilityError,
  resolveAppointmentReceiverId,
  resolveAppointmentTradeParties,
} from "./appointmentTrade";

describe("appointment proposal guard", () => {
  const now = new Date("2026-05-25T10:00:00.000Z");

  it("유효하지 않은 약속 시간을 거부한다", () => {
    expect(
      getAppointmentProposalTimeError({
        meetDate: new Date("invalid-date"),
        now,
      })
    ).toBe("유효하지 않은 날짜 형식입니다.");
  });

  it("유예 시간을 벗어난 과거 약속 시간을 거부한다", () => {
    expect(
      getAppointmentProposalTimeError({
        meetDate: new Date("2026-05-25T09:54:59.000Z"),
        now,
      })
    ).toBe("과거 시간으로는 약속을 제안할 수 없습니다.");
  });

  it("네트워크 지연을 고려해 짧은 과거 시간은 허용한다", () => {
    expect(
      getAppointmentProposalTimeError({
        meetDate: new Date("2026-05-25T09:56:00.000Z"),
        now,
      })
    ).toBeNull();
  });

  it("이미 예약 또는 판매된 상품에는 약속을 제안하지 않는다", () => {
    expect(
      getProductTradeAvailabilityError({
        purchaseUserId: null,
        reservationUserId: 2,
      })
    ).toBe("이미 거래가 진행 중인 상품입니다.");

    expect(
      getProductTradeAvailabilityError({
        purchaseUserId: 3,
        reservationUserId: null,
      })
    ).toBe("이미 거래가 진행 중인 상품입니다.");
  });

  it("거래 중이 아닌 상품은 약속 제안을 허용한다", () => {
    expect(
      getProductTradeAvailabilityError({
        purchaseUserId: null,
        reservationUserId: null,
      })
    ).toBeNull();
  });

  it("채팅방 참여자 중 제안자 반대편 사용자를 수신자로 선택한다", () => {
    expect(resolveAppointmentReceiverId([1, 2], 1)).toBe(2);
  });

  it("제안자 외 참여자가 없으면 수신자를 찾지 못한다", () => {
    expect(resolveAppointmentReceiverId([1], 1)).toBeNull();
  });
});

describe("appointment trade guard", () => {
  const future = new Date("2026-06-01T10:00:00.000Z");
  const now = new Date("2026-05-25T10:00:00.000Z");

  it("수신자가 아닌 사용자의 약속 수락을 거부한다", () => {
    expect(
      getAppointmentAcceptanceGuardError({
        requesterId: 3,
        proposerId: 1,
        receiverId: 2,
        roomUserIds: [1, 2],
        status: "PENDING",
        meetDate: future,
        now,
      })
    ).toBe("수락 권한이 없습니다.");
  });

  it("이미 처리된 약속은 다시 수락할 수 없다", () => {
    expect(
      getAppointmentAcceptanceGuardError({
        requesterId: 2,
        proposerId: 1,
        receiverId: 2,
        roomUserIds: [1, 2],
        status: "ACCEPTED",
        meetDate: future,
        now,
      })
    ).toBe("이미 처리된 약속입니다.");
  });

  it("채팅방을 나간 참여자가 있으면 약속을 진행하지 않는다", () => {
    expect(
      getAppointmentAcceptanceGuardError({
        requesterId: 2,
        proposerId: 1,
        receiverId: 2,
        roomUserIds: [2],
        status: "PENDING",
        meetDate: future,
        now,
      })
    ).toBe("대화 참여자 중 일부가 채팅방을 나가 약속을 진행할 수 없습니다.");
  });

  it("약속 시간이 지난 경우 수락을 거부한다", () => {
    expect(
      getAppointmentAcceptanceGuardError({
        requesterId: 2,
        proposerId: 1,
        receiverId: 2,
        roomUserIds: [1, 2],
        status: "PENDING",
        meetDate: new Date("2026-05-24T10:00:00.000Z"),
        now,
      })
    ).toBe("약속 시간이 이미 지났습니다.");
  });

  it("권한과 상태 조건을 만족하면 수락 전 가드를 통과한다", () => {
    expect(
      getAppointmentAcceptanceGuardError({
        requesterId: 2,
        proposerId: 1,
        receiverId: 2,
        roomUserIds: [1, 2],
        status: "PENDING",
        meetDate: future,
        now,
      })
    ).toBeNull();
  });
});

describe("resolveAppointmentTradeParties", () => {
  it("판매자가 약속을 제안한 경우 수신자를 구매자로 본다", () => {
    expect(
      resolveAppointmentTradeParties({
        sellerId: 1,
        proposerId: 1,
        receiverId: 2,
      })
    ).toEqual({ sellerId: 1, buyerId: 2 });
  });

  it("구매자가 약속을 제안한 경우 제안자를 구매자로 본다", () => {
    expect(
      resolveAppointmentTradeParties({
        sellerId: 1,
        proposerId: 2,
        receiverId: 1,
      })
    ).toEqual({ sellerId: 1, buyerId: 2 });
  });

  it("구매자와 판매자가 같아지는 비정상 거래는 null로 반환한다", () => {
    expect(
      resolveAppointmentTradeParties({
        sellerId: 1,
        proposerId: 1,
        receiverId: 1,
      })
    ).toBeNull();
  });
});
