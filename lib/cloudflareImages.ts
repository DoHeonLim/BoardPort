/**
 * File Name : lib/cloudflareImages.ts
 * Description : Cloudflare 이미지 업로드용 URL 요청 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.12  임도헌   Created
 * 2025.06.12  임도헌   Modified  Cloudflare 이미지 업로드용 URL 요청 함수를 lib로 옮김
 * 2025.08.22  임도헌   Modified  DirectUploadURLResult 타입 도입 및 응답 표준화, 검증 로직 추가
 * 2026.01.16  임도헌   Renamed   lib/cloudflare/getUploadUrl -> lib/cloudflareImages.ts
 * 2026.06.27  임도헌   Modified  이미지 direct upload URL 발급 전 세션/사용자 상태 가드 추가
 * 2026.08.22  임도헌   Modified  발급 이미지 ID를 사용자·용도별 MediaAsset에 선등록
 */
"use server";

import getSession from "@/lib/session";
import db from "@/lib/db";
import { validateUserStatus } from "@/features/user/service/admin";
import {
  deleteCloudflareImageAssetsById,
  isMediaAssetPurpose,
  type MediaAssetPurposeValue,
} from "@/features/media/service/assets";
import { buildCloudflareImageDeliveryUrl } from "@/features/media/utils/cloudflareImage";

type DirectUploadURLResult =
  | {
      success: true;
      result: { uploadURL: string; id: string; deliveryUrl: string };
    }
  | { success: false; error: string };

/**
 * Cloudflare Images direct upload URL을 발급
 *
 * 로그인 세션과 사용자 상태를 확인한 뒤 Cloudflare API를 호출하고,
 * 클라이언트에는 Cloudflare API token 대신 direct upload URL만 반환
 *
 * @returns {Promise<DirectUploadURLResult>} 업로드 URL 발급 결과
 */
export async function getUploadUrl(
  purpose: MediaAssetPurposeValue
): Promise<DirectUploadURLResult> {
  try {
    if (!isMediaAssetPurpose(purpose)) {
      return { success: false, error: "올바르지 않은 이미지 업로드 용도입니다." };
    }
    const session = await getSession();
    if (!session?.id) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
      };
    }

    const userStatus = await validateUserStatus(session.id);
    if (!userStatus.success) {
      return {
        success: false,
        error: userStatus.error,
      };
    }

    const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
    const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
    const ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

    if (!ACCOUNT_ID || !API_TOKEN || !ACCOUNT_HASH) {
      return {
        success: false,
        error: "Cloudflare 환경변수가 설정되지 않았습니다.",
      };
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const requestBody = new FormData();
    requestBody.set("expiry", expiresAt.toISOString());
    requestBody.set(
      "metadata",
      JSON.stringify({ ownerId: session.id, purpose, source: "boardport" })
    );

    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: requestBody,
      }
    );

    const json = await resp.json();

    // 방어적 검증: 응답 포맷에 덜 의존하도록 최소 필드만 체크
    const ok =
      resp.ok &&
      json &&
      json.result &&
      typeof json.result.uploadURL === "string" &&
      typeof json.result.id === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(json.result.id);

    if (!ok) {
      // 필요시 아래 로그를 임시로 열어 디버그
      // console.error("[getUploadUrl] Unexpected response:", json);
      return { success: false, error: "Cloudflare 업로드 URL 요청 실패" };
    }

    const deliveryUrl = buildCloudflareImageDeliveryUrl(json.result.id);
    try {
      await db.mediaAsset.create({
        data: {
          providerAssetId: json.result.id,
          deliveryUrl,
          purpose,
          expires_at: expiresAt,
          ownerId: session.id,
        },
      });
    } catch (error) {
      // MediaAsset 소유권 기록 없이 Cloudflare draft만 남지 않도록 즉시 정리한다.
      await deleteCloudflareImageAssetsById([json.result.id]);
      throw error;
    }

    return {
      success: true,
      result: { uploadURL: json.result.uploadURL, id: json.result.id, deliveryUrl },
    };
  } catch (e) {
    console.error("[getUploadUrl] Error:", e);
    return { success: false, error: "업로드 URL 생성 중 오류가 발생했습니다." };
  }
}
