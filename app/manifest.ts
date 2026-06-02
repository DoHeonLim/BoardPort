import { MetadataRoute } from "next";

/**
 * File Name : app/manifest.ts
 * Description : BoardPort PWA manifest metadata
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.30  임도헌   Modified  설치형 PWA 기본 배경과 theme color를 다크 앱 배경 기준으로 정리
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "보드포트",
    short_name: "보드포트",
    description: "보드게임과 TRPG 중고거래 및 커뮤니티 플랫폼",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    id: "/",
    scope: "/",
    categories: ["games", "shopping"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/images/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
