/**
 * File Name : features/product/utils/image.ts
 * Description : 제품 이미지 URL 및 Cloudflare Images 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   제품 이미지 public variant 처리 및 Cloudflare imageId 추출 유틸 분리
 * 2026.05.25  임도헌   Modified  Cloudflare Images가 아닌 URL은 썸네일 렌더링 대상에서 제외
 */

const PRODUCT_IMAGE_PUBLIC_VARIANT = "/public";

/**
 * 제품 이미지 URL에 public variant를 붙여 썸네일/알림용 주소로 정규화
 *
 * @param {string | null | undefined} url - 원본 Cloudflare Images URL
 * @returns {string | undefined} `/public` variant가 붙은 URL
 */
export function toProductImagePublicUrl(
  url?: string | null
): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "imagedelivery.net") return undefined;
  } catch {
    return undefined;
  }

  return url.endsWith(PRODUCT_IMAGE_PUBLIC_VARIANT)
    ? url
    : `${url}${PRODUCT_IMAGE_PUBLIC_VARIANT}`;
}

/**
 * public variant가 붙은 제품 이미지 URL을 원본 주소로 복원
 *
 * @param {string} url - `/public` variant가 포함될 수 있는 URL
 * @returns {string} 원본 Cloudflare Images URL
 */
export function stripProductImagePublicVariant(url: string): string {
  return url.endsWith(PRODUCT_IMAGE_PUBLIC_VARIANT)
    ? url.slice(0, -PRODUCT_IMAGE_PUBLIC_VARIANT.length)
    : url;
}

/**
 * Cloudflare Images delivery URL에서 이미지 ID 추출
 *
 * @param {string} url - `imagedelivery.net` 형식의 이미지 URL
 * @returns {string | null} 추출된 이미지 ID
 */
export function extractCloudflareImageId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "imagedelivery.net") return null;

    const [, imageId] = parsed.pathname.split("/").filter(Boolean);
    return imageId || null;
  } catch {
    return null;
  }
}
