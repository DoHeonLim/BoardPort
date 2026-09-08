/**
 * File Name : features/stream/utils/webhookPayload.test.ts
 * Description : Cloudflare webhook 페이로드 정규화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   래핑별 식별자·provider 시각·원문 해시 경계 검증
 */
import { describe, expect, it } from "vitest";
import {
  createCloudflarePayloadHash,
  getCloudflareAssetCreatedAt,
  getCloudflareAssetUid,
  getCloudflareEventAt,
  getCloudflareEventType,
  getCloudflareLiveInputUid,
  isCloudflareAssetReady,
  isPostVideoWebhookPayload,
} from "@/features/stream/utils/webhookPayload";

describe("Cloudflare webhook payload normalization", () => {
  it("Notifications 래퍼에서 이벤트 종류·Live Input·provider 시각을 추출한다", () => {
    const body = {
      alert_correlation_id: "correlation-1",
      alert_event: "live_input.connected",
      ts: 1_787_702_400,
      data: {
        event_type: "live_input.connected",
        input_id: "live-input-1",
      },
    };

    expect(getCloudflareEventType(body)).toBe("live_input.connected");
    expect(getCloudflareLiveInputUid(body)).toBe("live-input-1");
    expect(getCloudflareEventAt(body).toISOString()).toBe(
      "2026-08-26T00:00:00.000Z"
    );
    expect(getCloudflareLiveInputUid({ input_id: "root-input-1" })).toBe(
      "root-input-1"
    );
  });

  it("result 래퍼의 READY 게시글 동영상과 생성 시각을 판별한다", () => {
    const body = {
      result: {
        uid: "video-1",
        created: "2026-08-26T01:00:00.000Z",
        readyToStream: true,
        status: { state: "ready" },
        playback: { hls: "https://example.com/video.m3u8" },
        meta: { sourceType: "POST_VIDEO", draftKey: "draft-1" },
      },
    };

    expect(getCloudflareAssetUid(body)).toBe("video-1");
    expect(getCloudflareAssetCreatedAt(body)?.toISOString()).toBe(
      "2026-08-26T01:00:00.000Z"
    );
    expect(isCloudflareAssetReady(body)).toBe(true);
    expect(isPostVideoWebhookPayload(body)).toBe(true);
    expect(
      isCloudflareAssetReady({
        uid: "video-without-playback",
        readyToStream: true,
        playback: {},
      })
    ).toBe(false);
  });

  it("source와 raw body가 모두 같을 때만 동일 payload hash를 만든다", () => {
    const raw = '{"type":"video.ready","uid":"video-1"}';
    const streamHash = createCloudflarePayloadHash("STREAM", raw);

    expect(createCloudflarePayloadHash("STREAM", raw)).toBe(streamHash);
    expect(createCloudflarePayloadHash("DESTINATION", raw)).not.toBe(
      streamHash
    );
    expect(createCloudflarePayloadHash("STREAM", `${raw}\n`)).not.toBe(
      streamHash
    );
  });
});
