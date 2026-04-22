/**
 * File Name : app/sitemap.ts
 * Description : sitemap.xml 메타 라우트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.19  임도헌   Created   현재 공개 진입점 기준의 최소 운영형 sitemap 메타 라우트 추가
 */
import type { MetadataRoute } from "next";

const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

function resolveSiteUrl() {
  if (!rawAppUrl) return "http://localhost:3000";

  try {
    return new URL(rawAppUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
