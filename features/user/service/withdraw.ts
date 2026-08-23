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
 */

import "server-only";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import { hardDeletePostWithCleanup } from "@/features/post/service/post";
import { hardDeleteProductWithCleanup } from "@/features/product/service/delete";
import { hardDeleteBroadcastWithCleanup } from "@/features/stream/service/delete";
import { deleteCloudflareStreamAsset } from "@/features/post/service/video";
import { deleteCloudflareLiveInputAsset } from "@/features/stream/service/liveInput";
import { deleteCloudflareImageAssetsById } from "@/features/media/service/assets";

/**
 * 회원 탈퇴 처리
 * - 유저 데이터를 물리적으로 삭제 (Hard Delete)
 * - 게시글/상품/방송은 도메인별 cleanup helper를 먼저 실행해 외부 자산과 태그 정산까지 반영
 * - 마지막에 user.delete를 호출해 남은 종속 데이터는 Cascade 규칙으로 정리
 *
 * @param userId - 탈퇴할 유저 ID
 */
export async function withdrawUser(userId: number): Promise<ServiceResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        media_assets: { select: { providerAssetId: true } },
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
            vodAssets: { select: { provider_asset_id: true } },
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
        deleteCloudflareStreamAsset(video.providerAssetId ?? video.uploadUid ?? "")
      )
    );

    await deleteCloudflareImageAssetsById(
      user.media_assets.map((asset) => asset.providerAssetId)
    );

    if (user.live_inputs?.provider_uid) {
      await deleteCloudflareLiveInputAsset(user.live_inputs.provider_uid);
    }

    await db.user.delete({
      where: { id: userId },
    });
    return { success: true };
  } catch (error) {
    console.error("withdrawUser service error:", error);
    return {
      success: false,
      error:
        "회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
