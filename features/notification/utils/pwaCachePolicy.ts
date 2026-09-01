/**
 * File Name : features/notification/utils/pwaCachePolicy.ts
 * Description : 계정 데이터와 분리된 PWA 정적 자산 캐시 판정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   API·RSC·HTML을 제외하고 빌드·공용 이미지 자산만 캐시하도록 제한
 * 2026.08.30  임도헌   Modified  실제 문서 탐색만 offline fallback 대상으로 판정하는 함수 추가
 * 2026.09.01  임도헌   Modified  next-pwa에서 남은 개인화 runtime cache 정리 경계 추가
 */

const NEXT_STATIC_PREFIX = "/_next/static/";
const PUBLIC_IMAGE_PREFIX = "/images/";
const LEGACY_PWA_CACHE_NAMES = new Set([
  "apis",
  "cross-origin",
  "google-fonts-stylesheets",
  "google-fonts-webfonts",
  "next-data",
  "next-image",
  "others",
  "start-url",
  "static-font-assets",
  "static-image-assets",
  "static-js-assets",
  "static-style-assets",
]);

/**
 * next-pwa가 생성했던 Workbox precache와 runtime cache인지 판정한다.
 *
 * 현재 Serwist 및 BoardPort 캐시는 이름이 겹치지 않도록 정확한 구형 이름과
 * Workbox 접두사만 허용해, 서비스 워커 갱신 중 정상 캐시를 보존한다.
 */
export function isLegacyPwaCacheName(cacheName: string) {
  return (
    cacheName.startsWith("workbox-") || LEGACY_PWA_CACHE_NAMES.has(cacheName)
  );
}

/**
 * 사용자·세션과 무관한 동일 출처 정적 자산만 Service Worker runtime cache에 허용한다.
 */
export function isPwaStaticAssetPath(pathname: string) {
  return (
    pathname.startsWith(NEXT_STATIC_PREFIX) ||
    pathname.startsWith(PUBLIC_IMAGE_PREFIX)
  );
}

/**
 * 브라우저의 실제 문서 탐색 요청만 서비스 워커의 offline fallback 대상으로 판정한다.
 *
 * Next.js RSC·prefetch의 fetch 요청은 같은 페이지 URL을 사용해도 문서 탐색이
 * 아니므로 제외해, 전환 중 요청 취소가 서비스 워커 오류로 기록되지 않게 한다.
 */
export function isPwaDocumentNavigation(
  request: Pick<Request, "destination" | "mode">
) {
  return request.mode === "navigate" || request.destination === "document";
}
