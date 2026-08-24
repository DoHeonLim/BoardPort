/**
 * File Name : features/notification/utils/pwaCachePolicy.ts
 * Description : 계정 데이터와 분리된 PWA 정적 자산 캐시 판정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   API·RSC·HTML을 제외하고 빌드·공용 이미지 자산만 캐시하도록 제한
 */

const NEXT_STATIC_PREFIX = "/_next/static/";
const PUBLIC_IMAGE_PREFIX = "/images/";

/**
 * 사용자·세션과 무관한 동일 출처 정적 자산만 Service Worker runtime cache에 허용한다.
 */
export function isPwaStaticAssetPath(pathname: string) {
  return (
    pathname.startsWith(NEXT_STATIC_PREFIX) ||
    pathname.startsWith(PUBLIC_IMAGE_PREFIX)
  );
}
