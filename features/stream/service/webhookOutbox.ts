/**
 * File Name : features/stream/service/webhookOutbox.ts
 * Description : Cloudflare webhook commit 이후 외부 후처리의 멱등 실행과 재시도
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   알림·Realtime·썸네일·캐시 갱신 outbox 처리 추가
 */
import "server-only";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import { Prisma, type StreamWebhookOutbox } from "@/generated/prisma/client";
import { sendLiveStatusFromServer } from "@/features/stream/service/realtime";
import { sendLiveStartNotifications } from "@/features/notification/service/live";
import type { CloudflareVideoListResponse } from "@/features/stream/types";

const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type BroadcastRealtimePayload = { broadcastId: number };
type LiveStartPayload = {
  broadcasterId: number;
  broadcastId: number;
  broadcastTitle: string;
  broadcastThumbnail: string | null;
  deliveryKeyPrefix: string;
};
type FillThumbnailPayload = { liveInputUid: string; broadcastId: number };
type RevalidateBroadcastPayload = { broadcastId: number };
type RevalidatePostPayload = { postId: number };

/** webhook 상태 transaction과 함께 저장하는 외부 후처리 작업. */
export type StreamWebhookOutboxJob =
  | {
      dedupeKey: string;
      kind: "BROADCAST_REALTIME";
      payload: BroadcastRealtimePayload;
    }
  | {
      dedupeKey: string;
      kind: "LIVE_START_NOTIFICATION";
      payload: LiveStartPayload;
    }
  | {
      dedupeKey: string;
      kind: "FILL_BROADCAST_THUMBNAIL";
      payload: FillThumbnailPayload;
    }
  | {
      dedupeKey: string;
      kind: "REVALIDATE_BROADCAST";
      payload: RevalidateBroadcastPayload;
    }
  | {
      dedupeKey: string;
      kind: "REVALIDATE_POST";
      payload: RevalidatePostPayload;
    };

/** webhook DB 처리 transaction에 후처리 작업을 고유 키 기준으로 함께 저장한다. */
export async function enqueueStreamWebhookOutboxJobs(
  tx: Prisma.TransactionClient,
  webhookEventId: number,
  jobs: StreamWebhookOutboxJob[]
): Promise<void> {
  if (jobs.length === 0) return;

  await tx.streamWebhookOutbox.createMany({
    data: jobs.map((job) => ({
      webhookEventId,
      dedupeKey: job.dedupeKey,
      kind: job.kind,
      payload: job.payload as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}

/** JSON payload가 outbox object로 해석 가능한지 검증한다. */
function toPayloadObject(payload: Prisma.JsonValue): Record<string, unknown> {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error("유효하지 않은 stream webhook outbox payload입니다.");
  }
  return payload as Record<string, unknown>;
}

/** Cloudflare status 필드에서 상태 문자열을 추출한다. */
function getStatusState(status: unknown): string | null {
  if (typeof status === "string") return status;
  if (
    status &&
    typeof status === "object" &&
    "state" in status &&
    typeof status.state === "string"
  ) {
    return status.state;
  }
  return null;
}

/** Live Input 녹화 목록에서 현재 방송 썸네일 후보를 선택해 비어 있는 경우에만 저장한다. */
async function fillBroadcastThumbnail({
  liveInputUid,
  broadcastId,
}: FillThumbnailPayload): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream API environment is missing.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/live_inputs/${encodeURIComponent(liveInputUid)}/videos`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Cloudflare thumbnail lookup failed: ${response.status}`);
  }

  const json = (await response.json()) as CloudflareVideoListResponse;
  const videos = Array.isArray(json.result) ? json.result : [];
  const chosen =
    videos.find(
      (video) => getStatusState(video.status) === "live-inprogress"
    ) ??
    videos.find((video) => getStatusState(video.status) === "ready") ??
    videos[0];
  if (!chosen?.thumbnail) {
    throw new Error("Cloudflare thumbnail is not ready yet.");
  }

  await db.broadcast.updateMany({
    where: { id: broadcastId, thumbnail: null },
    data: { thumbnail: chosen.thumbnail },
  });
}

/** outbox 종류별 외부 후처리를 실행한다. */
async function dispatchStreamWebhookOutboxJob(
  job: StreamWebhookOutbox
): Promise<void> {
  const payload = toPayloadObject(job.payload);

  switch (job.kind) {
    case "BROADCAST_REALTIME":
      await sendLiveStatusFromServer(payload as BroadcastRealtimePayload);
      return;
    case "LIVE_START_NOTIFICATION":
      await sendLiveStartNotifications(payload as LiveStartPayload);
      return;
    case "FILL_BROADCAST_THUMBNAIL":
      await fillBroadcastThumbnail(payload as FillThumbnailPayload);
      return;
    case "REVALIDATE_BROADCAST": {
      const input = payload as RevalidateBroadcastPayload;
      revalidateTag(T.BROADCAST_DETAIL(input.broadcastId), { expire: 0 });
      return;
    }
    case "REVALIDATE_POST": {
      const input = payload as RevalidatePostPayload;
      revalidateTag(T.POST_DETAIL(input.postId), { expire: 0 });
      return;
    }
    default:
      throw new Error(
        `지원하지 않는 stream webhook outbox kind입니다: ${job.kind}`
      );
  }
}

/** 처리 가능한 outbox 작업을 원자적으로 선점한다. */
async function claimStreamWebhookOutboxJobs(
  limit: number,
  now: Date
): Promise<StreamWebhookOutbox[]> {
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  return db.$transaction(
    (tx) =>
      tx.$queryRaw<StreamWebhookOutbox[]>`
      UPDATE "StreamWebhookOutbox"
      SET
        "status" = 'PROCESSING',
        "attempts" = "attempts" + 1,
        "updated_at" = ${now}
      WHERE "id" IN (
        SELECT "id"
        FROM "StreamWebhookOutbox"
        WHERE (
          ("status" = 'PENDING' AND "available_at" <= ${now})
          OR ("status" = 'PROCESSING' AND "updated_at" < ${staleBefore})
        )
        ORDER BY "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      RETURNING *
    `
  );
}

/** 한 번의 stream webhook outbox batch 처리 결과. */
export interface StreamWebhookOutboxBatchResult {
  claimed: number;
  completed: number;
  failed: number;
}

/** 후처리 작업을 실행하고 실패 작업은 지수형 backoff 뒤 재시도한다. */
export async function processStreamWebhookOutboxBatch(
  limit: number = 20,
  now: Date = new Date()
): Promise<StreamWebhookOutboxBatchResult> {
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const jobs = await claimStreamWebhookOutboxJobs(normalizedLimit, now);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await dispatchStreamWebhookOutboxJob(job);
      await db.streamWebhookOutbox.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          processed_at: new Date(),
          lastError: null,
        },
      });
      completed += 1;
    } catch (error) {
      const terminal = job.attempts >= MAX_ATTEMPTS;
      const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attempts - 1));
      await db.streamWebhookOutbox.update({
        where: { id: job.id },
        data: {
          status: terminal ? "FAILED" : "PENDING",
          available_at: new Date(Date.now() + delayMinutes * 60 * 1000),
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Unknown error",
        },
      });
      failed += 1;
    }
  }

  return { claimed: jobs.length, completed, failed };
}
