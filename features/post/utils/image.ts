/**
 * File Name : features/post/utils/image.ts
 * Description : 게시글 이미지 URL 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   Cloudflare Images public variant 중복 방지
 */

const POST_IMAGE_PUBLIC_VARIANT = "/public";

/** 게시글 이미지의 브라우저 표시용 URL 정규화 */
export function toPostImagePublicUrl(src?: string | null): string | null {
  if (!src) return null;
  if (!src.startsWith("https://imagedelivery.net")) return src;
  return src.endsWith(POST_IMAGE_PUBLIC_VARIANT)
    ? src
    : `${src}${POST_IMAGE_PUBLIC_VARIANT}`;
}
