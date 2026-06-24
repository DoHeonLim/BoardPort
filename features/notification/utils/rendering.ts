/**
 * File Name : features/notification/utils/rendering.ts
 * Description : 알림 목록 렌더링 전용 fallback 판단 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   알림 이미지와 삭제 콘텐츠 안내 표시 규칙 분리
 */

const CONTENT_LINKED_NOTIFICATION_TYPES = new Set([
  "TRADE",
  "CHAT",
  "STREAM",
  "KEYWORD",
]);

const NOTIFICATION_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "cf.geekdo-images.com",
  "imagedelivery.net",
  "w7.pngwing.com",
  "i.ytimg.com",
  "customer-fllme7un34f7981k.cloudflarestream.com",
  "videodelivery.net",
]);

/**
 * 알림 목록에서 안전하게 렌더링할 수 있는 이미지 출처인지 검사합니다.
 */
export function isRenderableNotificationImage(src?: string | null) {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:")) return true;

  try {
    const parsed = new URL(src);
    return (
      parsed.protocol === "https:" &&
      NOTIFICATION_IMAGE_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * 링크가 사라진 콘텐츠형 알림에 이동 불가 안내를 보여줄지 판단합니다.
 */
export function shouldShowUnavailableNotificationCopy({
  link,
  type,
}: {
  link?: string | null;
  type: string;
}) {
  return !link && CONTENT_LINKED_NOTIFICATION_TYPES.has(type);
}
