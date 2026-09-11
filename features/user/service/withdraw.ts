/**
 * File Name : features/user/service/withdraw.ts
 * Description : 회원 탈퇴(계정 삭제) 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created   회원 탈퇴 로직 추가
 * 2026.03.07  임도헌   Modified  탈퇴 실패 문구를 구체화(v1.2)
 * 2026.03.31  임도헌   Modified  도메인별 cleanup helper를 거쳐 외부 자산과 태그 정산까지 반영하도록 보강
 * 2026.05.24  임도헌   Modified  회원 탈퇴 시 상품 채팅방 알림 링크 cleanup 메타 포함
 * 2026.08.22  임도헌   Modified  회원 이미지 자산을 URL 대신 MediaAsset provider ID로 일괄 정리
 * 2026.09.07  임도헌   Modified  탈퇴 이미지 정리 outbox와 사용자 삭제의 원자적 기록 추가
 * 2026.09.08  임도헌   Modified  방송 정리 대상에 녹화본 ID를 포함해 사용자 썸네일 cleanup 연결
 */

import "server-only";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import { hardDeletePostWithCleanup } from "@/features/post/service/post";
import { hardDeleteProductWithCleanup } from "@/features/product/service/delete";
import { hardDeleteBroadcastWithCleanup } from "@/features/stream/service/delete";
import { deleteCloudflareStreamAsset } from "@/features/post/service/video";
import { deleteCloudflareLiveInputAsset } from "@/features/stream/service/liveInput";
import {
  enqueueModerationOutboxJobs,
  processModerationOutboxBatch,
} from "@/features/report/service/moderationOutbox";

/**
 * 회원 탈퇴 처리
 * - 유저 데이터를 물리적으로 삭제 (Hard Delete)
 * - 게시글/상품/방송은 도메인별 cleanup helper를 먼저 실행해 외부 자산과 태그 정산까지 반영
 * - 이미지 정리 outbox 저장과 user.delete를 같은 transaction으로 처리
 * - 사용자 삭제 후에도 이미지 삭제 실패의 재시도 정보 보존
 *
 * @param userId - 탈퇴할 유저 ID
 */
export async function withdrawUser(userId: number): Promise<ServiceResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        live_inputs: { select: { id: true, provider_uid: true } },
        posts: {
          select: {
            id: true,
            tags: { select: { name: true } },
            video: { select: { providerAssetId: true, uploadUid: true } },
          },
        },
        products: {
          select: {
            id: true,
            search_tags: { select: { name: true } },
            images: { select: { url: true } },
            chat_rooms: { select: { id: true } },
          },
        },
        post_videos: {
          where: { postId: null },
          select: { providerAssetId: true, uploadUid: true },
        },
      },
    });

    if (!user) {
      return { success: false, error: "존재하지 않는 회원입니다." };
    }

    const broadcasts = user.live_inputs?.id
      ? await db.broadcast.findMany({
          where: { liveInputId: user.live_inputs.id },
          select: {
            id: true,
            thumbnail: true,
            vodAssets: { select: { id: true, provider_asset_id: true } },
          },
        })
      : [];

    for (const post of user.posts) {
      await hardDeletePostWithCleanup({
        id: post.id,
        tags: post.tags,
        video: post.video,
      });
    }

    for (const product of user.products) {
      await hardDeleteProductWithCleanup({
        id: product.id,
        search_tags: product.search_tags,
        images: product.images,
        chat_rooms: product.chat_rooms,
      });
    }

    for (const broadcast of broadcasts) {
      await hardDeleteBroadcastWithCleanup({
        id: broadcast.id,
        thumbnail: broadcast.thumbnail,
        vodAssets: broadcast.vodAssets,
      });
    }

    await Promise.allSettled(
      user.post_videos.map((video) =>
        deleteCloudflareStreamAsset(
          video.providerAssetId ?? video.uploadUid ?? ""
        )
      )
    );

    if (user.live_inputs?.provider_uid) {
      await deleteCloudflareLiveInputAsset(user.live_inputs.provider_uid);
    }

    // 사용자 Cascade 삭제와 독립적인 outbox에 provider ID를 같은 transaction으로 보존
    await db.$transaction(async (tx) => {
      // FK를 사용하는 새 이미지 등록과 경합해 정리 대상이 누락되지 않도록 사용자 행 잠금
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const assets = await tx.mediaAsset.findMany({
        where: { ownerId: userId, state: { not: "DELETED" } },
        select: { providerAssetId: true },
      });
      if (assets.length) {
        await enqueueModerationOutboxJobs(tx, [
          {
            dedupeKey: `withdraw:${userId}:images`,
            kind: "DELETE_IMAGE_ASSETS",
            payload: {
              providerAssetIds: assets.map((asset) => asset.providerAssetId),
            },
          },
        ]);
      }
      await tx.user.delete({ where: { id: userId } });
    });

    // 탈퇴 commit 이후 전달 실패는 계정 삭제 성공을 뒤집지 않고 기존 Cron에서 재시도
    await processModerationOutboxBatch().catch((error) => {
      console.error("[withdrawUser] image cleanup deferred:", error);
    });
    return { success: true };
  } catch (error) {
    console.error("withdrawUser service error:", error);
    return {
      success: false,
      error: "회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
