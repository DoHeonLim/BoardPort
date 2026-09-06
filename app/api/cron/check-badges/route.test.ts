/**
 * File Name : app/api/cron/check-badges/route.test.ts
 * Description : 뱃지 cron 인증 fail-closed 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   누락 secret·운영 query secret·Bearer 인증 경계 검증
 * 2026.08.26  임도헌   Modified  인증 성공 뒤 moderation·stream webhook outbox 배치 실행 검증 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCronSecret: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  processModerationOutbox: vi.fn(),
  processStreamWebhookOutbox: vi.fn(),
  processStreamWebhookInbox: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getCronSecret: mocks.getCronSecret }));
vi.mock("@/lib/db", () => ({
  default: {
    user: { findMany: mocks.findMany, updateMany: mocks.updateMany },
  },
}));
vi.mock("@/features/user/service/badge", () => ({
  checkBoardExplorerBadge: vi.fn(),
  checkPortFestivalBadge: vi.fn(),
}));
vi.mock("@/features/report/service/moderationOutbox", () => ({
  processModerationOutboxBatch: mocks.processModerationOutbox,
}));
vi.mock("@/features/stream/service/webhookOutbox", () => ({
  processStreamWebhookOutboxBatch: mocks.processStreamWebhookOutbox,
}));
vi.mock("@/features/stream/service/webhookProcessor", () => ({
  processCloudflareWebhookInboxBatch: mocks.processStreamWebhookInbox,
}));

describe("GET /api/cron/check-badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCronSecret.mockReturnValue("cron-secret-value");
    mocks.findMany.mockResolvedValue([]);
    mocks.processModerationOutbox.mockResolvedValue({
      claimed: 0,
      completed: 0,
      failed: 0,
    });
    mocks.processStreamWebhookOutbox.mockResolvedValue({
      claimed: 0,
      completed: 0,
      failed: 0,
    });
    mocks.processStreamWebhookInbox.mockResolvedValue({
      claimed: 0,
      completed: 0,
      failed: 0,
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("CRON_SECRET 검증 실패 시 503으로 닫힌다", async () => {
    mocks.getCronSecret.mockImplementation(() => {
      throw new Error("missing");
    });
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("https://boardport.example/api/cron/check-badges")
    );
    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("production에서는 query-string secret을 허용하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "https://boardport.example/api/cron/check-badges?secret=cron-secret-value"
      )
    );
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("Bearer secret이 일치하면 cron 처리를 허용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("https://boardport.example/api/cron/check-badges", {
        headers: { authorization: "Bearer cron-secret-value" },
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mocks.processModerationOutbox).toHaveBeenCalledWith(30);
    expect(mocks.processStreamWebhookInbox).toHaveBeenCalledWith(10);
    expect(mocks.processStreamWebhookOutbox).toHaveBeenCalledWith(10);
  });
});
