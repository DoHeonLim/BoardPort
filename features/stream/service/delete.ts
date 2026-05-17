/**
 * File Name : features/stream/service/delete.ts
 * Description : 방송 삭제 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.17  임도헌   Created   VodAsset → Broadcast 삭제 유틸 (트랜잭션 주입)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.07  임도헌   Modified  삭제 실패 문구를 구체화(v1.2)
 * 2026.03.31  임도헌   Modified  일반 삭제/관리자 삭제 공통 cleanup helper와 Cloudflare VOD/썸네일 자산 정리 추가
 * 2026.04.02  임도헌   Modified  Cloudflare 이미지 ID 파싱을 stream image utils로 분리하고 삭제 helper 설명 보강
 * 2026.05.16  임도헌   Modified  방송 삭제 액션의 사전 조회용 메타 헬퍼 추가
 */

import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { extractCloudflareImageId } from "@/features/stream/utils/image";

type DeleteResult = { success: true } | { success: false; error: string };
type BroadcastDeleteMeta = {
  ownerId: number;
};
type HardDeleteBroadcastTarget = {
  id: number;
  thumbnail: string | null;
  vodAssets: { provider_asset_id: string }[];
};

/** 방송 삭제 권한 확인에 필요한 최소 메타 조회 */
export async function getBroadcastDeleteMeta(
  broadcastId: number
): Promise<BroadcastDeleteMeta | null> {
  const broadcast = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: { liveInput: { select: { userId: true } } },
  });

  if (!broadcast) return null;
  return { ownerId: broadcast.liveInput.userId };
}

/** LiveInput 삭제 성공 후 무효화할 연결 방송 ID 목록 조회 */
export async function getBroadcastIdsByLiveInput(
  liveInputId: number
): Promise<number[]> {
  const broadcasts = await db.broadcast.findMany({
    where: { liveInputId },
    select: { id: true },
  });

  return broadcasts.map((broadcast) => broadcast.id);
}
/** Cloudflare Stream VOD 자산 best-effort 삭제 */
async function deleteCloudflareVodAsset(providerAssetId: string): Promise<void> {
  const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!ACCOUNT_ID || !API_TOKEN || !providerAssetId) return;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${providerAssetId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      console.warn(
        `[deleteCloudflareVodAsset] unexpected status=${response.status} asset=${providerAssetId}`
      );
    }
  } catch (error) {
    console.error("[deleteCloudflareVodAsset] failed:", error);
  }
}

/** 방송 썸네일 Cloudflare Images 자산 best-effort 삭제 */
async function deleteCloudflareThumbnailAsset(
  thumbnailUrl: string | null
): Promise<void> {
  if (!thumbnailUrl) return;

  const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const imageId = extractCloudflareImageId(thumbnailUrl);

  if (!ACCOUNT_ID || !API_TOKEN || !imageId) return;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      console.warn(
        `[deleteCloudflareThumbnailAsset] unexpected status=${response.status} thumbnail=${thumbnailUrl}`
      );
    }
  } catch (error) {
    console.error("[deleteCloudflareThumbnailAsset] failed:", error);
  }
}

/**
 * 방송 하드 삭제 공통 cleanup
 *
 * [기능]
 * - 일반 삭제/관리자 삭제가 같은 방송/VOD 정리 규칙을 공유
 * - DB에서 VodAsset -> Broadcast 순서로 삭제
 * - 삭제가 끝난 뒤 Cloudflare VOD 자산과 방송 썸네일 이미지를 best-effort로 정리
 *
 * 주의:
 * - LiveInput(provider_uid)은 사용자 채널 단위 리소스라 방송 삭제에서는 건드리지 않음
 */
export async function hardDeleteBroadcastWithCleanup(
  target: HardDeleteBroadcastTarget
) {
  const vodAssetIds = target.vodAssets.map((item) => item.provider_asset_id);

  await db.$transaction(async (tx) => {
    await tx.vodAsset.deleteMany({ where: { broadcastId: target.id } });
    await tx.broadcast.delete({ where: { id: target.id } });
  });

  await Promise.allSettled([
    ...vodAssetIds.map((assetId) => deleteCloudflareVodAsset(assetId)),
    deleteCloudflareThumbnailAsset(target.thumbnail),
  ]);
}

/**
 * 트랜잭션 내에서 방송 삭제 수행 (VodAsset -> Broadcast 순서)
 *
 * @param {Prisma.TransactionClient} tx - 트랜잭션 클라이언트
 * @param {number} broadcastId - 삭제할 방송 ID
 * @returns {Promise<DeleteResult>} 삭제 성공 여부와 실패 메시지
 */
export async function deleteBroadcastTx(
  tx: Prisma.TransactionClient,
  broadcastId: number
): Promise<DeleteResult> {
  try {
    if (!Number.isFinite(broadcastId)) {
      return { success: false, error: "잘못된 요청입니다.(id)" };
    }

    const broadcast = await tx.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        thumbnail: true,
        vodAssets: {
          select: { provider_asset_id: true },
        },
      },
    });

    if (!broadcast) {
      return { success: false, error: "이미 삭제된 방송입니다." };
    }

    await tx.vodAsset.deleteMany({ where: { broadcastId } });
    await tx.broadcast.delete({ where: { id: broadcastId } });

    void Promise.allSettled([
      ...broadcast.vodAssets.map((asset) =>
        deleteCloudflareVodAsset(asset.provider_asset_id)
      ),
      deleteCloudflareThumbnailAsset(broadcast.thumbnail),
    ]);

    return { success: true };
  } catch (e) {
    console.error("[deleteBroadcastTx] failed:", e);
    return {
      success: false,
      error:
        "방송 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 방송 삭제 (단독 실행용)
 *
 * @param {number} broadcastId - 삭제할 방송 ID
 * @returns {Promise<DeleteResult>} 삭제 성공 여부와 실패 메시지
 */
export async function deleteBroadcast(
  broadcastId: number
): Promise<DeleteResult> {
  return await db.$transaction((tx) => deleteBroadcastTx(tx, broadcastId));
}
