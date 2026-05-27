/**
 * File Name : features/stream/utils/image.ts
 * Description : 스트리밍 썸네일/이미지 URL 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   Cloudflare 스트림 썸네일 URL 처리와 이미지 ID 파싱 유틸 분리
 * 2026.05.26  임도헌   Modified  이미 public variant가 붙은 Cloudflare Images URL 중복 정규화 방지
 */

/** Cloudflare Images 원본 URL 생성 */
export function buildStreamImageDeliveryUrl(
  accountHash: string,
  imageId: string
): string {
  return `https://imagedelivery.net/${accountHash}/${imageId}`;
}

/** 스트림 썸네일에 public variant를 붙여 브라우저 표시용 URL로 정규화 */
export function toStreamThumbnailPublicUrl(src?: string | null): string | null {
  if (!src) return null;
  if (!src.startsWith("https://imagedelivery.net")) return src;
  return src.endsWith("/public") ? src : `${src}/public`;
}

/** Cloudflare Images URL에서 이미지 자산 ID 추출 */
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
