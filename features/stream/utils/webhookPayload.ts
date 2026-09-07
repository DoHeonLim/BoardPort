/**
 * File Name : features/stream/utils/webhookPayload.ts
 * Description : Cloudflare Stream·Notifications webhook 페이로드 정규화
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   이벤트 종류·식별자·provider 시각·에셋 참조 추출 통합
 */
import crypto from "node:crypto";
import type { CloudflareStreamAssetPayload } from "@/features/stream/types";

/** Cloudflare status 필드에서 상태 문자열을 추출한다. */
export function getCloudflareStatusState(
  status: CloudflareStreamAssetPayload["status"]
): string | null {
  if (typeof status === "string") return status;
  if (
    status &&
    typeof status === "object" &&
    typeof status.state === "string"
  ) {
    return status.state;
  }
  return null;
}

/** 래핑 형식을 포함해 Cloudflare 이벤트 종류를 추출한다. */
export function getCloudflareEventType(
  body: CloudflareStreamAssetPayload
): string {
  return (
    body.type ||
    body.event ||
    body.event_type ||
    body.result?.type ||
    body.data?.type ||
    body.data?.event_type ||
    "unknown"
  );
}

/** 래핑 형식을 포함해 Cloudflare video UID를 추출한다. */
export function getCloudflareAssetUid(
  body: CloudflareStreamAssetPayload
): string | null {
  if (typeof body.uid === "string") return body.uid;
  if (typeof body.data?.uid === "string") return body.data.uid;
  if (typeof body.result?.uid === "string") return body.result.uid;
  return null;
}

/** 래핑 형식을 포함해 Cloudflare Live Input UID를 추출한다. */
export function getCloudflareLiveInputUid(
  body: CloudflareStreamAssetPayload
): string | null {
  const input =
    body.liveInput ?? body.input ?? body.data?.liveInput ?? body.data?.input;
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && typeof input.uid === "string") {
    return input.uid;
  }
  if (typeof body.input_id === "string") return body.input_id;
  if (typeof body.data?.input_id === "string") return body.data.input_id;
  return null;
}

/** Cloudflare 에셋 meta 객체를 추출한다. */
export function getCloudflareAssetMeta(
  body: CloudflareStreamAssetPayload
): Record<string, unknown> {
  const source = body.data ?? body.result ?? body;
  if (source.meta && typeof source.meta === "object") return source.meta;
  if (body.meta && typeof body.meta === "object") return body.meta;
  return {};
}

/** 게시글 direct upload에서 생성된 에셋인지 확인한다. */
export function isPostVideoWebhookPayload(
  body: CloudflareStreamAssetPayload
): boolean {
  return getCloudflareAssetMeta(body).sourceType === "POST_VIDEO";
}

/** ready 상태와 재생 정보를 모두 가진 video.ready 형태인지 확인한다. */
export function isCloudflareAssetReady(
  body: CloudflareStreamAssetPayload
): boolean {
  const source = body.data ?? body.result ?? body;
  const state = getCloudflareStatusState(source.status);
  const ready = source.readyToStream === true || state === "ready";
  const hasPlayback =
    !!source.playback &&
    (Boolean(source.playback.hls) || Boolean(source.playback.dash));
  return Boolean(ready && hasPlayback && getCloudflareAssetUid(body));
}

/** error terminal 상태와 video UID가 있는 페이로드인지 확인한다. */
export function isCloudflareAssetError(
  body: CloudflareStreamAssetPayload
): boolean {
  const source = body.data ?? body.result ?? body;
  return (
    getCloudflareStatusState(source.status) === "error" &&
    Boolean(getCloudflareAssetUid(body))
  );
}

/** 유효한 ISO/epoch 값을 Date로 변환한다. */
function toValidDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 상태 순서 비교에 사용할 Cloudflare provider 이벤트 시각을 추출한다. */
export function getCloudflareEventAt(
  body: CloudflareStreamAssetPayload,
  fallback: Date = new Date()
): Date {
  const source = body.data ?? body.result ?? body;
  return (
    toValidDate(source.updated_at) ??
    toValidDate(source.modified) ??
    toValidDate(source.readyToStreamAt) ??
    toValidDate(body.ts) ??
    toValidDate(source.created) ??
    fallback
  );
}

/** 녹화 세션 매칭에 사용할 에셋 생성 시각을 추출한다. */
export function getCloudflareAssetCreatedAt(
  body: CloudflareStreamAssetPayload
): Date | null {
  const source = body.data ?? body.result ?? body;
  return toValidDate(source.created);
}

/** Notifications correlation 정보가 있으면 진단용 provider 이벤트 ID로 조합한다. */
export function getCloudflareProviderEventId(
  body: CloudflareStreamAssetPayload
): string | null {
  if (!body.alert_correlation_id) return null;
  return [body.alert_correlation_id, body.alert_event, body.ts]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(":");
}

/** source와 raw body를 함께 해시해 동일 delivery의 중복 처리 키를 만든다. */
export function createCloudflarePayloadHash(
  source: "STREAM" | "DESTINATION",
  rawBody: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${source}:${rawBody}`)
    .digest("hex");
}
