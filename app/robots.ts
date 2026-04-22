/**
 * File Name : app/robots.ts
 * Description : robots.txt 메타 라우트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.12  임도헌   Created   Lighthouse robots.txt invalid 이슈 대응용 기본 robots 메타 라우트 추가
 * 2026.04.19  임도헌   Modified  운영 URL에서만 host를 노출하고 내부 경로 크롤링 제외 규칙을 보강
 * 2026.04.19  임도헌   Modified  sitemap 메타 라우트와 연결해 검색엔진 힌트를 보강
 */
import type { MetadataRoute } from "next";

const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

function resolveRobotsHost() {
  if (!rawAppUrl) return undefined;

  try {
    const url = new URL(rawAppUrl);
    return url.hostname === "localhost" ? undefined : url.origin;
  } catch {
    return undefined;
  }
}

export default function robots(): MetadataRoute.Robots {
  const host = resolveRobotsHost();
  const sitemap = host ? `${host}/sitemap.xml` : undefined;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 인증/운영/내부 엔드포인트 공개 색인 대상 제외
        disallow: ["/admin/", "/api/", "/chats/", "/onboarding/", "/offline"],
      },
    ],
    ...(sitemap ? { sitemap } : {}),
    ...(host ? { host } : {}),
  };
}
