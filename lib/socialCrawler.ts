/**
 * File Name : lib/socialCrawler.ts
 * Description : 공유 미리보기 크롤러와 메타 이미지 라우트 판별 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.15  임도헌   Created   외부 공유 미리보기가 보호 라우트의 OG 메타를 읽을 수 있도록 판별 유틸 추가
 */

const SOCIAL_CRAWLER_USER_AGENT =
  /kakaotalk|kakaostory|kakaotalk-scrap|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|whatsapp|line\//i;

/**
 * 메신저/소셜 서비스의 링크 미리보기 크롤러 여부 판별
 * 로그인 보호 페이지 전체를 공개하지 않고, 공유 카드 생성에 필요한 요청만 별도 분기하기 위한 기준
 */
export function isSocialCrawlerUserAgent(userAgent?: string | null) {
  return !!userAgent && SOCIAL_CRAWLER_USER_AGENT.test(userAgent);
}

/**
 * Next.js file-based metadata 이미지 라우트의 인증 가드 예외 여부 판별
 * 빌드 결과에서는 `/opengraph-image-xxxxxx`처럼 해시가 붙을 수 있어 suffix까지 함께 허용
 */
export function isMetadataImagePath(pathname: string) {
  return /\/(?:opengraph-image|twitter-image)(?:-[a-z0-9]+)?(?:\.[a-z0-9]+)?$/i.test(
    pathname
  );
}

const SHAREABLE_DETAIL_PATH_PATTERN =
  /^\/(?:products\/view|posts|streams)\/\d+\/?$/;

const FIXED_OG_IMAGE_PATH_PATTERN =
  /^\/(?:products\/view|posts|streams)\/\d+\/og-image\/?$/;

/**
 * 공유 카드 메타에 직접 넣는 공개 OG 이미지 경로 판별
 * Next file-based metadata 라우트가 빌드 해시를 붙이는 경우가 있어, 공유 도메인은 별도 route handler로 고정 URL 제공
 */
export function isFixedOgImagePath(pathname: string) {
  return FIXED_OG_IMAGE_PATH_PATTERN.test(pathname);
}

/**
 * 현재 공유 미리보기를 허용할 상세 페이지 범위 판별
 * 실제 공유 진입점이 있는 제품/게시글/방송 상세에만 적용해 공개 범위를 좁게 유지
 */
export function isSharePreviewPath(pathname: string) {
  return SHAREABLE_DETAIL_PATH_PATTERN.test(pathname);
}
