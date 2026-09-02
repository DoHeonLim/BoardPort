/**
 * File Name : features/stream/service/webhookProcessor.ts
 * Description : Cloudflare webhook inbox 선점과 순서 보장 DB 상태 전이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   payload 중복 방지, provider 시각 조건부 갱신, 세션별 VOD 연결 추가
 * 2026.08.26  임도헌   Modified  중단 inbox cron 복구와 recording·connected 시작 시각 허용치 추가
 * 2026.09.02  임도헌   Modified  처음 수신한 webhook을 저장과 동시에 선점해 DB와 애플리케이션의 시각 경합 제거
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { CloudflareStreamAssetPayload } from "@/features/stream/types";
import {
  enqueueStreamWebhookOutboxJobs,
  type StreamWebhookOutboxJob,
} from "@/features/stream/service/webhookOutbox";
import {
  getCloudflareAssetCreatedAt,
  getCloudflareAssetMeta,
  getCloudflareLiveInputUid,
  isCloudflareAssetError,
  isCloudflareAssetReady,
  isPostVideoWebhookPayload,
} from "@/features/stream/utils/webhookPayload";

const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
// video record 생성과 connected 알림 시각의 수 초 차이를 흡수하되 인접 세션 오매칭은 제한한다.
const RECORDING_START_SKEW_MS = 60 * 1000;

export interface CloudflareWebhookInput {
  source: "STREAM" | "DESTINATION";
  eventType: string;
  providerEventId: string | null;
  payloadHash: string;
  body: CloudflareStreamAssetPayload;
  liveInputUid: string | null;
  assetUid: string | null;
  eventAt: Date;
}

export type CloudflareWebhookClaim =
  | { claimed: true; eventId: number }
  | {
      claimed: false;
      eventId: number;
      status: "PROCESSED" | "IGNORED" | "PROCESSING";
    };

/** 저장된 JSON이 Cloudflare payload object인지 확인한다. */
function toCloudflarePayload(
  payload: Prisma.JsonValue
): CloudflareStreamAssetPayload {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error("유효하지 않은 Cloudflare webhook payload입니다.");
  }
  return payload as CloudflareStreamAssetPayload;
}

/**
 * 인증된 webhook 요청을 원문 해시 기준으로 한 번만 선점한다.
 * - 처음 수신한 요청은 DB 저장에 성공한 처리자가 즉시 처리권을 확보한다.
 * - 동일 요청이 재전송되면 기존 완료 상태를 재사용하거나 재시도 가능 시각이 지난 작업만 다시 선점한다.
 * - 처음 저장한 행의 DB 기본 시각과 요청 시작 시각을 비교하지 않아 분산 서버 간 시각 경합을 방지한다.
 */
export async function claimCloudflareWebhookEvent(
  input: CloudflareWebhookInput,
  now: Date = new Date()
): Promise<CloudflareWebhookClaim> {
  let event: { id: number; status: string; updated_at: Date };
  let created = false;

  try {
    event = await db.cloudflareWebhookEvent.create({
      data: {
        source: input.source,
        eventType: input.eventType,
        providerEventId: input.providerEventId,
        payloadHash: input.payloadHash,
        payload: input.body as Prisma.InputJsonValue,
        liveInputUid: input.liveInputUid,
        assetUid: input.assetUid,
        eventAt: input.eventAt,
        // unique insert에 성공한 요청이 최초 처리자이므로 DB 기본 시각과
        // 요청 시작 시각을 다시 비교하지 않고 생성과 동시에 선점한다.
        status: "PROCESSING",
        attempts: 1,
        available_at: now,
      },
      select: { id: true, status: true, updated_at: true },
    });
    created = true;
  } catch (error) {
    if (!(
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )) {
      throw error;
    }
    const duplicate = await db.cloudflareWebhookEvent.findUnique({
      where: { payloadHash: input.payloadHash },
      select: { id: true, status: true, updated_at: true },
    });
    if (!duplicate) throw error;
    event = duplicate;
  }

  if (created) {
    return { claimed: true, eventId: event.id };
  }

  if (event.status === "PROCESSED" || event.status === "IGNORED") {
    return { claimed: false, eventId: event.id, status: event.status };
  }

  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const claimed = await db.cloudflareWebhookEvent.updateMany({
    where: {
      id: event.id,
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, available_at: { lte: now } },
        { status: "PROCESSING", updated_at: { lt: staleBefore } },
      ],
    },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
  });

  return claimed.count === 1
    ? { claimed: true, eventId: event.id }
    : { claimed: false, eventId: event.id, status: "PROCESSING" };
}

