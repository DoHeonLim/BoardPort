/**
 * File Name : features/notification/utils/policy.test.ts
 * Description : 알림 타입/Push 전송 정책 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   타입별 알림 설정, pushEnabled, quiet hours 정책 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import type { NotificationPreferencesLike } from "@/features/notification/types";

describe("isNotificationTypeEnabled", () => {
  it("설정이 없으면 앱 내 알림 생성을 허용한다", () => {
    expect(isNotificationTypeEnabled(null, "CHAT")).toBe(true);
    expect(isNotificationTypeEnabled(undefined, "TRADE")).toBe(true);
  });

  it("타입별 설정이 false인 알림만 차단한다", () => {
    const prefs: NotificationPreferencesLike = {
      chat: false,
      trade: true,
    };

    expect(isNotificationTypeEnabled(prefs, "CHAT")).toBe(false);
    expect(isNotificationTypeEnabled(prefs, "TRADE")).toBe(true);
  });

  it("pushEnabled=false는 앱 내 알림 생성 여부에 영향을 주지 않는다", () => {
    const prefs: NotificationPreferencesLike = {
      chat: true,
      pushEnabled: false,
    };

    // pushEnabled는 브라우저 Push 전송만 차단, DB/In-App 알림 생성은 타입 토글 기준
    expect(isNotificationTypeEnabled(prefs, "CHAT")).toBe(true);
  });
});

describe("canSendPushForType", () => {
  it("타입별 설정이 꺼져 있으면 Push도 차단한다", () => {
    const prefs: NotificationPreferencesLike = {
      trade: false,
      pushEnabled: true,
    };

    expect(canSendPushForType(prefs, "TRADE")).toBe(false);
  });

  it("pushEnabled=false면 Push만 차단한다", () => {
    const prefs: NotificationPreferencesLike = {
      chat: true,
      pushEnabled: false,
    };

    expect(canSendPushForType(prefs, "CHAT")).toBe(false);
    expect(isNotificationTypeEnabled(prefs, "CHAT")).toBe(true);
  });

  it("방해 금지 시간 안이면 Push를 차단한다", () => {
    const prefs: NotificationPreferencesLike = {
      chat: true,
      pushEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    };
    const now = new Date("2026-05-24T23:00:00.000Z");

    expect(canSendPushForType(prefs, "CHAT", now, "UTC")).toBe(false);
  });

  it("방해 금지 시간 밖이면 Push를 허용한다", () => {
    const prefs: NotificationPreferencesLike = {
      chat: true,
      pushEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    };
    const now = new Date("2026-05-24T12:00:00.000Z");

    expect(canSendPushForType(prefs, "CHAT", now, "UTC")).toBe(true);
  });
});
