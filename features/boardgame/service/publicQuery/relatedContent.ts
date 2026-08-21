/**
 * File Name : features/boardgame/service/publicQuery/relatedContent.ts
 * Description : 보드게임 상세 연결 콘텐츠 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   보드게임 상세에서 연결된 상품/게시글/방송을 역방향 조회하도록 추가
 * 2026.05.03  임도헌   Modified  관련 상품 썸네일에 Cloudflare Images public variant 정규화 적용
 * 2026.05.05  임도헌   Modified  상품/게시글/방송 역방향 연결 콘텐츠 조회 분리
 * 2026.06.19  임도헌   Modified  종료 방송 관련 콘텐츠가 ready VOD 상세로 이동하도록 최신 VOD id 포함
 * 2026.08.21  임도헌   Modified  공개 관련 방송의 저장된 Cloudflare 썸네일을 signed token URL로 변환
 */

import "server-only";
import db from "@/lib/db";
import { toProductImagePublicUrl } from "@/features/product/utils/image";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameRelatedContent } from "@/features/boardgame/types/public";
import { resolveStreamThumbnailUrl } from "@/features/stream/service/playback";

function getRelatedBroadcastThumbnail(broadcast: {
  thumbnail: string | null;
  liveInput: { provider_uid: string };
  vodAssets: Array<{
    provider_asset_id: string;
    thumbnail_url: string | null;
  }>;
}) {
  const vod = broadcast.vodAssets[0];

  try {
    return resolveStreamThumbnailUrl(
      vod?.thumbnail_url ?? broadcast.thumbnail,
      vod?.provider_asset_id ?? broadcast.liveInput.provider_uid
    );
  } catch (error) {
    console.warn("[BoardGameRelated] signed thumbnail unavailable:", error);
    return null;
  }
}

/**
 * 보드게임 상세 연결 콘텐츠 조회
 * 상품/게시글/방송 작성 흐름에서 저장된 join table 기준 역방향 조회
 *
 * @param boardGameId - BoardPort 내부 보드게임 ID
 * @returns {Promise<ServiceResult<BoardGameRelatedContent>>} 연결된 상품/게시글/방송 요약
 */
export async function getBoardGameRelatedContent(
  boardGameId: number
): Promise<ServiceResult<BoardGameRelatedContent>> {
  try {
    const [productLinks, postLinks, broadcastLinks] = await Promise.all([
      db.productBoardGame.findMany({
        where: {
          boardGameId,
          // 숨김 처리된 판매 완료 상품은 공개 카탈로그의 관련 콘텐츠에서 제외
          product: { hidden_at: null },
        },
        select: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: {
                select: { url: true },
                orderBy: { order: "asc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 4,
      }),
      db.postBoardGame.findMany({
        where: { boardGameId },
        select: {
          post: {
            select: {
              id: true,
              title: true,
              category: true,
              created_at: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 4,
      }),
      db.streamBoardGame.findMany({
        where: {
          boardGameId,
          // 비공개/팔로워 방송은 보드게임 공개 상세의 역방향 콘텐츠에서 제외
          broadcast: {
            visibility: "PUBLIC",
          },
        },
        select: {
          broadcast: {
            select: {
              id: true,
              title: true,
              status: true,
              thumbnail: true,
              started_at: true,
              liveInput: { select: { provider_uid: true } },
              vodAssets: {
                where: { ready_at: { not: null } },
                select: {
                  id: true,
                  provider_asset_id: true,
                  thumbnail_url: true,
                },
                orderBy: { ready_at: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 4,
      }),
    ]);

    return {
      success: true,
      data: {
        products: productLinks.map(({ product }) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          imageUrl: toProductImagePublicUrl(product.images[0]?.url) ?? null,
        })),
        posts: postLinks.map(({ post }) => ({
          id: post.id,
          title: post.title,
          category: post.category,
          createdAt: post.created_at,
        })),
        broadcasts: broadcastLinks.map(({ broadcast }) => ({
          id: broadcast.id,
          title: broadcast.title,
          status: broadcast.status,
          vodIdForRecording: broadcast.vodAssets[0]?.id ?? null,
          thumbnail: getRelatedBroadcastThumbnail(broadcast),
          startedAt: broadcast.started_at,
        })),
      },
    };
  } catch (error) {
    console.error("[BoardGame Related Content Error]", error);
    return {
      success: false,
      error: "보드게임과 연결된 콘텐츠를 불러오지 못했습니다.",
    };
  }
}