/** 처리 실패를 inbox에 기록해 Cloudflare 재전송 또는 운영 batch가 다시 선점하게 한다. */
export async function failCloudflareWebhookEvent(
  eventId: number,
  error: unknown
): Promise<void> {
  await db.cloudflareWebhookEvent.update({
    where: { id: eventId },
    data: {
      status: "FAILED",
      available_at: new Date(),
      lastError:
        error instanceof Error ? error.message.slice(0, 1000) : "Unknown error",
    },
  });
}

/** inbox를 terminal 상태로 마감한다. transaction 내부에서만 호출한다. */
async function finishEvent(
  tx: Prisma.TransactionClient,
  eventId: number,
  status: "PROCESSED" | "IGNORED"
): Promise<void> {
  await tx.cloudflareWebhookEvent.update({
    where: { id: eventId },
    data: { status, processed_at: new Date(), lastError: null },
  });
}

/** transaction을 열 필요가 없는 사전 조건 실패 이벤트를 IGNORED로 마감한다. */
async function ignoreEvent(eventId: number): Promise<"IGNORED"> {
  await db.cloudflareWebhookEvent.update({
    where: { id: eventId },
    data: { status: "IGNORED", processed_at: new Date(), lastError: null },
  });
  return "IGNORED";
}

/** Live Input 연결 이벤트를 provider 시각이 최신일 때만 현재 방송 세션에 반영한다. */
async function processConnected(
  eventId: number,
  input: CloudflareWebhookInput
): Promise<"PROCESSED" | "IGNORED"> {
  if (!input.liveInputUid) return ignoreEvent(eventId);

  return db.$transaction(async (tx) => {
    const liveInput = await tx.liveInput.findUnique({
      where: { provider_uid: input.liveInputUid! },
      select: { id: true, userId: true },
    });
    if (!liveInput) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const broadcast = await tx.broadcast.findFirst({
      where: {
        liveInputId: liveInput.id,
        created_at: { lte: input.eventAt },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        started_at: true,
        providerSessionStartedAt: true,
      },
    });
    if (!broadcast) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const updated = await tx.broadcast.updateMany({
      where: {
        id: broadcast.id,
        OR: [
          { lastProviderEventAt: null },
          { lastProviderEventAt: { lt: input.eventAt } },
        ],
      },
      data: {
        status: "CONNECTED",
        started_at: broadcast.started_at ?? input.eventAt,
        ended_at: null,
        providerSessionStartedAt:
          broadcast.providerSessionStartedAt ?? input.eventAt,
        providerSessionEndedAt: null,
        lastProviderEventAt: input.eventAt,
      },
    });
    if (updated.count === 0) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const prefix = `stream-webhook:${eventId}`;
    const jobs: StreamWebhookOutboxJob[] = [
      {
        dedupeKey: `${prefix}:realtime`,
        kind: "BROADCAST_REALTIME",
        payload: { broadcastId: broadcast.id },
      },
      {
        dedupeKey: `${prefix}:cache`,
        kind: "REVALIDATE_BROADCAST",
        payload: { broadcastId: broadcast.id },
      },
    ];
    if (!broadcast.thumbnail) {
      jobs.push({
        dedupeKey: `${prefix}:thumbnail`,
        kind: "FILL_BROADCAST_THUMBNAIL",
        payload: {
          liveInputUid: input.liveInputUid!,
          broadcastId: broadcast.id,
        },
      });
    }
    if (!broadcast.started_at) {
      const liveStartDedupeKey = `stream-live-start:${broadcast.id}`;
      jobs.push({
        dedupeKey: liveStartDedupeKey,
        kind: "LIVE_START_NOTIFICATION",
        payload: {
          broadcasterId: liveInput.userId,
          broadcastId: broadcast.id,
          broadcastTitle: broadcast.title,
          broadcastThumbnail: broadcast.thumbnail,
          deliveryKeyPrefix: liveStartDedupeKey,
        },
      });
    }

    await enqueueStreamWebhookOutboxJobs(tx, eventId, jobs);
    await finishEvent(tx, eventId, "PROCESSED");
    return "PROCESSED";
  });
}

