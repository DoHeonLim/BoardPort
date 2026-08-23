/**
 * File Name : features/media/utils/cloudflareImage.ts
 * Description : Cloudflare Images delivery URL 정규화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   계정 hash와 provider asset ID를 검증하는 공용 URL 경계 추가
 */

const DELIVERY_HOST = "imagedelivery.net";

export type CloudflareImageReference = {
  providerAssetId: string;
  deliveryUrl: string;
};

/** 현재 BoardPort 계정의 Cloudflare Images 원본 delivery URL만 허용한다. */
export function parseCloudflareImageReference(
  input: string
): CloudflareImageReference | null {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH?.trim();
  if (!accountHash) return null;

  try {
    const url = new URL(input);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname !== DELIVERY_HOST ||
      url.port ||
      url.username ||
      url.password ||
      segments.length < 2 ||
      segments[0] !== accountHash
    ) {
      return null;
    }

    const providerAssetId = segments[1];
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(providerAssetId)) return null;

    return {
      providerAssetId,
      deliveryUrl: `https://${DELIVERY_HOST}/${accountHash}/${providerAssetId}`,
    };
  } catch {
    return null;
  }
}

export function buildCloudflareImageDeliveryUrl(providerAssetId: string) {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH?.trim();
  if (!accountHash) throw new Error("Cloudflare Images account hash is missing");
  return `https://${DELIVERY_HOST}/${accountHash}/${providerAssetId}`;
}
