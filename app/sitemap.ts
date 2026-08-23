/**
 * File Name : app/sitemap.ts
 * Description : sitemap.xml 메타 라우트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.19  임도헌   Created   현재 공개 진입점 기준의 최소 운영형 sitemap 메타 라우트 추가
 * 2026.08.23  임도헌   Modified  sitemap origin을 공용 trusted origin 검증으로 통합
 */
import type { MetadataRoute } from "next";
import { getTrustedAppBaseUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getTrustedAppBaseUrl();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