/** Live Input 해제 이벤트를 해당 provider 세션보다 최신일 때만 종료로 반영한다. */
async function processDisconnected(
  eventId: number,
  input: CloudflareWebhookInput
): Promise<"PROCESSED" | "IGNORED"> {
  if (!input.liveInputUid) return ignoreEvent(eventId);

  return db.$transaction(async (tx) => {
    const liveInput = await tx.liveInput.findUnique({
      where: { provider_uid: input.liveInputUid! },
      select: { id: true },
    });
    if (!liveInput) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const broadcast = await tx.broadcast.findFirst({
      where: {
        liveInputId: liveInput.id,
        providerSessionStartedAt: { lte: input.eventAt },
      },
      orderBy: { providerSessionStartedAt: "desc" },
      select: { id: true },
    });
    if (!broadcast) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const updated = await tx.broadcast.updateMany({
      where: {
        id: broadcast.id,
        OR: [
          { lastProviderEventAt: null },
          { lastProviderEventAt: { lt: input.eventAt } },
        ],
      },
      data: {
        status: "ENDED",
        ended_at: input.eventAt,
        providerSessionEndedAt: input.eventAt,
        lastProviderEventAt: input.eventAt,
      },
    });
    if (updated.count === 0) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const prefix = `stream-webhook:${eventId}`;
    await enqueueStreamWebhookOutboxJobs(tx, eventId, [
      {
        dedupeKey: `${prefix}:realtime`,
        kind: "BROADCAST_REALTIME",
        payload: { broadcastId: broadcast.id },
      },
      {
        dedupeKey: `${prefix}:cache`,
        kind: "REVALIDATE_BROADCAST",
        payload: { broadcastId: broadcast.id },
      },
    ]);
    await finishEvent(tx, eventId, "PROCESSED");
    return "PROCESSED";
  });
}

/** 게시글 동영상 READY/FAILED 중 먼저 반영된 terminal 상태만 유지한다. */
async function processPostVideo(
  eventId: number,
  input: CloudflareWebhookInput,
  nextStatus: "READY" | "FAILED"
): Promise<"PROCESSED" | "IGNORED"> {
  if (!input.assetUid) return ignoreEvent(eventId);
  const source = input.body.data ?? input.body.result ?? input.body;
  const meta = getCloudflareAssetMeta(input.body);
  const draftKey =
    typeof meta.draftKey === "string" ? meta.draftKey : undefined;

  return db.$transaction(async (tx) => {
    const draft = await tx.postVideo.findFirst({
      where: {
        OR: [
          { providerAssetId: input.assetUid! },
          { uploadUid: input.assetUid! },
          ...(draftKey ? [{ draftKey }] : []),
        ],
      },
      select: { id: true, postId: true },
    });
    if (!draft) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const updated = await tx.postVideo.updateMany({
      where: {
        id: draft.id,
        status: { in: ["UPLOADING", "PROCESSING"] },
        OR: [
          { lastProviderEventAt: null },
          { lastProviderEventAt: { lt: input.eventAt } },
        ],
      },
      data: {
        providerAssetId: input.assetUid,
        uploadUid: input.assetUid,
        status: nextStatus,
        lastProviderEventAt: input.eventAt,
        ...(nextStatus === "READY"
          ? {
              thumbnailUrl: source.thumbnail ?? null,
              durationSec:
                typeof source.duration === "number"
                  ? Math.floor(source.duration)
                  : null,
            }
          : {}),
      },
    });
    if (updated.count === 0) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    if (draft.postId) {
      await enqueueStreamWebhookOutboxJobs(tx, eventId, [
        {
          dedupeKey: `stream-webhook:${eventId}:post-cache`,
          kind: "REVALIDATE_POST",
          payload: { postId: draft.postId },
        },
      ]);
    }
    await finishEvent(tx, eventId, "PROCESSED");
    return "PROCESSED";
  });
}

