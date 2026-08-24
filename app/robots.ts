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
 * 2026.08.23  임도헌   Modified  공용 trusted origin 검증을 사용하고 로컬 host 노출 제외 유지
 */
import type { MetadataRoute } from "next";
import { getTrustedAppBaseUrl } from "@/lib/env";

/** 운영 앱 URL을 검증해 robots.txt에 사용할 origin을 결정한다. */
function resolveRobotsHost() {
  const url = new URL(getTrustedAppBaseUrl());
  return url.hostname === "localhost" || url.hostname === "127.0.0.1"
    ? undefined
    : url.origin;
}

/** 검색 로봇 허용 범위와 sitemap 위치를 반환한다. */
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
