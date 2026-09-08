/**
 * File Name : features/notification/utils/subscription.test.ts
 * Description : Web Push 구독 payload 경계 검증 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   endpoint/소유 키 수용과 거부 경계 추가
 */

import { describe, expect, it } from "vitest";
import { PUSH_DISPLAY_GUARD_VERSION } from "./pushDisplayGuard";
import {
  parseGuardedPushSubscriptionDTO,
  parsePushSubscriptionDTO,
} from "./subscription";

const validPayload = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-token?version=1",
  keys: {
    p256dh:
      "BAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
    auth: "AgICAgICAgICAgICAgICAg",
  },
};

describe("parsePushSubscriptionDTO", () => {
  it("HTTPS endpoint와 올바른 Web Push 키 길이를 수용한다", () => {
    expect(parsePushSubscriptionDTO(validPayload)).toEqual(validPayload);
  });

  it.each([
    "https://fcm.googleapis.com/fcm/send/device-token",
    "https://updates.push.services.mozilla.com/wpush/v2/device-token",
    "https://web.push.apple.com/Q-device-token",
    "https://wns2-sg2p.notify.windows.com/w/?token=device-token",
  ])("지원 브라우저 Push 제공자 endpoint를 수용한다: %s", (endpoint) => {
    expect(parsePushSubscriptionDTO({ ...validPayload, endpoint })).toEqual({
      ...validPayload,
      endpoint,
    });
  });

  it.each([
    "http://push.example.test/device-token",
    "https://user:password@push.example.test/device-token",
    "https://push.example.test/device-token",
    "https://127.0.0.1/device-token",
    "https://[::1]/device-token",
    "https://fcm.googleapis.com.evil.example/device-token",
    "https://fcm.googleapis.com:444/device-token",
    "https://fcm.googleapis.com/device-token#fragment",
    "not-a-url",
    `https://fcm.googleapis.com/${"a".repeat(4096)}`,
  ])("안전하지 않거나 잘못된 endpoint를 거부한다: %s", (endpoint) => {
    expect(parsePushSubscriptionDTO({ ...validPayload, endpoint })).toBeNull();
  });

  it.each([
    undefined,
    null,
    {},
    { p256dh: "", auth: "auth_key-123" },
    { p256dh: "invalid+base64", auth: "auth_key-123" },
    { p256dh: "valid_key", auth: "invalid/base64" },
    { p256dh: "a".repeat(513), auth: "auth_key-123" },
    { p256dh: "valid_key", auth: "a".repeat(513) },
    { p256dh: "AQ", auth: validPayload.keys.auth },
    { p256dh: validPayload.keys.p256dh, auth: "AQ" },
  ])("누락되거나 잘못된 소유 키를 거부한다", (keys) => {
    expect(parsePushSubscriptionDTO({ ...validPayload, keys })).toBeNull();
  });

  it("표시 보호 Worker 버전이 확인된 API payload만 구독 등록에 허용한다", () => {
    expect(
      parseGuardedPushSubscriptionDTO({
        ...validPayload,
        displayGuardVersion: PUSH_DISPLAY_GUARD_VERSION,
      })
    ).toEqual(validPayload);
    expect(parseGuardedPushSubscriptionDTO(validPayload)).toBeNull();
    expect(
      parseGuardedPushSubscriptionDTO({
        ...validPayload,
        displayGuardVersion: 0,
      })
    ).toBeNull();
  });
});
