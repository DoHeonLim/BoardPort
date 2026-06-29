/**
 * File Name : features/stream/utils/webhookAuth.test.ts
 * Description : Cloudflare Webhook 인증 정책 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.25  임도헌   Created   production secret 누락 fail-closed 정책 테스트 추가
 */

import { describe, expect, it } from "vitest";
import { isMissingRequiredCloudflareWebhookSecret } from "./webhookAuth";

describe("isMissingRequiredCloudflareWebhookSecret", () => {
  it("production Stream webhook에서 HMAC secret이 없으면 누락으로 판단한다", () => {
    expect(
      isMissingRequiredCloudflareWebhookSecret({
        kind: "stream",
        streamSecret: "",
        destinationSecret: "destination-secret",
        nodeEnv: "production",
      })
    ).toBe(true);
  });

  it("production Destination webhook에서 destination secret이 없으면 누락으로 판단한다", () => {
    expect(
      isMissingRequiredCloudflareWebhookSecret({
        kind: "destination",
        streamSecret: "stream-secret",
        destinationSecret: "",
        nodeEnv: "production",
      })
    ).toBe(true);
  });

  it("secret이 설정되어 있거나 production이 아니면 누락으로 판단하지 않는다", () => {
    expect(
      isMissingRequiredCloudflareWebhookSecret({
        kind: "stream",
        streamSecret: "stream-secret",
        destinationSecret: "",
        nodeEnv: "production",
      })
    ).toBe(false);
    expect(
      isMissingRequiredCloudflareWebhookSecret({
        kind: "destination",
        streamSecret: "",
        destinationSecret: "",
        nodeEnv: "test",
      })
    ).toBe(false);
  });
});