/** video.ready 녹화본을 시작 시각 허용치 안에서 provider 생성 시각이 포함되는 Broadcast 세션에 연결한다. */
async function processVideoReady(
  eventId: number,
  input: CloudflareWebhookInput
): Promise<"PROCESSED" | "IGNORED"> {
  const assetUid = input.assetUid;
  const liveInputUid =
    input.liveInputUid ?? getCloudflareLiveInputUid(input.body);
  const providerCreatedAt = getCloudflareAssetCreatedAt(input.body);
  if (!assetUid || !liveInputUid || !providerCreatedAt) {
    return ignoreEvent(eventId);
  }

  const source = input.body.data ?? input.body.result ?? input.body;
  const playbackHls = source.playback?.hls ?? null;
  const playbackDash = source.playback?.dash ?? null;
  const thumbnailUrl = source.thumbnail ?? null;
  const durationSec =
    typeof source.duration === "number" ? Math.floor(source.duration) : null;
  const parsedReadyAt = source.readyToStreamAt
    ? new Date(source.readyToStreamAt)
    : null;
  const readyAt =
    parsedReadyAt && !Number.isNaN(parsedReadyAt.getTime())
      ? parsedReadyAt
      : input.eventAt;
  const providerStartUpperBound = new Date(
    providerCreatedAt.getTime() + RECORDING_START_SKEW_MS
  );

  return db.$transaction(async (tx) => {
    const broadcast = await tx.broadcast.findFirst({
      where: {
        liveInput: { provider_uid: liveInputUid },
        providerSessionStartedAt: { lte: providerStartUpperBound },
        OR: [
          { providerSessionEndedAt: null },
          { providerSessionEndedAt: { gte: providerCreatedAt } },
        ],
      },
      orderBy: { providerSessionStartedAt: "desc" },
      select: { id: true },
    });
    if (!broadcast) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    const rows = await tx.$queryRaw<Array<{ id: number }>>`
      INSERT INTO "VodAsset" (
        "broadcastId", "provider_asset_id", "playback_hls", "playback_dash",
        "thumbnail_url", "duration_sec", "ready_at", "providerCreatedAt",
        "lastProviderEventAt", "views", "created_at", "updated_at"
      ) VALUES (
        ${broadcast.id}, ${assetUid}, ${playbackHls}, ${playbackDash},
        ${thumbnailUrl}, ${durationSec}, ${readyAt}, ${providerCreatedAt},
        ${input.eventAt}, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("provider_asset_id") DO UPDATE SET
        "broadcastId" = EXCLUDED."broadcastId",
        "playback_hls" = EXCLUDED."playback_hls",
        "playback_dash" = EXCLUDED."playback_dash",
        "thumbnail_url" = EXCLUDED."thumbnail_url",
        "duration_sec" = EXCLUDED."duration_sec",
        "ready_at" = EXCLUDED."ready_at",
        "providerCreatedAt" = EXCLUDED."providerCreatedAt",
        "lastProviderEventAt" = EXCLUDED."lastProviderEventAt",
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "VodAsset"."lastProviderEventAt" IS NULL
        OR "VodAsset"."lastProviderEventAt" < EXCLUDED."lastProviderEventAt"
      RETURNING "id"
    `;
    if (rows.length === 0) {
      await finishEvent(tx, eventId, "IGNORED");
      return "IGNORED";
    }

    await enqueueStreamWebhookOutboxJobs(tx, eventId, [
      {
        dedupeKey: `stream-webhook:${eventId}:broadcast-cache`,
        kind: "REVALIDATE_BROADCAST",
        payload: { broadcastId: broadcast.id },
      },
    ]);
    await finishEvent(tx, eventId, "PROCESSED");
    return "PROCESSED";
  });
}

/** 선점한 inbox 이벤트를 종류별 DB 상태 전이로 처리한다. */
export async function processClaimedCloudflareWebhookEvent(
  eventId: number,
  input: CloudflareWebhookInput
): Promise<"PROCESSED" | "IGNORED"> {
  const isReady = isCloudflareAssetReady(input.body);
  const isError = isCloudflareAssetError(input.body);
  const isPostVideo = isPostVideoWebhookPayload(input.body);

  if (input.eventType === "live_input.connected") {
    return processConnected(eventId, input);
  }
  if (input.eventType === "live_input.disconnected") {
    return processDisconnected(eventId, input);
  }
  if (isPostVideo && isError) {
    return processPostVideo(eventId, input, "FAILED");
  }
  if (isPostVideo && isReady) {
    return processPostVideo(eventId, input, "READY");
  }
  if (!isPostVideo && isReady) {
    return processVideoReady(eventId, input);
  }

  return ignoreEvent(eventId);
}

/** 재시도 가능한 inbox 작업의 batch 처리 결과. */
export interface CloudflareWebhookInboxBatchResult {
  claimed: number;
  completed: number;
  failed: number;
}

/** 실패·중단된 inbox 이벤트를 다시 선점해 도메인 상태 전이를 복구한다. */
export async function processCloudflareWebhookInboxBatch(
  limit: number = 10,
  now: Date = new Date()
): Promise<CloudflareWebhookInboxBatchResult> {
  const normalizedLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const events = await db.cloudflareWebhookEvent.findMany({
    where: {
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          available_at: { lte: now },
        },
        { status: "PROCESSING", updated_at: { lt: staleBefore } },
      ],
    },
    orderBy: { id: "asc" },
    take: normalizedLimit,
    select: {
      id: true,
      source: true,
      eventType: true,
      providerEventId: true,
      payloadHash: true,
      payload: true,
      liveInputUid: true,
      assetUid: true,
      eventAt: true,
    },
  });

  let claimed = 0;
  let completed = 0;
  let failed = 0;

  for (const event of events) {
    const acquired = await db.cloudflareWebhookEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            available_at: { lte: now },
          },
          { status: "PROCESSING", updated_at: { lt: staleBefore } },
        ],
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    if (acquired.count === 0) continue;
    claimed += 1;

    try {
      await processClaimedCloudflareWebhookEvent(event.id, {
        source: event.source as CloudflareWebhookInput["source"],
        eventType: event.eventType,
        providerEventId: event.providerEventId,
        payloadHash: event.payloadHash,
        body: toCloudflarePayload(event.payload),
        liveInputUid: event.liveInputUid,
        assetUid: event.assetUid,
        eventAt: event.eventAt,
      });
      completed += 1;
    } catch (error) {
      await failCloudflareWebhookEvent(event.id, error);
      failed += 1;
    }
  }

  return { claimed, completed, failed };
}
