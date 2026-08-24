/**
 * File Name : features/media/service/assets.ts
 * Description : 사용자 업로드 이미지 소유권 관리 및 Cloudflare 정리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   업로드 자산의 소유자·용도·연결 대상 검증과 provider ID 기반 삭제 추가
 */
import "server-only";

import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { parseCloudflareImageReference } from "@/features/media/utils/cloudflareImage";

export const MEDIA_ASSET_PURPOSES = [
  "USER_AVATAR",
  "PRODUCT_IMAGE",
  "POST_IMAGE",
  "CHAT_IMAGE",
  "STREAM_THUMBNAIL",
] as const;

export type MediaAssetPurposeValue = (typeof MEDIA_ASSET_PURPOSES)[number];

/** 입력값이 BoardPort에서 지원하는 이미지 자산 용도인지 확인한다. */
export function isMediaAssetPurpose(
  value: unknown
): value is MediaAssetPurposeValue {
  return (
    typeof value === "string" &&
    MEDIA_ASSET_PURPOSES.includes(value as MediaAssetPurposeValue)
  );
}

/** URL 목록을 MediaAsset 소유권 기록과 대조하고 현재 사용자·용도·엔터티에 원자적으로 연결한다. */
export async function attachOwnedMediaAssets(
  tx: Prisma.TransactionClient,
  input: {
    ownerId: number;
    purpose: MediaAssetPurposeValue;
    urls: string[];
    linkedEntityId: string;
  }
): Promise<string[]> {
  if (new Set(input.urls).size !== input.urls.length) {
    throw new Error("중복된 이미지 자산은 연결할 수 없습니다.");
  }

  const references = input.urls.map((url) => {
    const reference = parseCloudflareImageReference(url);
    if (!reference) throw new Error("허용되지 않은 이미지 URL입니다.");
    return reference;
  });
  if (references.length === 0) return [];

  const rows = await tx.mediaAsset.findMany({
    where: {
      providerAssetId: { in: references.map((item) => item.providerAssetId) },
    },
    select: {
      providerAssetId: true,
      ownerId: true,
      purpose: true,
      state: true,
      linkedEntityId: true,
      deliveryUrl: true,
      expires_at: true,
    },
  });
  const rowById = new Map(rows.map((row) => [row.providerAssetId, row]));
  const now = new Date();

  for (const reference of references) {
    const row = rowById.get(reference.providerAssetId);
    const reusableAttachment =
      row?.state === "ATTACHED" && row.linkedEntityId === input.linkedEntityId;
    if (
      !row ||
      row.ownerId !== input.ownerId ||
      row.purpose !== input.purpose ||
      (!reusableAttachment && row.state !== "PENDING") ||
      (!reusableAttachment && row.expires_at <= now)
    ) {
      throw new Error(
        "이미지 업로드 소유권 또는 연결 상태가 올바르지 않습니다."
      );
    }
  }

  const claimed = await tx.mediaAsset.updateMany({
    where: {
      providerAssetId: { in: references.map((item) => item.providerAssetId) },
      ownerId: input.ownerId,
      purpose: input.purpose,
      OR: [
        { state: "PENDING", expires_at: { gt: now } },
        { state: "ATTACHED", linkedEntityId: input.linkedEntityId },
      ],
    },
    data: {
      state: "ATTACHED",
      linkedEntityId: input.linkedEntityId,
      attached_at: now,
      deleted_at: null,
    },
  });
  if (claimed.count !== references.length) {
    throw new Error("이미지 자산 연결 상태가 동시에 변경되었습니다.");
  }

  return references.map(
    (reference) => rowById.get(reference.providerAssetId)!.deliveryUrl
  );
}

/** 연결 대상에서 제거된 자산을 MediaAsset에서 고립 상태로 전환하고 provider ID를 반환한다. */
export async function detachMissingMediaAssets(
  tx: Prisma.TransactionClient,
  input: {
    ownerId: number;
    purpose: MediaAssetPurposeValue;
    linkedEntityId: string;
    keepUrls: string[];
  }
): Promise<string[]> {
  const keepIds = input.keepUrls
    .map(parseCloudflareImageReference)
    .filter((item): item is NonNullable<typeof item> => !!item)
    .map((item) => item.providerAssetId);
  const stale = await tx.mediaAsset.findMany({
    where: {
      ownerId: input.ownerId,
      purpose: input.purpose,
      state: "ATTACHED",
      linkedEntityId: input.linkedEntityId,
      ...(keepIds.length ? { providerAssetId: { notIn: keepIds } } : {}),
    },
    select: { providerAssetId: true },
  });

  if (stale.length) {
    await tx.mediaAsset.updateMany({
      where: {
        providerAssetId: { in: stale.map((item) => item.providerAssetId) },
      },
      data: { state: "ORPHANED", linkedEntityId: null },
    });
  }
  return stale.map((item) => item.providerAssetId);
}

/** DB에 저장된 provider ID로만 Cloudflare Images 삭제를 수행한다. */
export async function deleteCloudflareImageAssetsById(
  providerAssetIds: string[]
): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const uniqueIds = [...new Set(providerAssetIds.filter(Boolean))];
  if (!accountId || !apiToken || uniqueIds.length === 0) return;

  await Promise.allSettled(
    uniqueIds.map(async (providerAssetId) => {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${encodeURIComponent(providerAssetId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiToken}` },
          }
        );
        if (!response.ok && response.status !== 404) {
          console.warn(
            `[deleteCloudflareImageAssetsById] unexpected status=${response.status} asset=${providerAssetId}`
          );
          return;
        }
        await db.mediaAsset.updateMany({
          where: { providerAssetId },
          data: {
            state: "DELETED",
            linkedEntityId: null,
            deleted_at: new Date(),
          },
        });
      } catch (error) {
        console.error("[deleteCloudflareImageAssetsById] failed:", error);
      }
    })
  );
}

/** 연결된 엔터티와 용도에 해당하는 Cloudflare provider asset ID를 조회한다. */
export async function getLinkedMediaAssetIds(input: {
  purpose: MediaAssetPurposeValue;
  linkedEntityId: string;
}): Promise<string[]> {
  const rows = await db.mediaAsset.findMany({
    where: {
      purpose: input.purpose,
      linkedEntityId: input.linkedEntityId,
      state: "ATTACHED",
    },
    select: { providerAssetId: true },
  });
  return rows.map((row) => row.providerAssetId);
}
