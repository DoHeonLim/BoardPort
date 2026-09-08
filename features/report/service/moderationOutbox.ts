/**
 * File Name : features/report/service/moderationOutbox.ts
 * Description : 신고 처리 commit 이후 외부 효과를 멱등 재시도하는 moderation outbox
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   알림·실시간 정지·Cloudflare 정리 outbox enqueue와 재시도 처리 추가
 */
import "server-only";

import db from "@/lib/db";
import { Prisma, type ModerationOutbox } from "@/generated/prisma/client";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { AdminNotificationType } from "@/features/notification/types";
import { realtimeServer } from "@/features/realtime/service/broadcast";
import { notificationRealtimeTopic } from "@/features/realtime/topics";
import { deleteCloudflareImageAssetsById } from "@/features/media/service/assets";
import { deleteCloudflareStreamAsset } from "@/features/post/service/video";
import { cleanupDeletedBroadcastAssets } from "@/features/stream/service/delete";

const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type AdminNotificationPayload = {
  targetUserId: number;
  type: AdminNotificationType;
  title?: string;
  reason: string;
  link?: string;
  deliveryKey: string;
};

type BanRealtimePayload = {
  targetUserId: number;
  reason: string;
  until: string;
};

type ImageCleanupPayload = { providerAssetIds: string[] };
type PostVideoCleanupPayload = { providerAssetId: string };
type BroadcastCleanupPayload = {
  vodAssetIds: string[];
  thumbnailAssetIds: string[];
};

/** 신고 transaction과 함께 저장할 수 있는 외부 후속 작업의 식별자와 payload. */
export type ModerationOutboxJob =
  | {
      dedupeKey: string;
      kind: "ADMIN_NOTIFICATION";
      payload: AdminNotificationPayload;
    }
  | {
      dedupeKey: string;
      kind: "BAN_REALTIME";
      payload: BanRealtimePayload;
    }
  | {
      dedupeKey: string;
      kind: "DELETE_IMAGE_ASSETS";
      payload: ImageCleanupPayload;
    }
  | {
      dedupeKey: string;
      kind: "DELETE_POST_VIDEO";
      payload: PostVideoCleanupPayload;
    }
  | {
      dedupeKey: string;
      kind: "DELETE_BROADCAST_ASSETS";
      payload: BroadcastCleanupPayload;
    };

/** 신고 처리 transaction에 post-commit 작업을 고유 키 기준으로 함께 저장한다. */
export async function enqueueModerationOutboxJobs(
  tx: Prisma.TransactionClient,
  jobs: ModerationOutboxJob[]
): Promise<void> {
  if (jobs.length === 0) return;

  await tx.moderationOutbox.createMany({
    data: jobs.map((job) => ({
      dedupeKey: job.dedupeKey,
      kind: job.kind,
      payload: job.payload as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}

/** JSON payload가 기대한 object 형태인지 확인한다. */
function toPayloadObject(payload: Prisma.JsonValue): Record<string, unknown> {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error("유효하지 않은 moderation outbox payload입니다.");
  }
  return payload as Record<string, unknown>;
}

/**
 * outbox 종류별 외부 효과를 실행한다.
 * 반복 삭제의 404는 성공으로 보고, 알림 DB 행은 고유 delivery key로 보호하며, 반복 Realtime 신호는 허용한다.
 */
async function dispatchModerationOutboxJob(
  job: ModerationOutbox
): Promise<void> {
  const payload = toPayloadObject(job.payload);

  switch (job.kind) {
    case "ADMIN_NOTIFICATION": {
      const result = await sendAdminActionNotification(
        payload as AdminNotificationPayload
      );
      if (!result.success) throw new Error(result.error);
      return;
    }
    case "BAN_REALTIME": {
      const input = payload as BanRealtimePayload;
      await realtimeServer
        .channel(notificationRealtimeTopic(input.targetUserId))
        .send({
          type: "broadcast",
          event: "sys_event",
          payload: { type: "BAN", reason: input.reason, until: input.until },
        });
      return;
    }
    case "DELETE_IMAGE_ASSETS": {
      const input = payload as ImageCleanupPayload;
      await deleteCloudflareImageAssetsById(input.providerAssetIds, {
        throwOnFailure: true,
      });
      return;
    }
    case "DELETE_POST_VIDEO": {
      const input = payload as PostVideoCleanupPayload;
      await deleteCloudflareStreamAsset(input.providerAssetId, {
        throwOnFailure: true,
      });
      return;
    }
    case "DELETE_BROADCAST_ASSETS": {
      const input = payload as BroadcastCleanupPayload;
      await cleanupDeletedBroadcastAssets(input, { throwOnFailure: true });
      return;
    }
    default:
      throw new Error(
        `지원하지 않는 moderation outbox kind입니다: ${job.kind}`
      );
  }
}

/** 처리 가능한 작업을 `FOR UPDATE SKIP LOCKED`로 선점해 다중 실행자의 중복 dispatch를 막는다. */
async function claimModerationOutboxJobs(
  limit: number,
  now: Date
): Promise<ModerationOutbox[]> {
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  return db.$transaction(
    (tx) =>
      tx.$queryRaw<ModerationOutbox[]>`
      UPDATE "ModerationOutbox"
      SET
        "status" = 'PROCESSING',
        "attempts" = "attempts" + 1,
        "updated_at" = ${now}
      WHERE "id" IN (
        SELECT "id"
        FROM "ModerationOutbox"
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

/** 한 번의 outbox batch에서 선점·완료·실패한 작업 수. */
export interface ModerationOutboxBatchResult {
  claimed: number;
  completed: number;
  failed: number;
}

/**
 * moderation outbox 한 배치를 처리한다.
 * 실패 작업은 지수형 backoff 뒤 재시도하고 최대 횟수 초과 시 FAILED로 격리한다.
 */
export async function processModerationOutboxBatch(
  limit: number = 20,
  now: Date = new Date()
): Promise<ModerationOutboxBatchResult> {
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const jobs = await claimModerationOutboxJobs(normalizedLimit, now);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await dispatchModerationOutboxJob(job);
      await db.moderationOutbox.update({
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
      await db.moderationOutbox.update({
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
